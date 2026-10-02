const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');

const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
if(!fs.existsSync(edge)){console.log('Edge unavailable; tutorial browser test skipped');process.exit(0);}
const root=path.resolve(__dirname,'..');
const file=name=>'file:///'+path.join(root,name).replace(/\\/g,'/');
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:edge});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:800}});
    await page.goto(file('tutorial-broadcast.html'));
    assert.match(await page.title(),/G11.*Scratch/);
    assert.equal(await page.locator('svg[role=img]').count(),5);
    assert.match(await page.locator('main').innerText(),/第一關完成後，才開始第二關/);
    await page.locator('#play').click();
    await page.locator('#stage .done').nth(4).waitFor({timeout:10000});
    assert.match(await page.locator('#live').innerText(),/結算/);
    for(const box of await page.locator('.check input').all())await box.check();
    assert.match(await page.locator('#check-result').innerText(),/回原網站勾選 G11/);
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'mobile viewport should not horizontally overflow');
    await page.goto(file('index.html'));
    await page.locator('#liGuest').click();
    await page.locator('#group').selectOption('game');
    await page.locator('[data-tab=feat]').click();
    const link=page.locator('a[href="tutorial-broadcast.html"]');
    assert.equal(await link.count(),1);
    assert.equal(await link.getAttribute('target'),'_blank');
    assert.match(await link.locator('..').innerText(),/G11/);
    console.log('G11 flowchart, SVG blocks, simulation, checklist, responsive layout and main-site link passed');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
