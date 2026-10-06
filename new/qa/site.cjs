// QA the authored and built site. Requires Playwright; no framework runtime is used by the pages.
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const routes = ['', 'lessons/', 'groups/', 'explorer/', 'reader/', 'topical-guide/', 'more/', 'labs/', 'download/'];
const widths = [1440, 1280, 1024, 768, 430, 390];
const root = new URL(process.env.QA_URL || 'http://127.0.0.1:8765/new/');
const output = process.env.QA_OUTPUT || path.resolve(__dirname, '../../../PillarStudy-QA/site');
const localAssets = path.resolve(__dirname, '../assets');
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.QA_BROWSER ? { executablePath: process.env.QA_BROWSER } : {}) });
  await fs.mkdir(output, { recursive: true });
  await fs.mkdir(path.join(output, 'assets'), { recursive: true });
  const results = [], links = new Set(), hashes = new Set(), fetched = new Set();
  for (const file of await fs.readdir(localAssets)) if (file.endsWith('.webp')) hashes.add(createHash('sha256').update(await fs.readFile(path.join(localAssets, file))).digest('hex'));
  try {
    for (const width of widths) {
      const context = await browser.newContext({ viewport: { width, height: width === 1024 ? 768 : width === 768 ? 1024 : width < 768 ? 844 : 1000 }, reducedMotion: 'reduce' });
      for (const route of routes) {
        const page = await context.newPage();
        const errors = [], failures = [], responses = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
        page.on('requestfailed', request => failures.push(request.url()));
        page.on('response', response => responses.push({ url: response.url(), status: response.status() }));
        assert.equal((await page.goto(new URL(route, root).href)).status(), 200);
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.locator('h1').count(), 1);
        assert(await page.title());
        await page.keyboard.press('Tab');
        assert(await page.locator('.skip-link').evaluate(link => document.activeElement === link));
        await page.keyboard.press('Enter');
        assert(await page.locator('main').evaluate(main => document.activeElement === main));
        const images = [];
        for (const img of await page.locator('img').all()) {
          await img.scrollIntoViewIfNeeded();
          images.push(await img.evaluate(async img => { await img.decode(); const r=img.getBoundingClientRect(); return { src: img.src, width: img.naturalWidth, height: img.naturalHeight, displayedWidth: r.width, displayedHeight: r.height, alt: img.alt }; }));
        }
        for (const img of images) {
          assert(img.width > 0 && img.height > 0 && img.alt);
          assert(Math.abs(img.displayedWidth/img.displayedHeight-img.width/img.height)<.01, `Distorted ${img.src}`);
          assert(responses.some(response => response.url === img.src && response.status === 200), img.src);
          if (!fetched.has(img.src)) {
            const response=await context.request.get(img.src,{headers:{'Cache-Control':'no-cache'}});
            assert.equal(response.status(),200);
            const bytes=await response.body();
            assert(hashes.has(createHash('sha256').update(bytes).digest('hex')), `Asset mismatch: ${img.src}`);
            await fs.writeFile(path.join(output,'assets',path.basename(new URL(img.src).pathname)),bytes);
            fetched.add(img.src);
          }
        }
        const checkOverflow = async () => {
          const overflow=await page.evaluate(()=>({ document:document.documentElement.scrollWidth>innerWidth+1, elements:[...document.querySelectorAll('header *,main *,footer *')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.left < -1||r.right>innerWidth+1)}).map(el=>el.className) }));
          assert(!overflow.document && !overflow.elements.length, JSON.stringify({width,route,overflow}));
          return overflow;
        };
        const overflow=await checkOverflow();
        if(width<=1000) {
          await page.locator('.mobile-menu summary').click();
          await checkOverflow();
          assert(await page.locator('.mobile-menu nav').isVisible());
          assert.equal(await page.locator('.mobile-menu nav a').count(),7);
          await page.locator('.mobile-menu summary').click();
        }
        for (const anchor of await page.locator('a[href^="#"]:not(.skip-link)').all()) {
          const href=await anchor.getAttribute('href');
          await anchor.click();
          await page.waitForFunction(id=>Math.abs(document.querySelector(id).getBoundingClientRect().top-24)<3,href);
        }
        if(route==='download/') for(const summary of await page.locator('.download-faq summary').all()) {await summary.click();assert(await summary.evaluate(el=>el.parentElement.open));await summary.click();}
        for(const href of await page.locator('a:not([href^="#"])').evaluateAll(xs=>[...new Set(xs.map(x=>x.href))])) links.add(href);
        assert.equal(await page.locator('video').count(),0);
        assert(!await page.locator('main').evaluate(el=>/[\u00c2\u00c3\ufffd]/.test(el.innerText)));
        assert(!await page.locator('main').evaluate(el=>/historical guide/i.test(el.innerText)));
        await page.evaluate(()=>scrollTo(0,0));
        await page.mouse.move(0,0);
        const name=route.replace('/','')||'home';
        await page.screenshot({path:path.join(output,`${width}-${name}-hero.png`)});
        await page.screenshot({path:path.join(output,`${width}-${name}.png`),fullPage:true});
        if(width===1440||width===390) for(const section of await page.locator('section[id]').all()) {const id=await section.getAttribute('id');await section.screenshot({path:path.join(output,`${width}-${name}-${id}.png`)});}
        assert.deepEqual(errors,[],JSON.stringify({width,route,errors}));
        assert.deepEqual(failures,[],JSON.stringify({width,route,failures}));
        assert(responses.every(r=>r.status>=200&&r.status<300),JSON.stringify(responses));
        results.push({width,route,images,overflow,errors,failures,slots:await page.locator('[data-screenshot]').count()});
        await page.close();
      }
      console.log(`PASS ${width}px: all nine pages; images, menu, anchors, keyboard, FAQ, overflow, console and network`);
      await context.close();
    }
    const context=await browser.newContext();
    for(const link of links) {
      if(new URL(link).origin!==root.origin) continue;
      const response=await context.request.get(link);
      assert.equal(response.status(),200,link);
    }
    await context.close();
    await fs.writeFile(path.join(output,'results.json'),JSON.stringify({results,links:[...links],uniqueImages:fetched.size},null,2));
    console.log(`PASS ${links.size} distinct link targets inventoried; all same-origin destinations HTTP 200; ${fetched.size} unique image URLs match audited bytes`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
