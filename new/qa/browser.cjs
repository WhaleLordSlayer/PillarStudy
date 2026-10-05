// Run with Playwright available through NODE_PATH. Start a static server at the repo root.
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const url = process.env.QA_URL || 'http://127.0.0.1:8765/new/';
  const output = process.env.QA_OUTPUT || path.join(__dirname, '../../../PillarStudy-QA');
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.QA_BROWSER ? { executablePath: process.env.QA_BROWSER } : {}),
  });
  await fs.mkdir(output, { recursive: true });
  const results = [];
  try {
    for (const width of [1440, 1280, 1024, 768, 430, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [], responses = [], failures = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('response', response => responses.push({ url: response.url(), status: response.status() }));
      page.on('requestfailed', request => failures.push({ url: request.url(), error: request.failure() }));
      assert.equal((await page.goto(url)).status(), 200);
      await page.evaluate(() => document.fonts.ready);
      const images = [];
      for (const image of await page.locator('img').all()) {
        await image.scrollIntoViewIfNeeded();
        images.push(await image.evaluate(async image => {
          await image.decode();
          const rect = image.getBoundingClientRect();
          const container = image.closest('figure');
          return { src: image.src, width: image.naturalWidth, height: image.naturalHeight,
            renderedWidth: rect.width, renderedHeight: rect.height,
            clipped: container ? container.clientHeight + 2 < rect.height : false };
        }));
      }
      for (const image of images) {
        assert(image.width > 0 && image.height > 0 && !image.clipped, JSON.stringify(image));
        assert(responses.some(response => response.url === image.src && response.status === 200), image.src);
      }
      const overflow = await page.evaluate(() => ({
        document: document.documentElement.scrollWidth > innerWidth,
        elements: [...document.querySelectorAll('main *, header *, footer *')].filter(element => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && (rect.left < -1 || rect.right > innerWidth + 1);
        }).map(element => element.className),
      }));
      assert(!overflow.document && overflow.elements.length === 0, JSON.stringify(overflow));
      const anchors = [];
      for (const link of await page.locator('a[href^="#"]').all()) {
        const href = await link.getAttribute('href');
        await link.click();
        await page.waitForFunction(id => Math.abs(document.querySelector(id).getBoundingClientRect().top - 24) < 3, href);
        anchors.push(href);
      }
      const links = await page.locator('a:not([href^="#"])').evaluateAll(links => [...new Set(links.map(link => link.href))]);
      for (const link of links) assert.equal((await context.request.get(link)).status(), 200, link);
      assert.equal(await page.locator('video').count(), 0);
      assert.equal(await page.locator('body').evaluate(element => /[\u00c2\u00c3\ufffd]/.test(element.innerText)), false, 'Encoding corruption');
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: path.join(output, `${width}.png`), fullPage: true });
      assert.deepEqual(errors, []);
      assert.deepEqual(failures, []);
      assert(responses.every(response => response.status === 200), JSON.stringify(responses));
      results.push({ width, images, anchors, links, overflow, errors, failures, responses });
      await context.close();
      console.log(`PASS ${width}px: ${images.length} images; anchors, links, overflow, console and network clean`);
    }
    await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
