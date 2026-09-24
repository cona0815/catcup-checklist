const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');

const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
if(!fs.existsSync(edge)){console.log('Edge unavailable; resource UI test skipped');process.exit(0);}
const url='file:///'+path.resolve(__dirname,'..','index.html').replace(/\\/g,'/');
let items=[{id:'site-1',kind:'site',title:'原有網站',url:'https://example.com',imageUrl:''}],serial=1,uploads=0;
async function mock(route){
  const input=JSON.parse(route.request().postData()||'{}');let result={ok:true,data:{}};
  if(input.action==='getResourceData')result.data={items};
  if(input.action==='saveResource'){
    const x=input.payload,item={id:x.id||'resource-'+(++serial),kind:x.kind,title:x.title,url:x.url,imageUrl:x.imageUrl||''};
    items=x.id?items.map(old=>old.id===x.id?item:old):[...items,item];result.data={item};
  }
  if(input.action==='deleteResource'){items=items.filter(x=>x.id!==input.payload.id);result.data={deleted:true};}
  if(input.action==='uploadResourceImage'){uploads++;result.data={imageFileId:'file-1234567890',imageUrl:'https://example.com/image.jpg'};}
  await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(result)});
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:edge});
  try{
    const context=await browser.newContext();
    await context.addInitScript(()=>sessionStorage.setItem('catcup_teacher','teacher-test'));
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://script.google.com/**',mock);await page.goto(url);
    await page.locator('[data-tab=sites]').click();
    await page.locator('#tab-sites [data-resource-id=site-1]').waitFor();
    let form=page.locator('#tab-sites [data-resource-form=site]');
    await form.locator('[name=title]').fill('新教學網站');
    await form.locator('[name=url]').fill('https://example.com/new');
    await form.getByRole('button',{name:'儲存資源'}).click();
    await page.locator('#tab-sites [data-resource-id=resource-2]').waitFor();
    await page.locator('#tab-sites [data-resource-edit=resource-2]').click();
    form=page.locator('#tab-sites [data-resource-form=site]');
    await form.locator('[name=title]').fill('修改後網站');
    await form.getByRole('button',{name:'儲存資源'}).click();
    assert.equal(items.find(x=>x.id==='resource-2').title,'修改後網站');
    page.on('dialog',dialog=>dialog.accept());
    await page.locator('#tab-sites [data-resource-delete=resource-2]').click();
    assert.equal(items.some(x=>x.id==='resource-2'),false);
    await page.locator('[data-tab=code]').click();
    const codeForm=page.locator('#tab-code [data-resource-form=code]');
    await codeForm.locator('[name=title]').fill('角色移動');
    await codeForm.locator('[name=url]').fill('https://example.com/code');
    const png=await page.screenshot();
    await codeForm.locator('[name=image]').setInputFiles({name:'sample.png',mimeType:'image/png',buffer:png});
    await codeForm.getByRole('button',{name:'儲存資源'}).click();
    await page.locator('#tab-code [data-resource-id=resource-3]').waitFor();
    assert.equal(uploads,1);assert.equal(items.find(x=>x.id==='resource-3').imageUrl,'https://example.com/image.jpg');
    assert.deepEqual(errors,[]);await context.close();
    console.log('Resource website CRUD and code image upload UI tests passed');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
