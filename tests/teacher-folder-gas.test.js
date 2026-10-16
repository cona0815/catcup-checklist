/* TeacherFolder.gs 後端單元測試：假的 Drive，不連正式 GAS。 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

let serial=0;const props={};const items=new Map();
function iter(list){let i=0;return {hasNext:()=>i<list.length,next:()=>list[i++]};}
function node(kind,name,parent,extra={}){
  const n={kind,name,parent,trashed:false,id:(kind==='folder'?'fd-':'fl-')+(++serial),...extra,
    getId(){return this.id;},getName(){return this.name;},setName(v){this.name=v;return this;},
    isTrashed(){return this.trashed;},setTrashed(v){this.trashed=v;return this;},
    getParents(){return iter(this.parent?[this.parent]:[]);},moveTo(f){this.parent=f;return this;},
    getUrl(){return 'https://drive/'+this.id;},getLastUpdated(){return new Date(0);}};
  if(kind==='folder')Object.assign(n,{
    kids(k){return [...items.values()].filter(x=>x.parent===this&&x.kind===k);},
    getFolders(){return iter(this.kids('folder'));},getFiles(){return iter(this.kids('file'));},
    getFoldersByName(x){return iter(this.kids('folder').filter(f=>f.name===x&&!f.trashed));},
    getFilesByName(x){return iter(this.kids('file').filter(f=>f.name===x&&!f.trashed));},
    createFolder(x){return node('folder',x,this);},
    createFile(blob){return node('file',blob.name,this,{bytes:blob.bytes,mime:blob.mime});}});
  else Object.assign(n,{getSize(){return this.bytes.length;},getMimeType(){return this.mime;},
    getBlob(){const b=this.bytes;return {getBytes:()=>b};},
    getAs(m){if(this.mime==='application/vnd.google-apps.form')throw new Error('no');return {getBytes:()=>[37,80,68,70]};}});
  items.set(n.id,n);return n;
}
const outside=node('folder','我的私人資料',null);const secret=outside.createFile({name:'secret.txt',bytes:[1,2],mime:'text/plain'});
const students=[{account:'50101',password:'pw1',team:'貓咪隊',group:'game',enabled:true},{account:'50301',password:'pw3',team:'鳥隊',group:'anim',enabled:'FALSE'}];
const ctx=vm.createContext({
  DriveApp:{createFolder:n=>node('folder',n,null),getFolderById:id=>{const f=items.get(id);if(!f||f.kind!=='folder')throw new Error('no');return f;},
    getFileById:id=>{const f=items.get(id);if(!f||f.kind!=='file')throw new Error('no');return f;}},
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]||null,setProperty:(k,v)=>{props[k]=v;}})},
  LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
  Utilities:{base64Decode:v=>Array.from(Buffer.from(v,'base64')),base64Encode:b=>Buffer.from(b).toString('base64'),
    newBlob:(bytes,mime,name)=>({bytes,mime,name}),formatDate:()=>'2026-10-16 08:00'},
  rows_:n=>n==='students'?students:[],isTeacher_:p=>p==='teacher-test',ok_:data=>({ok:true,data}),err_:error=>({ok:false,error}),
  JSON,Object,String,Number,Array,RegExp,Math,Date
});
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','TeacherFolder.gs'),'utf8'),ctx);
const T='teacher-test',stu={credential:{account:'50101',password:'pw1'}};
const b64=s=>Buffer.from(s).toString('base64');

/* 權限：未登入、密碼錯、停用帳號都不能看；任何隊的學生都能看 */
assert.equal(ctx.listTeacherFiles_({},'').ok,false);
assert.equal(ctx.listTeacherFiles_({credential:{account:'50101',password:'x'}},'').ok,false);
assert.equal(ctx.listTeacherFiles_({credential:{account:'50301',password:'pw3'}},'').ok,false,'disabled account');
let r=ctx.listTeacherFiles_(stu,'');assert.equal(r.ok,true,r.error);
const root=items.get(props.CATCUP_TEACHER_FOLDER_ID);assert.equal(root.name,'貓咪盃老師資料夾');
assert.deepEqual([...r.data.path.map(p=>p.name)],['老師資料夾']);assert.equal(r.data.rootUrl,undefined);

/* 學生不能管理 */
for(const op of ['mkdir','upload','rename','move','delete'])assert.equal(ctx.teacherFileOp_({op,parentId:root.id,name:'x'},'').ok,false);

