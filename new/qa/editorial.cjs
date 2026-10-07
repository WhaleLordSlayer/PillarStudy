const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const base = process.env.QA_URL || 'http://127.0.0.1:8765/new/';
const output = process.env.QA_OUTPUT || path.resolve(__dirname, '../../../PillarStudy-QA/stitch-built');
const root = path.resolve(__dirname, '../..');
const productionRoutes = ['', 'join/', 'privacy/', 'account-deletion/', 'beta/', 'explorer/', 'topical-guide/', 'new-site/'];
const detailRoutes = ['study/', 'together/', 'teach/', 'channels/', 'live/', 'lessons/', 'groups/', 'explorer/', 'reader/', 'topical-guide/', 'more/', 'labs/', 'labs/explorer/', 'labs/topical-guide/', 'privacy/', 'account-deletion/', 'beta/', 'join/', 'review/', 'download/'];
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
      assert.equal(await page.title(),'Cultivate | Read. Study. Teach. Together.');
      assert.equal(await page.locator('meta[name="description"]').getAttribute('content'),'Cultivate brings personal scripture study, Explorer, private Study Spaces, interactive lessons, Lesson Channels, and Live Classes into one connected app.');
      assert.equal(await page.locator('meta[property="og:title"]').getAttribute('content'),'Cultivate — Read. Study. Teach. Together.');
      assert.equal(await page.locator('meta[property="og:description"]').getAttribute('content'),'Study scripture deeply, explore its people and stories, grow with others in private Study Spaces, and build lessons you can share and teach.');
      assert.equal(await page.locator('.hero-products .device').count(),3);
      for(const device of await page.locator('.hero-products .device').all()) assert(await device.isVisible());
      assert.deepEqual(await page.locator('.workflow-card h3').allTextContents(),['Read','Explore','Save','Build','Share','Teach']);
      assert.equal(await page.locator('.depth-feature').count(),8);
      for(const img of await page.locator('img').all())assert(await img.evaluate(el=>el.complete&&el.naturalWidth>0));
      const copy=await page.locator('main').innerText();
      assert(!/no AI in the app/i.test(copy));
      assert(copy.includes('No AI-generated scripture commentary.'));
      assert(!/interlinear|Strong['’]s|\bESV\b|\bNIV\b|\bNASB\b|voice reflections|word clouds|liturgical|ambient audio|macOS|120,000|free trial|shared revelation|\bstars\b/i.test(copy));
      assert(!copy.includes('in development'));
      for(const id of ['explorer-showcase','spaces-showcase','channels-showcase','live-showcase'])assert.equal(await page.locator(`#${id}`).count(),1);
      assert.equal(await page.locator('.experiences > .experience').count(),3);
      assert(copy.includes('invite-only Early Access'));
      await page.getByRole('button',{name:'How to request Early Access'}).click();
      assert(await page.getByRole('dialog').isVisible());
      assert((await page.getByRole('dialog').innerText()).includes('Open the app, start a Live Session, and complete the Early Access request form when prompted.'));
      await page.keyboard.press('Escape');
      assert(!await page.getByRole('dialog').isVisible());
      assert(await page.getByRole('button',{name:'How to request Early Access'}).evaluate(el=>document.activeElement===el));
      await page.getByRole('button',{name:'How to request Early Access'}).click();
      await page.getByRole('button',{name:'Close',exact:true}).click();
      await page.reload();
      await page.locator('h1').waitFor();
      await page.evaluate(()=>{document.activeElement?.blur();scrollTo({top:0,behavior:'instant'})});
      const checkBounds=async()=>{
        const bounds=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('header a,header summary,main .button,.hero-products .device,.experience-copy,.visual-surface,footer a')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.left<-1||r.right>innerWidth+1)}).map(el=>el.className)}));
        assert(bounds.scroll<=width+1,JSON.stringify(bounds));assert.deepEqual(bounds.overflow,[],JSON.stringify(bounds));return bounds;
      };
      await checkBounds();
      await page.keyboard.press('Tab');assert(await page.locator('.skip-link').evaluate(el=>document.activeElement===el));
      await page.keyboard.press('Enter');assert(await page.locator('main').evaluate(el=>document.activeElement===el));
      if(width===390){await page.locator('.mobile-menu summary').click();assert.equal(await page.locator('.mobile-menu nav a').count(),5);assert(await page.locator('.mobile-menu nav').isVisible());await checkBounds();await page.locator('.mobile-menu summary').click();}
      for(const href of ['./study/','./together/','./teach/']) assert.equal(await page.locator(`a[href="${href}"]`).count()>0,true,href);
      for(const id of ['about','experiences']){
        if(!await page.locator(`a[href="#${id}"]`).filter({visible:true}).count()) await page.locator('.mobile-menu summary').click();
        await page.locator(`a[href="#${id}"]`).filter({visible:true}).first().click();
        assert.equal(new URL(page.url()).hash,`#${id}`);
        assert(await page.locator(`#${id}`).isVisible());
      }
      await page.evaluate(()=>document.activeElement?.blur());
      await page.mouse.move(0,0);
      for(const name of ['study','together','teach','explorer-showcase','spaces-showcase','channels-showcase','live-showcase','workflow','about'])await page.locator(`#${name}`).screenshot({path:path.join(output,`${width}-${name}.png`),style:'.site-header,.skip-link{visibility:hidden!important}'});
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

    const joinPage=await context.newPage();
    const secureToken='a'.repeat(64);
    const validJoin=new URL(`join/?code=ABC123&inviteToken=${secureToken}`,base);
    assert.equal((await joinPage.goto(validJoin.href)).status(),200);
    await joinPage.getByRole('heading',{name:'Study together in Cultivate'}).waitFor();
    assert.equal((await joinPage.locator('.join-code').innerText()).trim(),'ABC123');
    assert(await joinPage.getByRole('button',{name:'Open Cultivate'}).isVisible());
    assert(await joinPage.getByRole('link',{name:'Get Cultivate'}).isVisible());

    const incompleteJoin=new URL('join/?code=ABC123',base);
    assert.equal((await joinPage.goto(incompleteJoin.href)).status(),200);
    assert((await joinPage.locator('h1').innerText()).includes('incomplete'));
    assert.equal((await joinPage.locator('.join-code').innerText()).trim(),'ABC123');
    await joinPage.close();

    await context.close();
    await fs.writeFile(path.join(output,'results.json'),JSON.stringify({results,productionRoutes,detailRoutes,joinInvite:true},null,2));
    console.log('PASS production routes, twenty /new/ review routes, and secure /new/join invite smoke test; production HTML matches build after normalizing line endings and hosting analytics');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
