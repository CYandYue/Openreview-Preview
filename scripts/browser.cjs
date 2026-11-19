// SPDX-License-Identifier: AGPL-3.0-only
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');

async function launch() {
  const options = { headless: true };
  const localChrome = process.env.CHROME_PATH || (process.platform === 'darwin'
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : null);
  if (localChrome && fs.existsSync(localChrome)) options.executablePath = localChrome;
  return chromium.launch(options);
}

async function ready(page) {
  await page.waitForFunction(() => document.getElementById('render-status')?.dataset.state === 'ready', null, { timeout: 20000 });
  await page.evaluate(() => document.fonts.ready);
}

module.exports = { launch, ready };
