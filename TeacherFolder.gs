/* TeacherFolder.gs v1.1（2026-10-16）
   貓咪盃「老師資料夾」：老師在 Google Drive 放講義、範例、素材，學生登入網站後可以瀏覽、下載。
   增量檔：貼進正式 GAS 專案成為新檔案，不要覆蓋原本的 程式碼.gs。
   依賴正式 GAS 既有函式：ok_、err_、isTeacher_、rows_。
   正式 程式碼.gs 的 doPost 需加三個路由（保留其他路由）：
     listTeacherFiles → listTeacherFiles_(payload,password)   （老師或任一已登入學生）
     getTeacherFile   → getTeacherFile_(payload,password)     （老師或任一已登入學生）
     teacherFileOp    → teacherFileOp_(payload,password)      （僅老師：mkdir／upload／rename／move／delete）
   指令碼屬性：
     CATCUP_TEACHER_FOLDER_ID（選填；第一次使用自動建立「貓咪盃老師資料夾」並記下。
       也可以填自己現有的 Drive 資料夾 ID，網站就顯示那個資料夾）
   安全：
     ・資料夾與檔案都不公開分享；學生的下載由 GAS 讀出檔案再傳給網站。
     ・每個動作都檢查目標在老師資料夾裡面，網站無法讀寫外面的 Drive 檔案。
     ・刪除＝移到 Drive 垃圾桶（30 天內可在 Drive 還原），不會永久刪除。 */

var TF_MAX_BYTES_=20*1024*1024;
var TF_MAX_DEPTH_=30;

