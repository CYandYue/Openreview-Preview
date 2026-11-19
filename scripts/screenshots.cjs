// SPDX-License-Identifier: AGPL-3.0-only
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const { launch, ready } = require('./browser.cjs');

(async () => {
  const root = path.resolve(__dirname, '..');
  const output = path.join(root, 'docs/images');
  await fs.mkdir(output, { recursive: true });
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, deviceScaleFactor: 1.5 });
    await context.setOffline(true);
    const page = await context.newPage();
    await page.goto(pathToFileURL(path.join(root, 'OpenReview-standalone.html')).href);
    await ready(page);
    await page.screenshot({ path: path.join(output, 'split-view.png'), fullPage: true });
    await page.locator('[data-view="preview"][type="button"]').click();
    await ready(page);
    await page.setViewportSize({ width: 1100, height: 1120 });
    await ready(page);
    await page.screenshot({ path: path.join(output, 'preview.png'), fullPage: true });
    console.log('Saved screenshots to docs/images.');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
