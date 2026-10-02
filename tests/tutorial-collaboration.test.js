const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');

const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
if(!fs.existsSync(edge)){console.log('Edge unavailable; tutorial test skipped');process.exit(0);}

(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:edge});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const url='file:///'+path.resolve(__dirname,'..','tutorial-collaboration.html').replace(/\\/g,'/');
    await page.goto(url);
    assert.match(await page.title(),/兩人合作與合併作品/);
    assert.equal(await page.locator('table tbody tr').count(),9);
    assert.equal(await page.locator('.route .node').count(),9);
    assert.equal(await page.locator('.merge-step').count(),6);
    assert.match(await page.locator('body').innerText(),/L1_CLEAR/);
    assert.match(await page.locator('body').innerText(),/L2_CLEAR/);
    assert.deepEqual(await page.locator('.route .node code').allInnerTexts(),['HOME','MENU','L1_INFO','L1_PLAY','L1_DONE','L2_INFO','L2_PLAY','L2_DONE','END']);
    assert.match(await page.locator('body').innerText(),/\.sprite3/);
    assert.match(await page.locator('body').innerText(),/不要.*檔案 → 從電腦載入/s);
    assert.equal(await page.locator('pre.blocks').count(),2);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true,'mobile viewport should not overflow');
    await page.setViewportSize({width:1280,height:900});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true,'desktop viewport should not overflow');
    console.log('Collaboration tutorial structure and responsive layout passed');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
