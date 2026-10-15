/* 作品上傳頁：學生自動檢查＋上傳＋本隊紀錄；老師看報告、重跑 AI；手機寬度。GAS 以假資料模擬。 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const JSZip=require('jszip');

const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
if(!fs.existsSync(edge)){console.log('Edge unavailable; work upload UI test skipped');process.exit(0);}
const url='file:///'+path.resolve(__dirname,'..','index.html').replace(/\\/g,'/');
let uploads=[],analyzeCalls=[],listCalls=[];
function mock(route){
  const req=route.request();let action=new URL(req.url()).searchParams.get('action'),input={};
  if(req.method()==='POST'){input=JSON.parse(req.postData()||'{}');action=input.action;}
  let result={ok:true,data:{}};
  if(action==='getAll')result.data={progress:[],mocks:[],links:[]};
  if(action==='login')result.data={account:'50101',name:'王小明',team:'貓咪隊',group:'game'};
  if(action==='listStudents')result.data=[{account:'50101',name:'王小明',team:'貓咪隊',group:'game'},{account:'50201',name:'李小華',team:'狗狗隊',group:'game'}];
  if(action==='verifyTeacher')result.data={teacher:true};
  if(action==='uploadWork'){
    const p=input.payload;uploads.push(p);
    const item={id:'u'+uploads.length,time:'2026-10-15 09:15:00',team:p.team,group:p.group,account:'50101',name:'王小明',
      fileName:'091500_50101_'+p.fileName,folder:p.team+'（遊戲組）/2026-10-15/091500_50101_'+p.fileName,size:10,checks:p.checks,aiStatus:''};
    result.data={item};
  }
  if(action==='analyzeWork')analyzeCalls.push(input);
  if(action==='listWorks'){listCalls.push(input);
    const teacher=!!input.password;
    result.data={items:uploads.map((p,i)=>({id:'u'+(i+1),time:'2026-10-15 09:15:00',team:p.team,group:p.group,account:'50101',name:'王小明',
      fileName:'091500_50101_'+p.fileName,folder:'貓咪隊（遊戲組）/2026-10-15/091500_50101_1.sb3',size:10,checks:p.checks,
      ...(teacher?{fileUrl:'https://drive.google.com/file/d/abc',summaryUrl:'https://drive.google.com/file/d/sum/view'}:{})})).reverse()};
  }
  return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(result)});
}
async function makeSb3(file){
  const zip=new JSZip();
  zip.file('project.json',JSON.stringify({targets:[
    {isStage:true,name:'Stage',costumes:[{name:'open'},{name:'HOME'}],variables:{},blocks:{
      a:{opcode:'event_whenflagclicked',next:'b',parent:null,inputs:{},fields:{},shadow:false,topLevel:true},
      b:{opcode:'event_broadcast',next:null,parent:'a',inputs:{BROADCAST_INPUT:[1,[11,'menu','m']]},fields:{},shadow:false,topLevel:false}}},
    {isStage:false,name:'角色1',costumes:[{name:'c'}],variables:{},blocks:{}}],extensions:[],meta:{semver:'3.0.0'}}));
  fs.writeFileSync(file,await zip.generateAsync({type:'nodebuffer'}));
}
(async()=>{
  const tmp=path.join(require('node:os').tmpdir(),'wu-test');fs.mkdirSync(tmp,{recursive:true});
  const sb3=path.join(tmp,'1.sb3');await makeSb3(sb3);
  const bad=path.join(tmp,'notes.txt');fs.writeFileSync(bad,'hello');
  const browser=await chromium.launch({headless:true,executablePath:edge});
  try{
    /* 學生 */
    const sc=await browser.newContext({viewport:{width:390,height:844}}),s=await sc.newPage();const errors=[];s.on('pageerror',e=>errors.push(e.message));
    await s.route('https://script.google.com/**',mock);await s.goto(url);
    await s.locator('#liAcc').fill('50101');await s.locator('#liPw').fill('pw');await s.locator('#liGo').click();
    await s.locator('[data-tab=upload]').click();
    assert.match(await s.locator('#tab-upload').innerText(),/貓咪隊（遊戲組）/);
    assert.equal(await s.locator('#wuUpload').isDisabled(),true);
    await s.locator('#wuFile').setInputFiles(bad);
    await s.locator('#wuResult').getByText('請選 .sb3 檔').waitFor();
    await s.locator('#wuFile').setInputFiles(sb3);
    await s.locator('#wuResult .wu-findings').waitFor();
    const found=await s.locator('#wuResult').innerText();
    assert.match(found,/送出「menu」，可是沒有人收到/);assert.match(found,/「HOME」是舊名稱/);assert.match(found,/還缺這些背景/);
    assert.equal(await s.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'no horizontal scroll on phone');
    await s.locator('#wuUpload').click();
    await s.locator('#wuDone').waitFor();
    assert.match(await s.locator('#wuDone').innerText(),/貓咪隊（遊戲組）\/2026-10-15\/091500_50101_1\.sb3/);
    assert.equal(uploads.length,1);const up=uploads[0];
    assert.equal(up.team,'貓咪隊');assert.equal(up.group,'game');assert.equal(up.credential.account,'50101');
    assert.equal(Buffer.from(up.base64,'base64').subarray(0,2).toString('hex'),'504b');
    assert.ok(up.summary.includes('event_broadcast'));assert.ok(up.checks.some(c=>c.level==='bug'));
    await s.waitForFunction(()=>document.querySelectorAll('#wuList .wu-item').length===1);
    assert.equal(analyzeCalls.length,0,'no AI call from the site');
    assert.equal(await s.locator('#wuList [data-wu-copy]').count(),0,'students have no copy-for-Claude');
    assert.equal(await s.locator('#wuList a[href*="drive.google.com"]').count(),0);
    assert.deepEqual(errors,[]);
    await s.screenshot({path:path.join(tmp,'student-upload.png'),fullPage:true});

    /* 老師 */
    const tc=await browser.newContext({viewport:{width:1280,height:900}});
    await tc.addInitScript(()=>{sessionStorage.setItem('catcup_teacher','teacher-test');
      localStorage.setItem('catcup_v1',JSON.stringify({profile:{team:'貓咪隊',group:'game'}}));});
    const t=await tc.newPage();t.on('pageerror',e=>errors.push(e.message));
    await t.route('https://script.google.com/**',mock);await t.goto(url);
    await t.locator('[data-tab=upload]').click();
    await t.locator('#wuList [data-wu-copy]').waitFor();
    assert.ok(await t.locator('#wuList a[href="https://drive.google.com/file/d/abc"]').count()>=1);
    assert.equal(await t.locator('#wuList a[href="https://drive.google.com/file/d/sum/view"]').count(),1);
    const text=await t.evaluate(()=>wuClaudeText(wuItems[0]));
    for(const re of [/請幫我找這份 Scratch 作品的 bug/,/隊名：貓咪隊｜組別：國小遊戲 AI 互動組/,/091500_50101_1\.sb3/,/open → menu → 1說明/,/\[要修\] .*送出「menu」，可是沒有人收到/,/給國小學生的修改指令/])assert.match(text,re);
    await t.locator('#wuTeam').selectOption('狗狗隊');
    await t.waitForFunction(()=>true);await t.waitForTimeout(200);
    assert.equal(listCalls.at(-1).payload.team,'狗狗隊');
    await t.locator('#wuTeam').selectOption('');await t.locator('#wuList [data-wu-copy]').waitFor();
    t.on('dialog',d=>d.accept());await t.locator('#wuList [data-wu-copy]').first().click();await t.waitForTimeout(300);
    assert.equal(analyzeCalls.length,0);
    assert.deepEqual(errors,[]);
    await t.screenshot({path:path.join(tmp,'teacher-upload.png'),fullPage:true});
    console.log('Work upload UI: student check/upload/list, teacher Drive/copy-for-Claude/filter and phone layout passed');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
