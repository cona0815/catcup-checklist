/* WorkUpload.gs v1.6（2026-10-16）
   貓咪盃作品上傳＋老師建議 PDF 回傳。
   流程：學生上傳 .sb3 → 老師下載後交給 Claude 產出建議 PDF → 老師把 PDF 傳回該筆紀錄 → 同隊學生登入後看建議。增量檔：貼進正式 GAS 專案成為新檔案，不要覆蓋原本的 程式碼.gs。
   依賴正式 GAS 既有函式：ok_、err_、now_、isTeacher_、rows_；以及 WorkBoard.gs 的 wbSheet_、wbRows_、wbAuthorized_。
   正式 程式碼.gs 的 doPost 需有四個路由（保留其他路由）：
     uploadWork     → uploadWork_(payload,password)
     listWorks      → listWorks_(payload,password)
     uploadFeedback → uploadFeedback_(payload,password)   （v1.4 新增，僅老師）
     getFeedback    → getFeedback_(payload,password)      （v1.4 新增，老師或同隊學生）
   指令碼屬性：
     CATCUP_UPLOAD_FOLDER_ID（選填；第一次上傳自動建立「貓咪盃作品上傳」資料夾並記下）
   Drive 結構：貓咪盃作品上傳／隊名（遊戲組|動畫組）／yyyy-MM-dd／HHmmss_隊名_姓名_原檔名.sb3（沒有姓名時用帳號）
   建議 PDF 存在同一天資料夾：建議_回覆日期_原上傳檔名.pdf（v1.5 自動加日期；同一天重傳加 _2，舊的保留）。
   檔案都不公開分享；學生透過網站登入後由 GAS 讀出 PDF。 */

var WU_HEAD_=['id','time','team','group','account','name','fileName','fileId','fileUrl','folder','size',
  'feedbackFileId','feedbackName','feedbackTime','feedbackSeen'];
var WU_PDF_MAX_=10*1024*1024;
var WU_MAX_BYTES_=15*1024*1024;
var WU_TZ_='Asia/Taipei';

