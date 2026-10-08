const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const p=await b.newPage({viewport:{width:390,height:844}});
  await p.goto('file:///'+path.resolve(__dirname,'..','tutorial-collaboration.html').replace(/\\/g,'/'));
  assert.equal(await p.locator('#naming-table tbody tr').count(),9);
  assert.ok(await p.locator('svg.diagram').count()>=10);
  assert.equal(await p.locator('svg .sb3-obsolete').count(),0);
  assert.match(await p.locator('body').innerText(),/一號選手/);
  assert.match(await p.locator('body').innerText(),/二號選手/);
  assert.match(await p.locator('body').innerText(),/TEAM_P1_MAIN_v01/);
  assert.match(await p.locator('body').innerText(),/L2_MANAGER/);
  assert.doesNotMatch(await p.locator('body').textContent(),/L[12]_CLEAR/);
  await p.locator('details').first().locator('summary').click();
  assert.equal(await p.locator('.scratchblocks svg').count(),8);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  const downloadEvent=p.waitForEvent('download');await p.locator('#wiring-download').click();
  assert.equal((await downloadEvent).suggestedFilename(),'TEAM_接線表_v01.txt');
  await p.setViewportSize({width:1280,height:900});
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  await p.screenshot({path:'D:/codex/資訊團隊/合作教學預覽.png',fullPage:false});
  console.log('Two-player naming, role steps, merge, download, Scratch blocks and responsive layout passed');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});
