#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-only
"""Bundle the preview, MathJax extensions, fonts and licenses into one HTML."""

from base64 import b64encode
from html import escape
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / 'OpenReview-standalone.html'

SHARING_DEMO = (ROOT / 'examples/rebuttal.md').read_text(encoding='utf-8')


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding='utf-8')


def script_tag(source: str, label: str) -> str:
    # An HTML parser closes scripts even when the terminator is in a JS string.
    source = re.sub(r'</script', r'<\\/script', source, flags=re.IGNORECASE)
    source = re.sub(r'^//# sourceMappingURL=.*$', '', source, flags=re.MULTILINE)
    return f'<script data-bundled-source="{escape(label, quote=True)}">\n{source}\n</script>'


def bundle_mathjax() -> str:
    core = read('vendor/mathjax/tex-chtml-full.js')
    font_directory = ROOT / 'vendor/mathjax/output/chtml/fonts/woff-v2'
    font_names = set(re.findall(r'%%URL%%/(MathJax_[\w-]+\.woff)', core))
    if not font_names:
        raise ValueError('MathJax font references not found; check the bundle version.')
    for name in sorted(font_names):
        data = b64encode((font_directory / name).read_bytes()).decode('ascii')
        core = core.replace(f'%%URL%%/{name}', f'data:font/woff;base64,{data}')
    if re.search(r'%%URL%%/[^"\s]+\.woff', core):
        raise ValueError('Some MathJax font references were not embedded.')

    # Execute safe in the SAME script as core, before the startup promise runs.
    # This registers its handler without a separate script URL or network load.
    return '\n;\n'.join([
        core,
        read('vendor/mathjax/ui/safe.js'),
        "MathJax.loader.preLoad('ui/safe');",
    ])


def sharing_app() -> str:
    app = read('app.js')
    app, count = re.subn(
        r'const demo = String\.raw`.*?`;',
        lambda _: f'const demo = String.raw`{SHARING_DEMO}`;',
        app,
        count=1,
        flags=re.DOTALL,
    )
    if count != 1:
        raise ValueError('Example document not found in app.js.')
    # Keep the shared tool's browser draft separate from the working version.
    app = app.replace('openreview-public-source-draft-v1', 'openreview-standalone-draft-v1')
    app = app.replace(
        'MathJax could not load. Check that the vendor folder is present.',
        'The math engine could not load. Try reopening this file.',
    )
    return app


def license_details() -> str:
    licenses = [
        ('OpenReview Local Preview / OpenReview adaptations · AGPL-3.0', 'LICENSE'),
        ('Marked · MIT', 'vendor/marked-LICENSE.md'),
        ('DOMPurify · Apache-2.0 / MPL-2.0', 'vendor/purify-LICENSE'),
        ('MathJax · Apache-2.0', 'vendor/mathjax/LICENSE'),
    ]
    details = [
        '<details class="help"><summary>Open-source licenses</summary>',
        '<p>OpenReview Local Preview by CYandYue. Rendering configuration adapted '
        'from the OpenReview web frontend. This is an independent tool. '
        'Dependencies and their licenses are embedded below.</p>',
    ]
    for title, relative in licenses:
        details.append(
            f'<details><summary>{escape(title)}</summary>'
            f'<pre>{escape(read(relative))}</pre></details>'
        )
    # Include the reproducible build source with the distributed file.
    details.append(
        '<details><summary>Standalone build source · build_standalone.py</summary>'
        f'<pre>{escape(Path(__file__).read_text(encoding="utf-8"))}</pre></details>'
    )
    details.append('</details>')
    return '\n'.join(details)


def build() -> None:
    html = read('index.html')
    stylesheet = read('style.css')
    if '</style' in stylesheet.lower():
        raise ValueError('Unexpected closing style tag in stylesheet.')
    html, count = re.subn(
        r'<link rel="stylesheet" href="style\.css">',
        lambda _: f'<style>\n{stylesheet}\n</style>',
        html,
    )
    if count != 1:
        raise ValueError('Expected a single local stylesheet.')

    script_paths = re.findall(r'<script(?: defer)? src="([^"]+)"></script>', html)
    expected = ['mathjax-config.js', 'vendor/marked.umd.js', 'vendor/purify.min.js',
                'vendor/mathjax/tex-chtml-full.js', 'app.js']
    if script_paths != expected:
        raise ValueError(f'Unexpected script list: {script_paths!r}')
    html = re.sub(r'  <script(?: defer)? src="[^"]+"></script>\n', '', html)

    config = read('mathjax-config.js')
    original_loader = "loader: { load: ['ui/safe'] }"
    if original_loader not in config:
        raise ValueError('Expected the OpenReview MathJax loader configuration.')
    config = config.replace(original_loader, 'loader: { load: [] }')
    config = config.replace('assets are served locally.', 'safe and fonts are embedded.')
    scripts = [
        script_tag(config, 'mathjax-config.js'),
        script_tag(read('vendor/marked.umd.js'), 'vendor/marked.umd.js'),
        script_tag(read('vendor/purify.min.js'), 'vendor/purify.min.js'),
        script_tag(bundle_mathjax(), 'MathJax core + safe + embedded fonts'),
        script_tag(sharing_app(), 'app.js (sharing example)'),
    ]

    html = html.replace('<title>OpenReview Local Preview</title>',
                        '<title>OpenReview Local Preview · Single file</title>')
    html = html.replace('Write your rebuttal. Check the formatting. Keep your draft local.',
                        'One HTML file. Offline Markdown + LaTeX. Ready for your rebuttal.')
    html = html.replace('</main>', license_details() + '\n  </main>')
    html = html.replace('</body>', '\n' + '\n'.join(scripts) + '\n</body>')
    html = html.replace('<!doctype html>',
                        '<!doctype html>\n<!-- Generated by build_standalone.py. -->', 1)
    OUTPUT.write_text(html, encoding='utf-8')
    print(f'Generated {OUTPUT.name} ({OUTPUT.stat().st_size / 1024 / 1024:.2f} MiB)')


if __name__ == '__main__':
    build()
