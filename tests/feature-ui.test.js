const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');

const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
if(!fs.existsSync(edge)){console.log('Edge unavailable; browser UI test skipped');process.exit(0);}
const url='file:///'+path.resolve(__dirname,'..','index.html').replace(/\\/g,'/');
let config={},board={assignments:{},notes:{}},patches=[];
const roster=[
  {account:'50101',name:'甲同學',team:'TeamA',group:'anim'},
  {account:'50102',name:'乙同學',team:'TeamA',group:'anim'}
];
function mock(route){
  const request=route.request();let action=new URL(request.url()).searchParams.get('action');
  let input={};if(request.method()==='POST'){input=JSON.parse(request.postData()||'{}');action=input.action;}
  let result={ok:true,data:{}};
  if(action==='getAll')result.data={progress:[],mocks:[],links:[]};
  if(action==='listStudents')result.data=roster;
  if(action==='verifyTeacher')result.data={teacher:true};
  if(action==='login'){
    const account=input.payload?.account||'50101';
    result.data={account,name:account==='50102'?'乙同學':'甲同學',team:'TeamA',group:'anim'};
  }
  if(action==='getWorkData')result.data={featureConfig:{anim:config},roster,board};
  if(action==='saveFeatureConfig'){config=input.payload.config;result.data={saved:true,config};}
  if(action==='saveWorkBoard'){
    const patch=input.payload.patch;patches.push(patch);
    board={assignments:{...board.assignments,...patch.assignments},notes:{...board.notes,...patch.notes}};
    result.data={saved:true,board};
  }
  return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(result)});
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:edge});
  try{
    const teacher=await browser.newContext();
    await teacher.addInitScript(()=>{
      sessionStorage.setItem('catcup_teacher','teacher-test');
      localStorage.setItem('catcup_v1',JSON.stringify({profile:{team:'TeamA',group:'anim'}}));
    });
    const page=await teacher.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://script.google.com/**',mock);await page.goto(url);
    await page.locator('[data-tab=feat]').click();
    assert.deepEqual(await page.evaluate(()=>feats().slice(0,4).map(x=>[x.id,featureDisplayId(x.id)])),
      [['A13','A1'],['A14','A2'],['A15','A3'],['A12','A4']]);
    assert.deepEqual(await page.evaluate(()=>feats().map(x=>x.id)),
      ['A13','A14','A15','A12','A01','A02','A03','A08','A09','A04','A05','A06','A10']);
    assert.equal(await page.locator('[data-feature-move=A13]').count(),0);
    assert.equal(await page.locator('[data-feature-move=A12]').count(),0);
    assert.equal(await page.locator('[data-feature-name=A13]:visible').count(),0);
    await page.locator('[data-feature-id=A13] summary').click();
    assert.equal(await page.locator('[data-feature-name=A13]:visible').count(),1);
    await page.locator('#group').selectOption('game');
    assert.deepEqual(await page.evaluate(()=>feats().slice(0,4).map(x=>[x.id,featureDisplayId(x.id)])),
      [['G15','G1'],['G16','G2'],['G17','G3'],['G14','G4']]);
    assert.deepEqual(await page.evaluate(()=>feats().map(x=>x.id)),
      ['G15','G16','G17','G14','G01','G02','G03','G04','G05','G07','G10','G08','G09','G11']);
    await page.locator('#group').selectOption('anim');
    assert.equal(await page.locator('[data-f=A13]').count(),1);
    await page.locator('#newFeatureName').fill('新增功能');
    await page.locator('#newFeatureCond').fill('完成測試作品');
    await page.locator('[data-feature-add]').click();
    await page.locator('[data-feature-id=A16] summary').click();
    await page.locator('[data-feature-name=A16]').waitFor();
    assert(config.added.includes('A16'));
    await page.locator('[data-feature-link-title=A16]').fill('參考網站');
    await page.locator('[data-feature-link-url=A16]').fill('https://example.com/lesson');
    await page.locator('[data-feature-link-add=A16]').click();
    assert.equal(config.items.A16.links[0].title,'參考網站');
    page.on('dialog',dialog=>dialog.accept());
    await page.locator('[data-feature-id=A16] summary').click();
    await page.locator('[data-feature-delete=A16]').click();
    assert(config.hidden.includes('A16'));
    await page.locator('[data-feature-restore=A16]').click();
    assert(!config.hidden.includes('A16'));
    await page.locator('[data-tab=work]').click();
    await page.locator('[data-assign=A16]').waitFor();
    assert.equal(await page.locator('[data-assign=A16]').isEnabled(),true);
    assert.match(await page.locator('#workStatus').innerText(),/老師可分配、改派/);
    await page.locator('[data-assign=A16]').selectOption('50101');
    await page.locator('[data-work-note=A16]').fill('老師調整分工');
    await page.locator('[data-work-note=A16]').blur();
    assert(patches.some(p=>p.assignments?.A16==='50101'));
    assert(patches.some(p=>p.notes?.A16==='老師調整分工'));
    assert.equal(errors.length,0,errors.join('\n'));
    await teacher.close();

    const student=await browser.newContext();
    const sp=await student.newPage();const studentErrors=[];sp.on('pageerror',e=>studentErrors.push(e.message));
    await sp.route('https://script.google.com/**',mock);await sp.goto(url);
    await sp.locator('#liAcc').fill('50101');await sp.locator('#liPw').fill('student-test');
    await sp.locator('#liGo').click();await sp.locator('[data-tab=work]').click();
    await sp.locator('[data-assign=A16]').waitFor();
    assert.equal(await sp.locator('[data-work-move]').count(),0);
    assert.equal(await sp.locator('[data-feature-add]:visible').count(),0);
    await sp.locator('[data-assign=A16]').selectOption('50102');
    await sp.locator('[data-assign=A16]').selectOption('__all__');
    await sp.locator('[data-work-note=A16]').fill('我先做角色');
    await sp.locator('[data-work-note=A16]').blur();
    assert(patches.some(p=>p.assignments?.A16==='50102'));
    assert(patches.some(p=>p.assignments?.A16==='__all__'));
    assert(patches.some(p=>p.notes?.A16==='我先做角色'));
    assert.equal(studentErrors.length,0,studentErrors.join('\n'));
    await student.close();
    const second=await browser.newContext();
    const other=await second.newPage();
    await other.route('https://script.google.com/**',mock);await other.goto(url);
    await other.locator('#liAcc').fill('50102');await other.locator('#liPw').fill('student-b');
    await other.locator('#liGo').click();await other.locator('[data-tab=work]').click();
    await other.locator('[data-assign=A16]').waitFor();
    assert.equal(await other.locator('[data-assign=A16]').isDisabled(),true);
    assert.equal(await other.locator('[data-work-note=A16]').isEnabled(),true);
    await second.close();
    console.log('Teacher add/link/delete/restore and student assignment/note UI tests passed');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
