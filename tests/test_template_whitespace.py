from template_whitespace import normalize_document_indent


def test_stylesheets_and_scripts_follow_metadata():
    html = """<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <link rel="stylesheet" href="main.css">
    <script src="bundle.js"></script>
    <link rel="canonical" href="https://example.com/">
    <meta name="description" content="Portal">
    <style>:root{--md-text-font:"IBM Plex Sans"}</style>
    <!-- Cloudflare Web Analytics -->
    <script src="beacon.js"></script>
    <!-- End Cloudflare Web Analytics -->
  </head>
  <body></body>
</html>
"""
    result = normalize_document_indent(html)
    head = result.split("<head>", 1)[1].split("</head>", 1)[0]
    positions = [
        head.index('<meta charset="utf-8">'),
        head.index('<link rel="canonical"'),
        head.index('<meta name="description"'),
        head.index('href="main.css"'),
        head.index("<style>"),
        head.index('src="bundle.js"'),
        head.index("Cloudflare Web Analytics"),
        head.index('src="beacon.js"'),
        head.index("End Cloudflare Web Analytics"),
    ]
    assert positions == sorted(positions)
    assert 'utf-8">\n\n    <link rel="canonical"' in result
    assert '\n\n    <link rel="stylesheet" href="main.css">' in result
    assert "</style>\n\n    <script" in result


def test_open_graph_meta_tags_are_separated_from_twitter():
    html = """<!doctype html>
<html lang="en">
  <head>
    <meta name="theme-color" content="#203959">
    <meta property="og:type" content="website">
    <meta property="og:title" content="Portal">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="Portal">
  </head>
  <body></body>
</html>
"""
    result = normalize_document_indent(html)
    assert 'content="#203959">\n\n    <meta property="og:type"' in result
    assert 'content="Portal">\n\n    <meta name="twitter:card"' in result
    assert 'property="og:title" content="Portal">\n    <meta name="twitter:card"' not in result


def test_generator_meta_is_removed():
    html = """<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="generator" content="mkdocs-1.6.1, mkdocs-material-9.7.7">
    <title>Portal</title>
  </head>
  <body></body>
</html>
"""
    result = normalize_document_indent(html)
    assert 'name="generator"' not in result
    assert '<meta charset="utf-8">' in result
    assert "<title>Portal</title>" in result


def test_html_children_and_head_use_two_space_indent():
    html = """<!doctype html>
<html lang="en">
  <head>
      <meta charset="utf-8">
        <title>Portal</title>
<script>var ready = true;</script>

  <link
    href="https://example.com/font.css"
    rel="stylesheet"
  />
  </head>
    <body>
      <p>Hi</p>
  </body>
</html>
"""
    result = normalize_document_indent(html)
    assert (
        result
        == """<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">

    <title>Portal</title>

    <link href="https://example.com/font.css" rel="stylesheet">

    <script>var ready = true;</script>
  </head>
  <body>
    <p>Hi</p>
  </body>
</html>
"""
    )


def test_code_blocks_keep_their_text():
    html = """<!doctype html>
<html><body><pre><code>keep
  indent
</code></pre></body></html>
"""
    result = normalize_document_indent(html)
    assert "<code>keep\n  indent\n</code>" in result


def test_nested_markup_indents_two_spaces_per_level():
    html = """<!doctype html>
<html>
<body>
<div class="card"><p>Hello <em>there</em></p>
<a href="/projects"><img src="logo.png" alt="Logo"></a></div>
</body></html>
"""
    result = normalize_document_indent(html)
    assert (
        result
        == """<!doctype html>
<html>
  <body>
    <div class="card">
      <p>
        Hello
        <em>there</em>
      </p>
      <a href="/projects"><img src="logo.png" alt="Logo"></a>
    </div>
  </body>
</html>
"""
    )


def test_textarea_closing_tag_does_not_add_a_blank_line():
    html = """<!doctype html>
<html><body><textarea class="tool-input">hello
world</textarea></body></html>
"""
    result = normalize_document_indent(html)
    assert "hello\nworld</textarea>" in result
    assert "</textarea>\n" in result
    assert "\nworld\n" not in result