/* 老師：建資料夾（同名自動加編號）、上傳、改名 */
r=ctx.teacherFileOp_({op:'mkdir',name:'講義'},T);assert.equal(r.ok,true);const notes=items.get(r.data.id);
assert.equal(ctx.teacherFileOp_({op:'mkdir',name:'講義'},T).data.name,'講義 (2)');
assert.equal(ctx.teacherFileOp_({op:'mkdir',name:'  '},T).ok,false);
r=ctx.teacherFileOp_({op:'mkdir',parentId:notes.id,name:'第一週/練習'},T);assert.equal(r.data.name,'第一週_練習');const week=items.get(r.data.id);
r=ctx.teacherFileOp_({op:'upload',parentId:week.id,fileName:'範例.sb3',base64:b64('PK zip'),mime:'application/x.scratch.sb3'},T);assert.equal(r.ok,true);const ex=items.get(r.data.id);
assert.equal(ctx.teacherFileOp_({op:'upload',parentId:week.id,fileName:'範例.sb3',base64:b64('PK2')},T).data.name,'範例 (2).sb3','no overwrite');
assert.equal(ctx.teacherFileOp_({op:'upload',parentId:outside.id,fileName:'a.txt',base64:b64('x')},T).ok,false,'cannot write outside');
r=ctx.teacherFileOp_({op:'rename',id:ex.id,kind:'file',name:'去海邊.sb3'},T);assert.equal(r.ok,true);assert.equal(ex.name,'去海邊.sb3');
assert.equal(ctx.teacherFileOp_({op:'rename',id:root.id,kind:'folder',name:'x'},T).ok,false,'root fixed');

/* 列表：路徑、排序、老師有連結；學生沒有 */
r=ctx.listTeacherFiles_({...stu,folderId:week.id},'');assert.equal(r.ok,true);
assert.deepEqual([...r.data.path.map(p=>p.name)],['老師資料夾','講義','第一週_練習']);
assert.deepEqual([...r.data.files.map(f=>f.name)],['去海邊.sb3','範例 (2).sb3']);assert.equal(r.data.files[0].url,undefined);
r=ctx.listTeacherFiles_({folderId:root.id,tree:true},T);assert.ok(r.data.files.length===0&&r.data.folders.length===2);
assert.deepEqual([...r.data.tree.map(x=>x.path)],['老師資料夾','老師資料夾 / 講義','老師資料夾 / 講義 / 第一週_練習','老師資料夾 / 講義 (2)']);
assert.equal(ctx.listTeacherFiles_({...stu,folderId:outside.id},'').ok,false,'cannot browse outside');

/* 下載：學生可以，外面的檔不行，Google 文件轉 PDF */
r=ctx.getTeacherFile_({...stu,id:ex.id},'');assert.equal(r.ok,true);assert.equal(Buffer.from(r.data.base64,'base64').toString(),'PK zip');assert.equal(r.data.name,'去海邊.sb3');
assert.equal(ctx.getTeacherFile_({...stu,id:secret.id},'').ok,false);
assert.equal(ctx.getTeacherFile_({id:ex.id},'').ok,false);
const doc=week.createFile({name:'說明',bytes:[],mime:'application/vnd.google-apps.document'});
r=ctx.getTeacherFile_({...stu,id:doc.id},'');assert.equal(r.data.name,'說明.pdf');assert.equal(r.data.mime,'application/pdf');

/* 移動：檔案搬家；資料夾不能搬進自己裡面；不能搬到外面 */
r=ctx.teacherFileOp_({op:'move',id:ex.id,kind:'file',targetId:root.id},T);assert.equal(r.ok,true);assert.equal(ex.parent,root);
assert.equal(ctx.teacherFileOp_({op:'move',id:notes.id,kind:'folder',targetId:week.id},T).ok,false);
assert.equal(ctx.teacherFileOp_({op:'move',id:notes.id,kind:'folder',targetId:notes.id},T).ok,false);
assert.equal(ctx.teacherFileOp_({op:'move',id:ex.id,kind:'file',targetId:outside.id},T).ok,false);
assert.equal(ctx.teacherFileOp_({op:'move',id:secret.id,kind:'file',targetId:root.id},T).ok,false,'cannot pull outside file in');

/* 刪除＝垃圾桶，清單不再顯示 */
r=ctx.teacherFileOp_({op:'delete',id:ex.id,kind:'file'},T);assert.equal(r.ok,true);assert.equal(ex.trashed,true);
assert.equal(ctx.listTeacherFiles_(stu,'').data.files.length,0);
assert.equal(ctx.getTeacherFile_({...stu,id:ex.id},'').ok,false);
r=ctx.teacherFileOp_({op:'delete',id:notes.id,kind:'folder'},T);assert.equal(r.ok,true);
assert.equal(ctx.listTeacherFiles_({...stu,folderId:week.id},'').ok,false,'inside a trashed folder');
assert.deepEqual([...ctx.listTeacherFiles_(stu,'').data.folders.map(f=>f.name)],['講義 (2)']);
console.log('Teacher folder: permissions, containment, mkdir/upload/rename/move/delete(trash), listing and download tests passed');
