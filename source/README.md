# Source and development

The editable app, vendored runtime dependencies, builder, and development tools live in this folder. The ready-to-use app is [`../OpenReview-standalone.html`](../OpenReview-standalone.html); see the [English](../README.md) or [Chinese](../README.zh-CN.md) usage guide.

## Edit the source version

Open [`index.html`](index.html) in a browser while keeping this folder intact. It loads `app.js`, `style.css`, `mathjax-config.js`, and `vendor/` alongside it. For browser features that need localhost, run this command from the repository root and open <http://localhost:8765>:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory source
```

## Build the single-file app

From the repository root, use Python 3.9+:

```sh
python3 source/build_standalone.py
```

The builder reads this folder, the root `LICENSE`, and [`docs/examples/rebuttal.md`](../docs/examples/rebuttal.md). It writes `OpenReview-standalone.html` to the repository root, embedding the runtime libraries, fonts, licenses, and build script. It works independently of the current working directory.

## Check changes and refresh screenshots

From the repository root, install the development tools using Node.js 20+:

```sh
cd source
npm ci

# If Google Chrome is not installed, install Chromium for browser checks.
npx playwright-core install chromium

# Rebuild the root HTML, check offline behavior, and refresh README images.
npm run build
npm test
npm run screenshots
```

The browser scripts use installed Chrome on macOS, or Playwright's Chromium. Set `CHROME_PATH` to use a different Chrome/Chromium executable. Screenshots are written to [`docs/images/`](../docs/images/).

The checks open the standalone HTML by itself in a temporary folder with the browser offline. They cover math rendering and embedded fonts, source/standalone consistency, Markdown import and export, draft restoration, view switching, mobile layout, and unexpected external requests or JavaScript errors.

The GitHub Actions workflow is **manual only**: open **Actions → Offline preview checks → Run workflow** to run it on GitHub.

## Source layout

```text
index.html                 Editable app page
app.js / style.css         Editor behavior and appearance
mathjax-config.js          OpenReview-style math configuration
vendor/                    Pinned runtime libraries, fonts and licenses
build_standalone.py        Reproducible builder → ../OpenReview-standalone.html
package.json               Development commands and dependencies
scripts/                   Browser helper and screenshot generator
tests/                     Offline browser checks
```

Rendering configuration and styling adapt OpenReview's web frontend under [AGPL-3.0-only](../LICENSE). See [third-party notices](../docs/THIRD_PARTY_NOTICES.md) for dependency licenses and attribution.
