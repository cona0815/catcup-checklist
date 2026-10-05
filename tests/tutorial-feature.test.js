const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
if(!fs.existsSync(edge)){console.log('Edge unavailable; feature tutorial test skipped');process.exit(0);}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:edge});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const file='file:///'+path.resolve(__dirname,'..','tutorial-feature.html').replace(/\\/g,'/');
  await page.goto(file);
  const ids=await page.evaluate(()=>Object.keys(lessons));
  assert.equal(ids.filter(x=>x.startsWith('A')).length,14);
  assert.equal(ids.filter(x=>x.startsWith('G')).length,15);
  for(const id of ids){
   await page.goto(`${file}?item=${id}`);
   assert.equal(await page.locator('#title').innerText(),await page.evaluate(x=>lessons[x][1],id),`lesson title ${id}`);
   assert.ok(await page.locator('.step').count()>=2,`steps ${id}`);
   assert.equal(await page.locator('.visual-guide svg').count(),1,`illustrated flow ${id}`);
   assert.equal(await page.locator('.guide-panel').count(),4,`detailed illustrated steps ${id}`);
   assert.equal(await page.locator('svg .sb3-obsolete').count(),0,`no unrecognized blocks ${id}`);
   if(await page.evaluate(x=>Boolean(realBlockExamples[x]),id))assert.ok(await page.locator('#example .scratchblocks svg').count()>0,`Scratch blocks ${id}`);
   assert.ok((await page.locator('#test').innerText()).length>5,`checklist ${id}`);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`mobile width ${id}`);
  }
  console.log(`All ${ids.length} feature tutorials opened and rendered on mobile`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
