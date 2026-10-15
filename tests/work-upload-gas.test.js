/* WorkUpload.gs 後端單元測試：以假的 Drive／試算表／Gemini 執行，不連正式 GAS。 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const sheets=new Map();let serial=0;const props={};let geminiCalls=[],geminiReply=200;
function sheet(name){
  if(!sheets.has(name))sheets.set(name,{rows:[],appendRow(row){this.rows.push(row.slice());},setFrozenRows(){},
    getDataRange(){return {getValues:()=>this.rows.map(r=>r.slice())};},
    getRange(row,col,nr=1,nc=1){const self=this;return {
      getValues(){return [0].map((_,i)=>{const r=self.rows[row-1+i]||[];return Array.from({length:nc},(_,j)=>r[col-1+j]??'');});},
      setValue(v){self.rows[row-1][col-1]=v;},
      setValues(values){values.forEach((vals,i)=>vals.forEach((v,j)=>{self.rows[row-1+i][col-1+j]=v;}));}};}});
  return sheets.get(name);
}
function makeFolder(name){
  const f={name,folders:[],files:[],id:'fd-'+(++serial),getId(){return this.id;},getName(){return this.name;},getUrl(){return 'https://drive/'+this.id;},
    getFoldersByName(n){const list=this.folders.filter(x=>x.name===n);let i=0;return {hasNext:()=>i<list.length,next:()=>list[i++]};},
    createFolder(n){const c=makeFolder(n);this.folders.push(c);allFolders.set(c.id,c);return c;},
    getFilesByName(n){const list=this.files.filter(x=>x.name===n);let i=0;return {hasNext:()=>i<list.length,next:()=>list[i++]};},
    createFile(a,content){const file=typeof a==='string'?{name:a,content}:{name:a.name,bytes:a.bytes,mime:a.mime};
      file.id='fl-'+(++serial);file.getId=()=>file.id;file.getName=()=>file.name;file.getUrl=()=>'https://drive/'+file.id;
      const parent=this;file.getParents=()=>{let d=false;return {hasNext:()=>!d,next:()=>{d=true;return parent;}};};
      file.getBytes=()=>file.bytes;
      file.getBlob=()=>({getDataAsString:()=>file.content,getBytes:()=>file.bytes});this.files.push(file);allFiles.set(file.id,file);return file;}};
  return f;
}
const allFolders=new Map(),allFiles=new Map();
const students=[{account:'50101',password:'pw1',name:'甲同學',team:'貓咪隊',group:'game',enabled:true},
  {account:'50201',password:'pw2',name:'丙同學',team:'狗狗隊',group:'game',enabled:true}];
const context=vm.createContext({
  SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:name=>sheets.get(name)||null,insertSheet:name=>sheet(name)})},
  DriveApp:{createFolder:n=>{const f=makeFolder(n);allFolders.set(f.id,f);return f;},getFolderById:id=>{if(!allFolders.has(id))throw new Error('gone');return allFolders.get(id);},
    getFileById:id=>allFiles.get(id)},
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]||null,setProperty:(k,v)=>{props[k]=v;}})},
  LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
  MimeType:{PLAIN_TEXT:'text/plain'},
  UrlFetchApp:{fetch:(url,opt)=>{geminiCalls.push({url,opt});const code=geminiReply;
    return {getResponseCode:()=>code,getContentText:()=>JSON.stringify(code===200?{candidates:[{content:{parts:[{text:'【一句話總結】menu 沒有人收到。'}]}}]}:{error:{message:'quota'}})};}},
  Utilities:{getUuid:()=> 'up-'+(++serial),base64Decode:v=>Array.from(Buffer.from(v,'base64')),base64Encode:b=>Buffer.from(b).toString('base64'),newBlob:(bytes,mime,name)=>({bytes,mime,name}),
    formatDate:(d,tz,f)=>f==='yyyy-MM-dd'?'2026-10-15':'091500'},
  rows_:name=>name==='students'?students:[],
  isTeacher_:p=>p==='teacher-test',ok_:data=>({ok:true,data}),err_:error=>({ok:false,error}),now_:()=> '2026-10-15 09:15:00',
  Set,JSON,Object,String,Number,Array,RegExp,Math,Date,Buffer
});
for(const f of ['WorkBoard.gs','WorkUpload.gs'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),context);

const sb3=Buffer.concat([Buffer.from([0x50,0x4b,3,4]),Buffer.from('fake zip')]).toString('base64');
const cred={account:'50101',password:'pw1'};
const base={team:'貓咪隊',group:'game',credential:cred,fileName:'1.sb3',base64:sb3};

/* 權限 */
assert.equal(context.uploadWork_({...base,credential:{account:'50101',password:'wrong'}},'').ok,false);
assert.equal(context.uploadWork_({...base,team:'狗狗隊'},'').ok,false,'cannot upload into another team');
assert.equal(context.uploadWork_({...base,fileName:'1.exe'},'').ok,false);
assert.equal(context.uploadWork_({...base,base64:Buffer.from('not zip').toString('base64')},'').ok,false);

