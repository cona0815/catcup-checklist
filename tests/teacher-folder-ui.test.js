/* 老師資料夾分頁：學生只能看／下載；老師新資料夾、上傳、改名、移動、刪除；手機寬度。GAS 以假資料模擬。 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');

const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
if(!fs.existsSync(edge)){console.log('Edge unavailable; teacher folder UI test skipped');process.exit(0);}
const url='file:///'+path.resolve(__dirname,'..','index.html').replace(/\\/g,'/');
/* 假 Drive：root 底下有「講義」資料夾和一個 PDF */
let n=0;const store=new Map([['root',{id:'root',kind:'folder',name:'老師資料夾',parent:null}]]);
const add=(kind,name,parent,extra={})=>{const id=kind[0]+(++n);store.set(id,{id,kind,name,parent,...extra});return id;};
const notes=add('folder','講義','root');add('file','規則說明.pdf','root',{data:'%PDF-1.4',mime:'application/pdf'});
add('file','去海邊.sb3',notes,{data:'PK',mime:'application/x.scratch.sb3'});
const calls=[];
function pathOf(id){const out=[];let c=store.get(id);while(c){out.unshift({id:c.id,name:c.name});c=store.get(c.parent);}return out;}
function mock(route){
  const req=route.request();let action=new URL(req.url()).searchParams.get('action'),input={};
  if(req.method()==='POST'){input=JSON.parse(req.postData()||'{}');action=input.action;}
  calls.push(input);
  let result={ok:true,data:{}};const p=input.payload||{},teacher=input.password==='teacher-test';
  const reader=teacher||p.credential?.account==='50101';
  if(action==='getAll')result.data={progress:[],mocks:[],links:[]};
  if(action==='login')result.data={account:'50101',name:'王小明',team:'貓咪隊',group:'game'};
  if(action==='listWorks')result.data={items:[]};
  if(action==='listStudents')result.data=[];
  if(action==='verifyTeacher')result.data={teacher:true};
  if(action==='listTeacherFiles'){
    if(!reader)result={ok:false,error:'請先登入'};
    else{const id=p.folderId||'root',kids=[...store.values()].filter(x=>x.parent===id);
      result.data={folder:{id,name:store.get(id).name},path:pathOf(id),
        folders:kids.filter(x=>x.kind==='folder').map(x=>({id:x.id,name:x.name,updated:'2026-10-16 08:00'})),
        files:kids.filter(x=>x.kind==='file').map(x=>({id:x.id,name:x.name,size:x.data.length,mime:x.mime,updated:'2026-10-16 08:00',...(teacher?{url:'https://drive/'+x.id}:{})}))};
      if(teacher){result.data.rootUrl='https://drive.google.com/drive/folders/root';
        if(p.tree)result.data.tree=[...store.values()].filter(x=>x.kind==='folder').map(x=>({id:x.id,path:pathOf(x.id).map(y=>y.name).join(' / ')}));}}
  }
  if(action==='getTeacherFile'){const f=store.get(p.id);
    result=reader&&f?{ok:true,data:{name:f.name,mime:f.mime,base64:Buffer.from(f.data).toString('base64')}}:{ok:false,error:'找不到'};}
  if(action==='teacherFileOp'){
    if(!teacher)result={ok:false,error:'只有老師可以管理檔案'};
    else if(p.op==='mkdir'){const id=add('folder',p.name,p.parentId||'root');result.data={id,name:p.name};}
    else if(p.op==='upload'){const id=add('file',p.fileName,p.parentId||'root',{data:Buffer.from(p.base64,'base64').toString(),mime:p.mime});result.data={id,name:p.fileName};}
    else if(p.op==='rename'){store.get(p.id).name=p.name;result.data={id:p.id,name:p.name};}
    else if(p.op==='move'){store.get(p.id).parent=p.targetId;result.data={id:p.id};}
    else if(p.op==='delete'){store.delete(p.id);result.data={id:p.id,trashed:true};}
  }
  return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(result)});
}
(async()=>{
  const tmp=path.join(require('node:os').tmpdir(),'tf-test');fs.mkdirSync(tmp,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:edge});
  const errors=[];
  try{
    /* 訪客：要先登入 */
    const gc=await browser.newContext(),g=await gc.newPage();g.on('pageerror',e=>errors.push(e.message));
    await g.route('https://script.google.com/**',mock);await g.goto(url);
    await g.locator('#liGuest').click();await g.locator('[data-tab=tfold]').click();
    await g.locator('#tfNeedLogin').waitFor();
    assert.equal(calls.filter(c=>c.action==='listTeacherFiles').length,0);

    /* 學生：瀏覽、進資料夾、麵包屑、下載；沒有管理按鈕 */
    const sc=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true}),s=await sc.newPage();s.on('pageerror',e=>errors.push(e.message));
    await s.route('https://script.google.com/**',mock);await s.goto(url);
    await s.locator('#liAcc').fill('50101');await s.locator('#liPw').fill('pw');await s.locator('#liGo').click();
    await s.locator('[data-tab=tfold]').click();
    await s.locator('#tfList .tf-row').nth(1).waitFor();
    assert.deepEqual(await s.locator('#tfList .tf-name').allInnerTexts(),['講義','規則說明.pdf'],'folders first');
    assert.equal(await s.locator('#tfMkdir').count(),0);assert.equal(await s.locator('[data-tf-op]').count(),0);
    assert.equal(calls.filter(c=>c.action==='listTeacherFiles').at(-1).payload.credential.account,'50101');
    await s.locator('#tfList [data-tf-go]').first().click();
    await s.locator('#tfList').getByText('去海邊.sb3').waitFor();
    assert.match(await s.locator('.tf-crumbs').innerText(),/老師資料夾\s*›\s*講義/);
    const dl=s.waitForEvent('download');await s.locator('[data-tf-dl]').click();const file=await dl;
    assert.equal(fs.readFileSync(await file.path(),'utf8'),'PK');
    await s.locator('.tf-crumbs button').first().click();
    await s.locator('#tfList').getByText('規則說明.pdf').waitFor();
    assert.equal(await s.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'no horizontal scroll on phone');
    await s.screenshot({path:path.join(tmp,'student-folder.png'),fullPage:true});

    /* 老師：新資料夾、上傳、改名、移動、刪除 */
    const tc=await browser.newContext({viewport:{width:1280,height:900}});
    await tc.addInitScript(()=>{sessionStorage.setItem('catcup_teacher','teacher-test');
      localStorage.setItem('catcup_v1',JSON.stringify({profile:{team:'貓咪隊',group:'game'}}));});
    const t=await tc.newPage();t.on('pageerror',e=>errors.push(e.message));
    await t.route('https://script.google.com/**',mock);await t.goto(url);
    const answers=[];t.on('dialog',d=>d.type()==='confirm'?d.accept():d.accept(answers.shift()));
    await t.locator('[data-tab=tfold]').click();await t.locator('#tfMkdir').waitFor();
    assert.ok(await t.locator('a[href="https://drive.google.com/drive/folders/root"]').count());
    answers.push('第一週');await t.locator('#tfMkdir').click();
    await t.locator('#tfList').getByText('第一週').waitFor();
    const up=path.join(tmp,'week1.sb3');fs.writeFileSync(up,'PKweek');
    await t.locator('#tfUpload').setInputFiles(up);
    await t.locator('#tfList').getByText('week1.sb3').waitFor();
    const upCall=calls.filter(c=>c.payload?.op==='upload').at(-1);
    assert.equal(upCall.password,'teacher-test');assert.equal(upCall.payload.parentId,'root');assert.equal(Buffer.from(upCall.payload.base64,'base64').toString(),'PKweek');
    answers.push('第一週範例.sb3');
    await t.locator('.tf-row',{hasText:'week1.sb3'}).locator('[data-tf-op=rename]').click();
    await t.locator('#tfList').getByText('第一週範例.sb3').waitFor();
    await t.locator('.tf-row',{hasText:'第一週範例.sb3'}).locator('[data-tf-op=move]').click();
    await t.locator('#tfMove[open]').waitFor();
    const opts=await t.locator('#tfMoveTo option').allInnerTexts();
    assert.ok(!opts.includes('老師資料夾'),'current folder not offered');
    await t.locator('#tfMoveTo').selectOption({label:'老師資料夾 / 第一週'});await t.locator('#tfMoveOk').click();
    await t.waitForFunction(()=>![...document.querySelectorAll('#tfList .tf-name')].some(x=>x.textContent==='第一週範例.sb3'));
    assert.equal(calls.filter(c=>c.payload?.op==='move').at(-1).payload.kind,'file');
    /* 移動資料夾時，不能選自己 */
    await t.locator('.tf-row',{hasText:'講義'}).locator('[data-tf-op=move]').click();await t.locator('#tfMove[open]').waitFor();
    assert.ok(!(await t.locator('#tfMoveTo option').allInnerTexts()).some(x=>/講義/.test(x)));
    await t.locator('#tfMove button[value=cancel]').click();
    await t.locator('.tf-row',{hasText:'規則說明.pdf'}).locator('[data-tf-op=delete]').click();
    await t.waitForFunction(()=>![...document.querySelectorAll('#tfList .tf-name')].some(x=>x.textContent==='規則說明.pdf'));
    await t.locator('.tf-row',{hasText:'第一週'}).locator('[data-tf-go]').click();
    await t.locator('#tfList').getByText('第一週範例.sb3').waitFor();
    await t.screenshot({path:path.join(tmp,'teacher-folder.png'),fullPage:true});
    assert.deepEqual(errors,[]);
    console.log('Teacher folder UI: guest blocked, student browse/download read-only, teacher mkdir/upload/rename/move/delete, phone layout passed');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