function wuSheet_(){
  var sh=wbSheet_('work_uploads',WU_HEAD_),head=sh.getRange(1,1,1,WU_HEAD_.length);
  var cur=head.getValues()[0];
  if(cur.join('|')!==WU_HEAD_.join('|'))head.setValues([WU_HEAD_]); /* v1.3 舊表自動補新欄位標題 */
  return sh;
}
function wuRows_(){wuSheet_();return wbRows_('work_uploads',WU_HEAD_);}
function wuRow_(id){return wuRows_().filter(function(r){return String(r.id)===String(id||'');})[0];}
function wuCol_(name){return WU_HEAD_.indexOf(name)+1;}
function wuSafe_(text,max){
  return String(text||'').replace(/[\\\/:*?"<>|\u0000-\u001f]/g,'_').replace(/\s+/g,' ').trim().slice(0,max||60)||'未命名';
}
function wuChild_(parent,name){
  var it=parent.getFoldersByName(name);
  return it.hasNext()?it.next():parent.createFolder(name);
}
function wuRoot_(){
  var props=PropertiesService.getScriptProperties(),id=props.getProperty('CATCUP_UPLOAD_FOLDER_ID');
  if(id){try{return DriveApp.getFolderById(id);}catch(e){}}
  var folder=DriveApp.createFolder('貓咪盃作品上傳');
  props.setProperty('CATCUP_UPLOAD_FOLDER_ID',folder.getId());
  return folder;
}
function wuPublic_(row,teacher){
  var out={id:String(row.id),time:String(row.time),team:String(row.team),group:String(row.group),
    account:String(row.account),name:String(row.name||''),fileName:String(row.fileName),folder:String(row.folder),
    size:Number(row.size)||0,hasFeedback:!!row.feedbackFileId,feedbackTime:String(row.feedbackTime||''),
    feedbackSeen:String(row.feedbackSeen||'')};
  if(teacher){out.fileUrl=String(row.fileUrl||'');out.feedbackName=String(row.feedbackName||'');}
  return out;
}

function uploadWork_(payload,password){
  var teacher=isTeacher_(password);
  if(!teacher&&!wbAuthorized_(payload,password))return err_('請先用同隊的學生帳號登入');
  var team=String(payload.team||'').trim(),group=payload.group==='game'?'game':'anim';
  var fileName=String(payload.fileName||'').trim(),data=String(payload.base64||'');
  if(!team)return err_('缺少隊名');
  if(!/\.sb3$/i.test(fileName))return err_('只能上傳 .sb3 檔');
  if(!data||!/^[A-Za-z0-9+/=]+$/.test(data)||data.length>Math.ceil(WU_MAX_BYTES_/3)*4+8)return err_('檔案太大或格式錯誤（上限 15 MB）');
  var bytes=Utilities.base64Decode(data);
  if(bytes.length>WU_MAX_BYTES_)return err_('檔案超過 15 MB');
  if(!(bytes[0]===0x50&&bytes[1]===0x4b))return err_('這不是 .sb3 檔');

  var credential=payload.credential||{},account=teacher?'teacher':String(credential.account||'').trim();
  var student=teacher?null:rows_('students').filter(function(s){
    return String(s.account).trim().toLowerCase()===account.toLowerCase();})[0];
  var name=teacher?'老師':String(student&&student.name||'');
  var nowDate=new Date(),day=Utilities.formatDate(nowDate,WU_TZ_,'yyyy-MM-dd'),hms=Utilities.formatDate(nowDate,WU_TZ_,'HHmmss');
  var teamFolderName=wuSafe_(team,40)+'（'+(group==='game'?'遊戲組':'動畫組')+'）';
  var lock=LockService.getDocumentLock()||LockService.getScriptLock();lock.waitLock(20000); /* 與 doPost 的 ScriptLock 分開，避免重複上鎖 */
  var dayFolder,file;
  try{
    dayFolder=wuChild_(wuChild_(wuRoot_(),teamFolderName),day);
    var base=hms+'_'+wuSafe_(team,20)+'_'+wuSafe_(name||account,20)+'_'+wuSafe_(fileName.replace(/\.sb3$/i,''),40),finalName=base+'.sb3',n=2;
    while(dayFolder.getFilesByName(finalName).hasNext())finalName=base+'_'+(n++)+'.sb3';
    file=dayFolder.createFile(Utilities.newBlob(bytes,'application/x.scratch.sb3',finalName));
  }finally{lock.releaseLock();}

  var id=Utilities.getUuid(),folderPath=teamFolderName+'/'+day+'/'+file.getName();
  wuSheet_().appendRow([id,now_(),team,group,account,name,file.getName(),file.getId(),file.getUrl(),folderPath,bytes.length]);
  return ok_({item:wuPublic_({id:id,time:now_(),team:team,group:group,account:account,name:name,fileName:file.getName(),
    folder:folderPath,size:bytes.length},false)});
}

function listWorks_(payload,password){
  var teacher=isTeacher_(password);
  var team=String(payload.team||'').trim(),group=payload.group==='game'?'game':payload.group==='anim'?'anim':'';
  if(!teacher){
    if(!wbAuthorized_(payload,password))return err_('請先用同隊的學生帳號登入');
    group=payload.group==='game'?'game':'anim';
  }
  var rows=wuRows_().filter(function(row){
    return (!team||String(row.team)===team)&&(!group||String(row.group)===group);
  }).reverse().slice(0,teacher?300:50);
  return ok_({items:rows.map(function(row){return wuPublic_(row,teacher);})});
}

function uploadFeedback_(payload,password){
  if(!isTeacher_(password))return err_('需要教師密碼');
  var row=wuRow_(payload.id);if(!row)return err_('找不到這筆上傳');
  var data=String(payload.base64||'');
  if(!data||!/^[A-Za-z0-9+/=]+$/.test(data)||data.length>Math.ceil(WU_PDF_MAX_/3)*4+8)return err_('請選小於 10 MB 的 PDF');
  var bytes=Utilities.base64Decode(data);
  if(bytes.length>WU_PDF_MAX_)return err_('PDF 超過 10 MB');
  if(!(bytes[0]===0x25&&bytes[1]===0x50&&bytes[2]===0x44&&bytes[3]===0x46))return err_('這不是 PDF 檔');
  var folder;
  try{var parents=DriveApp.getFileById(String(row.fileId)).getParents();folder=parents.hasNext()?parents.next():wuRoot_();}
  catch(e){folder=wuRoot_();}
  var day=Utilities.formatDate(new Date(),WU_TZ_,'yyyy-MM-dd');
  var base='建議_'+day+'_'+String(row.fileName).replace(/\.sb3$/i,''),name=base+'.pdf',n=2;
  while(folder.getFilesByName(name).hasNext())name=base+'_'+(n++)+'.pdf';
  var file=folder.createFile(Utilities.newBlob(bytes,'application/pdf',name));
  wuSheet_().getRange(row._row,wuCol_('feedbackFileId'),1,4).setValues([[file.getId(),name,now_(),'']]);
  return ok_({id:String(row.id),feedbackName:name,feedbackTime:now_()});
}

function getFeedback_(payload,password){
  var teacher=isTeacher_(password),row=wuRow_(payload.id);
  if(!row)return err_('找不到這筆上傳');
  if(!teacher&&!wbAuthorized_({team:row.team,group:row.group,credential:payload.credential},password))return err_('沒有權限');
  if(!row.feedbackFileId)return err_('老師還沒有上傳建議');
  var blob;
  try{blob=DriveApp.getFileById(String(row.feedbackFileId)).getBlob();}catch(e){return err_('找不到建議檔案，請老師重新上傳');}
  if(!teacher&&!row.feedbackSeen)wuSheet_().getRange(row._row,wuCol_('feedbackSeen')).setValue(now_());
  return ok_({name:String(row.feedbackName||'建議.pdf'),base64:Utilities.base64Encode(blob.getBytes())});
}

/* 在編輯器手動執行一次：授權 Drive，建立上傳資料夾與 work_uploads 分頁 */
function testWorkUpload(){
  var root=wuRoot_();wuSheet_();
  Logger.log('上傳資料夾：'+root.getName()+' '+root.getUrl());
}
