import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const root=new URL('../',import.meta.url);
const server=http.createServer(async(req,res)=>{
  try{
    const pathname=new URL(req.url,'http://localhost').pathname;
    if(!/^\/(web|dist-app)\/(index\.html|style\.css|native\.css|app-icon\.png|app\.js|native\.js|worker\.js|engine\.mjs)$/.test(pathname)){res.writeHead(404).end();return;}
    const type=pathname.endsWith('.html')?'text/html':pathname.endsWith('.css')?'text/css':pathname.endsWith('.png')?'image/png':'text/javascript';
    res.setHeader('Content-Type',`${type}; charset=utf-8`);res.end(await readFile(new URL(pathname.slice(1),root)));
  }catch{res.writeHead(500).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{});
try{
  for(const native of (process.argv.includes('--web-only')?[false]:[false,true])){
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',acceptDownloads:true});
    const page=await context.newPage();const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
    if(native)await page.addInitScript(()=>{
      window.exportOutcome='cancel';
      window.PokerLab={native:true,saveImage:async(url,filename)=>{
        const blob=await(await fetch(url)).blob();
        if(blob.type!=='image/png'||blob.size===0)throw Error('Invalid export');
        if(window.exportOutcome==='error')throw Error('Save failed');
        return {cancelled:window.exportOutcome==='cancel',filename};
      }};
    });
    const url=`${base}/${native?'dist-app':'web'}/index.html`;
    await page.goto(url);
    if(native){
      assert.equal(await page.locator('.mark').textContent(),'R♠');
      assert.match(await page.locator('.brand').textContent(),/Poker Lab/);
    }
    assert.equal(await page.locator('.player-name').count(),2);
    assert.equal(await page.locator('.card-slot.filled').count(),0);
    const presetHelp=page.locator('.preset-help');
    if(await presetHelp.count()){
      assert.equal(await presetHelp.evaluate(el=>el.open),false);
      await presetHelp.locator('summary').click();
    }
    await page.locator('[data-preset="turn"]').click();
    await page.waitForFunction(()=>document.querySelector('#result-content').textContent.includes('95.45%'));
    assert.equal(await page.locator('.card-slot.filled').count(),8);
    await page.locator('.player-name').first().fill('离线测试');
    await page.locator('.player-name').first().blur();
    await page.reload();
    await page.waitForFunction(()=>document.querySelector('#result-content').textContent.includes('95.45%'));
    assert.equal(await page.locator('.player-name').first().inputValue(),'离线测试');
    await page.locator('#open-guide').click();assert.equal(await page.locator('#hand-guide').evaluate(el=>el.open),true);
    await page.locator('#close-guide').click();
    await page.locator('#download-image').click();
    await page.waitForFunction(()=>document.querySelector('#image-preview').open);
    if(native){
      await page.locator('#confirm-download').click();
      await page.waitForFunction(()=>!document.querySelector('#confirm-download').disabled);
      assert.equal(await page.locator('#image-preview').evaluate(el=>el.open),true);
      assert.equal(await page.locator('#download-status').textContent(),'');
      await page.evaluate(()=>window.exportOutcome='error');
      await page.locator('#confirm-download').click();
      await page.waitForFunction(()=>!document.querySelector('#confirm-download').disabled);
      assert.equal(await page.locator('#image-preview').evaluate(el=>el.open),true);
      assert.match(await page.locator('#preview-filename').textContent(),/保存失败/);
      await page.evaluate(()=>window.exportOutcome='success');
      await page.locator('#confirm-download').click();
      await page.waitForFunction(()=>document.querySelector('#download-status').textContent.includes('牌局已保存为'));
    }else{
      const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#confirm-download').click()]);
      assert.match(download.suggestedFilename(),/Poker Lab-2人牌局-.*\.png/);
    }
    await page.goto(`${url}?fresh=1`);
    await page.waitForSelector('.player-name');
    assert.equal(await page.locator('.card-slot.filled').count(),native?8:0);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
    assert.deepEqual(errors,[]);
    await context.close();
    console.log(`${native?'Android adapter (mock bridge)':'Web'}: calculation, refresh, names, reference, PNG export and mobile layout passed.`);
  }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
