const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const p=await b.newPage({viewport:{width:390,height:844}});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file:///'+path.resolve(__dirname,'..','tutorial-collaboration.html').replace(/\\/g,'/'));
  assert.equal(await p.locator('.full-reference').getAttribute('open'),null);
  for(let i=0;i<6;i++){
   await p.locator(`[data-step="${i}"]`).click();
   assert.equal(await p.locator(`[data-step="${i}"]`).getAttribute('aria-current'),'step');
   assert.ok(await p.locator('#visual-body svg,#visual-body .lesson-simulator').count());
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`step ${i+1} fits mobile`);
  }
  await p.locator('[data-step="4"]').click();
  const go=async to=>p.locator(`[data-scene="${to}"]`).click();
  await go('MENU');await go('L1_INFO');await go('MENU');await go('L1_INFO');await go('L1_PLAY');
  assert.equal(await p.locator('[data-scene]').count(),0);
  await p.locator('#sim-screen code').filter({hasText:'L1_DONE'}).waitFor();
  await go('L2_INFO');await go('L2_PLAY');
  await p.locator('#sim-screen code').filter({hasText:'L2_DONE'}).waitFor();
  await go('L2_PLAY');await p.locator('#sim-screen code').filter({hasText:'L2_DONE'}).waitFor();
  await go('END');await go('HOME');
  await p.locator('[data-step="5"]').click();
  assert.ok(await p.locator('#visual-body a[href="collaboration-checklist.html"]').count());
  await p.locator('.full-reference>summary').click();
  assert.equal(await p.locator('#naming-table tbody tr').count(),9);
  assert.equal(await p.locator('svg .sb3-obsolete').count(),0);
  const download=p.waitForEvent('download');await p.locator('#wiring-download').click();
  assert.equal((await download).suggestedFilename(),'TEAM_接線表_v01.txt');
  await p.locator('.full-reference>summary').click();
  await p.setViewportSize({width:1280,height:1000});
  await p.locator('[data-step="0"]').click();
  await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(500);
  await p.screenshot({path:'D:/codex/資訊團隊/合作圖解首頁.png'});
  await p.locator('[data-step="2"]').click();await p.waitForTimeout(500);
  await p.screenshot({path:'D:/codex/資訊團隊/合作圖解交付.png'});
  assert.deepEqual(errors,[]);
  console.log('Six visual steps, mobile layout, automatic DONE routing, replay, reference and downloads passed');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});