function tfRoot_(){
  var props=PropertiesService.getScriptProperties(),id=props.getProperty('CATCUP_TEACHER_FOLDER_ID');
  if(id){try{var f=DriveApp.getFolderById(id);if(!f.isTrashed())return f;}catch(e){}}
  var folder=DriveApp.createFolder('貓咪盃老師資料夾');
  props.setProperty('CATCUP_TEACHER_FOLDER_ID',folder.getId());
  return folder;
}
/* 任一啟用中的學生帳號（不限隊伍）或老師 */
function tfReader_(payload,password){
  if(isTeacher_(password))return true;
  var c=(payload&&payload.credential)||{},acc=String(c.account||'').trim().toLowerCase();
  if(!acc)return false;
  return rows_('students').some(function(s){
    return String(s.account).trim().toLowerCase()===acc&&String(s.password)===String(c.password||'')&&
      s.enabled!==false&&String(s.enabled).toLowerCase()!=='false';
  });
}
function tfSafeName_(text){
  return String(text||'').replace(/[\\\/:*?"<>|\u0000-\u001f]/g,'_').replace(/\s+/g,' ').trim().slice(0,100);
}
/* 從 item 往上找，回傳到根目錄的路徑（不含 item 本身）；不在根目錄裡面回傳 null */
function tfPathTo_(item,root){
  var rootId=root.getId(),chain=[],cur=item;
  for(var d=0;d<TF_MAX_DEPTH_;d++){
    var parents=cur.getParents();
    if(!parents.hasNext())return null;
    var p=parents.next();
    if(p.isTrashed&&p.isTrashed())return null;
    chain.unshift(p);
    if(p.getId()===rootId)return chain;
    cur=p;
  }
  return null;
}
function tfFolder_(id,root){
  if(!id||String(id)===root.getId())return {folder:root,path:[]};
  var f;try{f=DriveApp.getFolderById(String(id));}catch(e){return null;}
  if(f.isTrashed())return null;
  var path=tfPathTo_(f,root);
  return path?{folder:f,path:path}:null;
}
function tfFile_(id,root){
  var f;try{f=DriveApp.getFileById(String(id||''));}catch(e){return null;}
  if(!f||f.isTrashed())return null;
  return tfPathTo_(f,root)?f:null;
}
function tfTime_(d){
  try{return Utilities.formatDate(d,'Asia/Taipei','yyyy-MM-dd HH:mm');}catch(e){return '';}
}
function tfUniqueName_(folder,name,isFolder){
  var dot=isFolder?-1:name.lastIndexOf('.'),base=dot>0?name.slice(0,dot):name,ext=dot>0?name.slice(dot):'',out=name,n=2;
  var exists=function(x){return (isFolder?folder.getFoldersByName(x):folder.getFilesByName(x)).hasNext();};
  while(exists(out))out=base+' ('+(n++)+')'+ext;
  return out;
}
function tfAllFolders_(root){
  var out=[],walk=function(folder,label,depth){
    if(depth>TF_MAX_DEPTH_)return;
    var it=folder.getFolders(),kids=[];
    while(it.hasNext()){var f=it.next();if(!f.isTrashed())kids.push(f);}
    kids.sort(function(a,b){return a.getName().localeCompare(b.getName());});
    kids.forEach(function(f){var l=label+' / '+f.getName();out.push({id:f.getId(),path:l});walk(f,l,depth+1);});
  };
  walk(root,'老師資料夾',0);
  return out;
}

function listTeacherFiles_(payload,password){
  payload=payload||{};
  if(!tfReader_(payload,password))return err_('請先登入');
  var teacher=isTeacher_(password),root=tfRoot_(),hit=tfFolder_(payload.folderId,root);
  if(!hit)return err_('找不到這個資料夾');
  var folder=hit.folder,folders=[],files=[];
  var fi=folder.getFolders();
  while(fi.hasNext()){var d=fi.next();if(!d.isTrashed())folders.push({id:d.getId(),name:d.getName(),updated:tfTime_(d.getLastUpdated())});}
  var it=folder.getFiles();
  while(it.hasNext()){var f=it.next();if(f.isTrashed())continue;
    var row={id:f.getId(),name:f.getName(),size:f.getSize(),mime:f.getMimeType(),updated:tfTime_(f.getLastUpdated())};
    if(teacher)row.url=f.getUrl();
    files.push(row);}
  var byName=function(a,b){return a.name.localeCompare(b.name);};
  folders.sort(byName);files.sort(byName);
  var data={folder:{id:folder.getId(),name:hit.path.length?folder.getName():'老師資料夾'},
    path:[{id:root.getId(),name:'老師資料夾'}].concat(hit.path.slice(1).map(function(p){return {id:p.getId(),name:p.getName()};})).concat(hit.path.length?[{id:folder.getId(),name:folder.getName()}]:[]),
    folders:folders,files:files};
  if(teacher){data.rootUrl=root.getUrl();if(payload.tree)data.tree=[{id:root.getId(),path:'老師資料夾'}].concat(tfAllFolders_(root));}
  return ok_(data);
}

function getTeacherFile_(payload,password){
  payload=payload||{};
  if(!tfReader_(payload,password))return err_('請先登入');
  var file=tfFile_(payload.id,tfRoot_());
  if(!file)return err_('找不到這個檔案');
  var mime=file.getMimeType(),name=file.getName(),blob;
  if(/^application\/vnd\.google-apps\./.test(mime)){
    try{blob=file.getAs('application/pdf');name=name.replace(/\.pdf$/i,'')+'.pdf';mime='application/pdf';}
    catch(e){return err_('這種 Google 檔案不能下載，請老師改放 PDF');}
  }else blob=file.getBlob();
  var bytes=blob.getBytes();
  if(bytes.length>TF_MAX_BYTES_)return err_('檔案超過 20 MB，請老師分開放');
  return ok_({name:name,mime:mime,base64:Utilities.base64Encode(bytes)});
}

function teacherFileOp_(payload,password){
  payload=payload||{};
  if(!isTeacher_(password))return err_('只有老師可以管理檔案');
  var op=String(payload.op||''),root=tfRoot_(),lock=LockService.getDocumentLock()||LockService.getScriptLock(); /* 與 doPost 的 ScriptLock 分開 */
  lock.waitLock(20000);
  try{
    if(op==='mkdir'){
      var parent=tfFolder_(payload.parentId,root),name=tfSafeName_(payload.name);
      if(!parent)return err_('找不到要放的資料夾');
      if(!name)return err_('請輸入資料夾名稱');
      var made=parent.folder.createFolder(tfUniqueName_(parent.folder,name,true));
      return ok_({id:made.getId(),name:made.getName()});
    }
    if(op==='upload'){
      var target=tfFolder_(payload.parentId,root),fname=tfSafeName_(payload.fileName),data=String(payload.base64||'');
      if(!target)return err_('找不到要放的資料夾');
      if(!fname)return err_('缺少檔名');
      if(!/^[A-Za-z0-9+/=]*$/.test(data)||data.length>Math.ceil(TF_MAX_BYTES_/3)*4+8)return err_('檔案太大或格式錯誤（上限 20 MB）');
      var bytes=Utilities.base64Decode(data);
      if(bytes.length>TF_MAX_BYTES_)return err_('檔案超過 20 MB');
      var mime=String(payload.mime||'')||'application/octet-stream';
      var file=target.folder.createFile(Utilities.newBlob(bytes,mime,tfUniqueName_(target.folder,fname,false)));
      return ok_({id:file.getId(),name:file.getName()});
    }
    var isFolder=payload.kind==='folder',item;
    if(isFolder){
      if(!payload.id||String(payload.id)===root.getId())return err_('老師資料夾本身不能改');
      var h=tfFolder_(payload.id,root);item=h&&h.folder;
    }else item=tfFile_(payload.id,root);
    if(!item)return err_('找不到這個項目');
    if(op==='rename'){
      var newName=tfSafeName_(payload.name);
      if(!newName)return err_('請輸入新名稱');
      item.setName(newName);
      return ok_({id:item.getId(),name:item.getName()});
    }
    if(op==='move'){
      var dest=tfFolder_(payload.targetId,root);
      if(!dest)return err_('找不到目的資料夾');
      if(isFolder){
        if(dest.folder.getId()===item.getId()||dest.path.some(function(p){return p.getId()===item.getId();}))
          return err_('不能把資料夾移到它自己裡面');
      }
      item.moveTo(dest.folder);
      return ok_({id:item.getId(),name:item.getName(),targetId:dest.folder.getId()});
    }
    if(op==='delete'){
      item.setTrashed(true);
      return ok_({id:item.getId(),name:item.getName(),trashed:true});
    }
    return err_('不認識的動作');
  }finally{lock.releaseLock();}
}

/* 安裝後在編輯器選這個函式按「執行」一次：完成 Drive 授權並建立資料夾，執行紀錄會顯示資料夾網址 */
function testTeacherFolder(){
  var root=tfRoot_();
  Logger.log('老師資料夾：'+root.getName()+' '+root.getUrl());
}
