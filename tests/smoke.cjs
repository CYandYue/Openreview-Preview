// SPDX-License-Identifier: AGPL-3.0-only
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { launch, ready } = require('../scripts/browser.cjs');

(async () => {
  const root = path.resolve(__dirname, '..');
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'openreview-preview-test-'));
  const isolatedFile = path.join(directory, 'shared-preview.html');
  await fs.copyFile(path.join(root, 'OpenReview-standalone.html'), isolatedFile);
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.setOffline(true);
    const page = await context.newPage();
    const errors = [];
    const dependencies = [];
    const url = pathToFileURL(isolatedFile).href;
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      if (request.url() !== url && !request.url().startsWith('data:')) dependencies.push(request.url());
    });
    await page.goto(url);
    await ready(page);
    assert.equal(await page.locator('#preview h3').count(), 3);
    assert.equal(await page.locator('#preview table').count(), 1);
    assert.equal(await page.locator('#preview mjx-container').count(), 3);
    assert.equal(await page.locator('#preview [data-mjx-error]').count(), 0);
    assert(await page.evaluate(() => Boolean(MathJax.startup.document.safe)));
    assert.equal(await page.locator('script[src], link[rel="stylesheet"][href]').count(), 0);
    const fonts = await page.evaluate(() => [...document.fonts]
      .filter((font) => font.family.startsWith('MJX'))
      .map((font) => ({ family: font.family, status: font.status })));
    assert(fonts.length >= 20);
    assert(fonts.some((font) => font.status === 'loaded'));
    assert(!fonts.some((font) => font.status === 'error'));
    console.log('PASS isolated HTML opens offline with formulas, safe extension, fonts and a table');

    const fixture = String.raw`### Rendering check

Inline $\\alpha$ and $\\{x\\}$.

$$
\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}
$$

- [x] done

CODE_PLACEHOLDER

<b>raw HTML</b>

![unsupported image](https://example.org/should-not-load.png)
`.replace('CODE_PLACEHOLDER', () => '`$not_math$`');
    await page.locator('#source').fill(fixture);
    await ready(page);
    assert.equal(await page.locator('#preview mjx-container').count(), 3);
    assert.equal(await page.locator('#preview mjx-mtr').count(), 2);
    assert.equal(await page.locator('#preview img, #preview input, #preview b').count(), 0);
    assert.match(await page.locator('#preview').innerText(), /<b>raw HTML<\/b>/);
    console.log('PASS escaped commands, matrix rows, inline code and OpenReview HTML/image restrictions');

    const sourcePage = await context.newPage();
    await sourcePage.goto(pathToFileURL(path.join(root, 'index.html')).href);
    await ready(sourcePage);
    await sourcePage.locator('#source').fill(fixture);
    await ready(sourcePage);
    const mathMarkup = (p) => p.locator('#preview mjx-container').evaluateAll((nodes) => nodes.map((node) => node.innerHTML));
    assert.deepEqual(await mathMarkup(page), await mathMarkup(sourcePage));
    await sourcePage.close();
    console.log('PASS source and standalone builds render the same formula markup');

    await page.locator('#file-input').setInputFiles({ name: 'response.md', mimeType: 'text/markdown', buffer: Buffer.from(fixture) });
    await ready(page);
    assert.equal(await page.locator('#source').inputValue(), fixture);
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#download').click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), 'response.md');
    assert.equal(await fs.readFile(await download.path(), 'utf8'), fixture);
    await page.reload();
    await ready(page);
    assert.equal(await page.locator('#source').inputValue(), fixture);
    console.log('PASS Markdown import, exact download and browser draft restoration');

    await page.locator('#limit').fill('5');
    assert.equal(await page.locator('#counter').getAttribute('class'), 'danger');
    await page.locator('[data-view="write"][type="button"]').click();
    assert.equal(await page.locator('.preview-pane').isVisible(), false);
    await page.locator('[data-view="preview"][type="button"]').click();
    await ready(page);
    assert.equal(await page.locator('.editor-pane').isVisible(), false);
    await page.locator('[data-view="split"][type="button"]').click();
    await ready(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await ready(page);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    assert.deepEqual(dependencies, []);
    assert.deepEqual(errors, []);
    console.log('PASS character limit, view switching, mobile layout, and no external requests or JS errors');
  } finally {
    await browser.close();
    await fs.rm(directory, { recursive: true, force: true });
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
