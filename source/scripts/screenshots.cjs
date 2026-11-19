// SPDX-License-Identifier: AGPL-3.0-only
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const { launch, ready } = require('./browser.cjs');

(async () => {
  const root = path.resolve(__dirname, '../..');
  const output = path.join(root, 'docs/images');
  await fs.mkdir(output, { recursive: true });
  const browser = await launch();
  try {
    const shots = [
      { filename: 'split-view.png', view: 'split', viewport: { width: 1440, height: 1080 } },
      { filename: 'preview.png', view: 'preview', viewport: { width: 1100, height: 1120 } },
    ];
    for (const { filename, view, viewport } of shots) {
      // Start at the final viewport size to avoid capture artifacts after resizing.
      const context = await browser.newContext({ viewport, deviceScaleFactor: 1.5 });
      try {
        await context.setOffline(true);
        const page = await context.newPage();
        await page.goto(pathToFileURL(path.join(root, 'OpenReview-standalone.html')).href);
        await ready(page);
        await page.locator(`[data-view="${view}"][type="button"]`).click();
        await ready(page);
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await page.screenshot({ path: path.join(output, filename), fullPage: true });
      } finally {
        await context.close();
      }
    }
    console.log('Saved screenshots to docs/images.');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
