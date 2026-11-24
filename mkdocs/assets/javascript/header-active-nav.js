/**
 * Keep the custom header navigation active state synchronised with
 * MkDocs Material instant navigation.
 *
 * Home is exact-match only so the site root does not light up on every
 * nested page. Other header items use every descendant URL in
 * data-nav-prefixes. A dropdown item is highlighted only when its own
 * page is current, so the section index leaves the menu unmarked.
 *
 * Header hrefs are page-relative. Instant navigation keeps the header and
 * changes the document URL, so resolving those hrefs again would point at
 * the wrong place. Snapshot each link's paths on first paint.
 */

(() => {
  "use strict";

  const { onPageRender } = window.LupaxaPageLifecycle;

  /**
   * @param {string} value
   * @param {string} base
   * @returns {string}
   */
  const normalisePath = (value, base) => {
    const url = new URL(value, base);

    const path = url.pathname
      .replace(/\/index\.html$/, "/")
      .replace(/\/+$/, "");

    return path || "/";
  };

  /**
   * Resolve and store paths from the header as first rendered.
   *
   * @param {HTMLAnchorElement} link
   */
  const snapshotLink = (link) => {
    if (link.dataset.navResolved === "true") {
      return;
    }

    const base = document.baseURI;

    link.dataset.resolvedPath = normalisePath(
      link.getAttribute("href") || link.href,
      base,
    );

    const raw = link.getAttribute("data-nav-prefixes") || "";
    const prefixes = raw
      .split(/\s+/)
      .filter(Boolean)
      .map((prefix) => normalisePath(prefix, base));

    link.dataset.resolvedPrefixes = (
      prefixes.length ? prefixes : [link.dataset.resolvedPath]
    ).join(" ");
    link.dataset.navResolved = "true";
  };

  /**
   * @param {string} currentPath
   * @param {string} prefix
   * @returns {boolean}
   */
  const pathMatches = (currentPath, prefix) =>
    currentPath === prefix || currentPath.startsWith(`${prefix}/`);

  const updateActiveNavigation = () => {
    const currentPath = normalisePath(
      window.location.href,
      window.location.href,
    );
    const links = Array.from(
      document.querySelectorAll(".lupaxa-header__nav-link"),
    );

    if (!links.length) {
      return;
    }

    links.forEach(snapshotLink);

    // Home is the first top-level item (site convention).
    const homePath = links[0].dataset.resolvedPath;

    links.forEach((link) => {
      const item = link.closest(".lupaxa-header__nav-item");

      if (!item) {
        return;
      }

      const linkPath = link.dataset.resolvedPath;
      const isHome = linkPath === homePath;
      const prefixes = (link.dataset.resolvedPrefixes || "")
        .split(/\s+/)
        .filter(Boolean);
      const isActive = isHome
        ? currentPath === linkPath
        : prefixes.some((prefix) => pathMatches(currentPath, prefix));

      item.classList.toggle(
        "lupaxa-header__nav-item--active",
        isActive,
      );

      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    document.querySelectorAll(".lupaxa-header__menu-link").forEach((link) => {
      snapshotLink(link);

      const isActive = link.dataset.resolvedPath === currentPath;

      link.classList.toggle("lupaxa-header__menu-link--active", isActive);

      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  const scheduleUpdate = () => {
    requestAnimationFrame(updateActiveNavigation);
  };

  onPageRender(updateActiveNavigation);
  window.addEventListener("popstate", scheduleUpdate);

  /**
   * Instant navigation keeps the header, so a clicked menu stays open
   * under the pointer and under focus. Dismiss it until the pointer leaves.
   */
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const link = event.target.closest(".lupaxa-header__nav-item--menu a");

    if (!link) {
      return;
    }

    document.documentElement.classList.add("lupaxa-header-menu-dismissed");

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });

  document.addEventListener("pointermove", (event) => {
    if (
      !document.documentElement.classList.contains(
        "lupaxa-header-menu-dismissed",
      )
    ) {
      return;
    }

    if (!(event.target instanceof Element)) {
      return;
    }

    if (!event.target.closest(".lupaxa-header__nav-item--menu")) {
      document.documentElement.classList.remove(
        "lupaxa-header-menu-dismissed",
      );
    }
  });

  let pointerFocus = false;

  document.addEventListener("pointerdown", () => {
    pointerFocus = true;
  });

  document.addEventListener("keydown", () => {
    pointerFocus = false;
  });

  document.addEventListener("focusin", (event) => {
    if (
      pointerFocus ||
      !document.documentElement.classList.contains(
        "lupaxa-header-menu-dismissed",
      )
    ) {
      return;
    }

    if (
      event.target instanceof Element &&
      event.target.closest(".lupaxa-header__nav-item--menu")
    ) {
      document.documentElement.classList.remove(
        "lupaxa-header-menu-dismissed",
      );
    }
  });
})();
