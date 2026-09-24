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
  if(action==='login')result.data={account:'50101',name:'甲同學',team:'TeamA',group:'anim'};
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
    await page.locator('#newFeatureName').fill('新增功能');
    await page.locator('#newFeatureCond').fill('完成測試作品');
    await page.locator('[data-feature-add]').click();
    await page.locator('[data-feature-name=A16]').waitFor();
    assert(config.added.includes('A16'));
    await page.locator('[data-feature-link-title=A16]').fill('參考網站');
    await page.locator('[data-feature-link-url=A16]').fill('https://example.com/lesson');
    await page.locator('[data-feature-link-add=A16]').click();
    assert.equal(config.items.A16.links[0].title,'參考網站');
    page.on('dialog',dialog=>dialog.accept());
    await page.locator('[data-feature-delete=A16]').click();
    assert(config.hidden.includes('A16'));
    await page.locator('[data-feature-restore=A16]').click();
    assert(!config.hidden.includes('A16'));
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
    await sp.locator('[data-work-note=A16]').fill('我先做角色');
    await sp.locator('[data-work-note=A16]').blur();
    assert(patches.some(p=>p.assignments?.A16==='50102'));
    assert(patches.some(p=>p.notes?.A16==='我先做角色'));
    assert.equal(studentErrors.length,0,studentErrors.join('\n'));
    await student.close();
    console.log('Teacher add/link/delete/restore and student assignment/note UI tests passed');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
