const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const base = process.env.QA_URL || 'http://127.0.0.1:8765/new/';
const output = process.env.QA_OUTPUT || path.resolve(__dirname, '../../../PillarStudy-QA/stitch-built');
const root = path.resolve(__dirname, '../..');
const productionRoutes = ['', 'join/', 'privacy/', 'account-deletion/', 'beta/', 'explorer/', 'topical-guide/', 'new-site/'];
const detailRoutes = ['lessons/', 'groups/', 'explorer/', 'reader/', 'topical-guide/', 'more/', 'labs/', 'download/'];
// Hosting injects a versioned analytics beacon; Linux builds also normalize line endings.
const normalizedHtml = value => value.toString().replace(/\r/g, '').replace(/<script\b[^>]*src="https:\/\/static\.cloudflareinsights\.com\/[^\"]*"[^>]*>[\s\S]*?<\/script>\n?/g, '');
(async () => {
  await fs.mkdir(output, {recursive:true});
  const browser = await chromium.launch({headless:true, executablePath:process.env.QA_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  const results=[];
  try {
    for(const width of [390,768,1440,1920]) {
      const context=await browser.newContext({viewport:{width,height:width===768?1024:1000},reducedMotion:'reduce'});
      const page=await context.newPage();
      const errors=[],failures=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
      page.on('requestfailed',r=>failures.push(r.url()));
      page.on('response',r=>{if(r.status()>=400)failures.push(`${r.status()} ${r.url()}`)});
      assert.equal((await page.goto(base)).status(),200);
      await page.locator('h1').waitFor();
      assert.equal((await page.reload()).status(),200);
      await page.locator('h1').waitFor();
      await page.evaluate(()=>document.fonts.ready);
      assert.equal(await page.locator('h1').count(),1);
      assert.equal(await page.locator('.hero-products .device').count(),3);
      for(const device of await page.locator('.hero-products .device').all()) assert(await device.isVisible());
      assert.deepEqual(await page.locator('.workflow-card h3').allTextContents(),['Read','Explore','Save','Build','Share','Teach']);
      assert.equal(await page.locator('.depth-feature').count(),8);
      const copy=await page.locator('main').innerText();
      assert(!/interlinear|Strong['’]s|\bESV\b|\bNIV\b|\bNASB\b|voice reflections|word clouds|liturgical|ambient audio|macOS|120,000|free trial|shared revelation|\bstars\b/i.test(copy));
      assert(copy.includes('in development'));
      const checkBounds=async()=>{
        const bounds=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('header a,header summary,main .button,.hero-products .device,.experience-copy,.visual-surface,footer a')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.left<-1||r.right>innerWidth+1)}).map(el=>el.className)}));
        assert(bounds.scroll<=width+1,JSON.stringify(bounds));assert.deepEqual(bounds.overflow,[],JSON.stringify(bounds));return bounds;
      };
      await checkBounds();
      await page.keyboard.press('Tab');assert(await page.locator('.skip-link').evaluate(el=>document.activeElement===el));
      await page.keyboard.press('Enter');assert(await page.locator('main').evaluate(el=>document.activeElement===el));
      if(width===390){await page.locator('.mobile-menu summary').click();assert.equal(await page.locator('.mobile-menu nav a').count(),5);assert(await page.locator('.mobile-menu nav').isVisible());await checkBounds();await page.locator('.mobile-menu summary').click();}
      for(const id of ['study','together','teach','about','experiences']){
        if(!await page.locator(`a[href="#${id}"]`).filter({visible:true}).count()) await page.locator('.mobile-menu summary').click();
        await page.locator(`a[href="#${id}"]`).filter({visible:true}).first().click();
        assert.equal(new URL(page.url()).hash,`#${id}`);
        assert(await page.locator(`#${id}`).isVisible());
      }
      await page.evaluate(()=>document.activeElement?.blur());
      await page.mouse.move(0,0);
      for(const name of ['study','together','teach','workflow','about'])await page.locator(`#${name}`).screenshot({path:path.join(output,`${width}-${name}.png`),style:'.site-header,.skip-link{visibility:hidden!important}'});
      await page.locator('footer').screenshot({path:path.join(output,`${width}-footer.png`),style:'.site-header,.skip-link{visibility:hidden!important}'});
      await page.evaluate(()=>{document.activeElement?.blur();scrollTo({top:0,behavior:'instant'})});
      await page.screenshot({path:path.join(output,`${width}-hero.png`)});
      await page.screenshot({path:path.join(output,`${width}-full.png`),fullPage:true});
      for(const href of await page.locator('a').evaluateAll(as=>[...new Set(as.map(a=>a.href))])) {
        const url=new URL(href);
        if(url.origin!==new URL(base).origin||url.hash)continue;
        assert.equal((await context.request.get(href)).status(),200,href);
      }
      assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
      results.push({width,directLoad:true,refresh:true,devices:3,errors,failures});
      console.log(`PASS ${width}px: direct/refresh, three devices, wrapping bounds, navigation, skip link, copy claims, workflow, console/network and links`);
      await context.close();
    }
    const context=await browser.newContext();
    for(const route of productionRoutes){const url=new URL('../'+route,base);const response=await context.request.get(url.href);assert.equal(response.status(),200,url.href);const local=await fs.readFile(path.join(root,'dist',route,'index.html'));assert.equal(createHash('sha256').update(normalizedHtml(await response.body())).digest('hex'),createHash('sha256').update(normalizedHtml(local)).digest('hex'),url.href);}
    for(const route of detailRoutes)assert.equal((await context.request.get(new URL(route,base).href)).status(),200,route);
    await context.close();
    await fs.writeFile(path.join(output,'results.json'),JSON.stringify({results,productionRoutes,detailRoutes},null,2));
    console.log('PASS eight existing production routes and eight existing /new/ detail routes; production HTML matches build after normalizing line endings and hosting analytics');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