/* 上傳兩次同名：資料夾依隊／日期，檔名不覆蓋 */
let r=context.uploadWork_(base,'');assert.equal(r.ok,true,r.error);
const first=r.data.item;assert.equal(first.folder,'貓咪隊（遊戲組）/2026-10-15/091500_貓咪隊_甲同學_1.sb3');
r=context.uploadWork_(base,'');assert.equal(r.ok,true);assert.equal(r.data.item.folder,'貓咪隊（遊戲組）/2026-10-15/091500_貓咪隊_甲同學_1_2.sb3');
const root=allFolders.get(props.CATCUP_UPLOAD_FOLDER_ID);assert.equal(root.name,'貓咪盃作品上傳');
const day=root.folders[0].folders[0];assert.equal(root.folders.length,1);assert.equal(day.name,'2026-10-15');
assert.equal(day.files.length,2);assert.equal(day.folders.length,0,'no extra summary folder');
assert.equal(first.name,'甲同學');

/* 清單：學生看自己隊、沒有 AI 報告與連結；老師看全部 */
let list=context.listWorks_({team:'貓咪隊',group:'game',credential:cred},'');
assert.equal(list.ok,true);assert.equal(list.data.items.length,2);assert.equal(list.data.items[0].aiReport,undefined);assert.equal(list.data.items[0].fileUrl,undefined);
assert.equal(context.listWorks_({team:'狗狗隊',group:'game',credential:cred},'').ok,false);
list=context.listWorks_({},'teacher-test');assert.equal(list.data.items.length,2);assert.ok(list.data.items[0].fileUrl);

assert.equal(typeof context.analyzeWork_,'undefined');
assert.equal(geminiCalls.length,0);
assert.equal(sheets.get('work_uploads').rows[0].length,15);
/* v1.3 舊表（11 欄標題）自動補新欄位 */
sheets.get('work_uploads').rows[0]=sheets.get('work_uploads').rows[0].slice(0,11);
context.listWorks_({},'teacher-test');
assert.equal(sheets.get('work_uploads').rows[0].length,15);assert.equal(sheets.get('work_uploads').rows[0][14],'feedbackSeen');

/* 老師上傳建議 PDF → 學生看得到、標記已讀 */
const pdf=Buffer.from('%PDF-1.4 test').toString('base64');
assert.equal(context.uploadFeedback_({id:first.id,base64:pdf},'').ok,false,'students cannot upload feedback');
assert.equal(context.uploadFeedback_({id:first.id,base64:Buffer.from('nope').toString('base64')},'teacher-test').ok,false);
r=context.uploadFeedback_({id:first.id,base64:pdf},'teacher-test');assert.equal(r.ok,true,r.error);
assert.equal(r.data.feedbackName,'建議_091500_貓咪隊_甲同學_1.pdf');
assert.ok(day.files.some(f=>f.name==='建議_091500_貓咪隊_甲同學_1.pdf'),'pdf stored next to the work');
r=context.uploadFeedback_({id:first.id,base64:pdf},'teacher-test');assert.equal(r.data.feedbackName,'建議_091500_貓咪隊_甲同學_1_2.pdf','re-upload keeps old');
let stu=context.listWorks_({team:'貓咪隊',group:'game',credential:cred},'').data.items.find(x=>x.id===first.id);
assert.equal(stu.hasFeedback,true);assert.equal(stu.feedbackSeen,'');assert.equal(stu.feedbackName,undefined);
assert.equal(context.getFeedback_({id:first.id,credential:{account:'50201',password:'pw2'}},'').ok,false,'other team blocked');
r=context.getFeedback_({id:first.id},'teacher-test');assert.equal(r.ok,true);
assert.equal(context.listWorks_({},'teacher-test').data.items.find(x=>x.id===first.id).feedbackSeen,'','teacher view does not mark seen');
r=context.getFeedback_({id:first.id,credential:cred},'');assert.equal(r.ok,true);
assert.equal(Buffer.from(r.data.base64,'base64').toString(),'%PDF-1.4 test');assert.equal(r.data.name,'建議_091500_貓咪隊_甲同學_1_2.pdf');
assert.equal(context.listWorks_({},'teacher-test').data.items.find(x=>x.id===first.id).feedbackSeen,'2026-10-15 09:15:00');
const other=context.listWorks_({},'teacher-test').data.items.find(x=>x.id!==first.id);
assert.equal(context.getFeedback_({id:other.id,credential:cred},'').ok,false,'no feedback yet');
console.log('Work upload: team/date folders, no overwrite, permissions, listing, feedback PDF upload/read and header migration tests passed');
