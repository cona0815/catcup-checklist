/* WorkUpload.gs v1.1（2026-10-15）
   貓咪盃作品上傳＋自動檢查紀錄（AI 找 bug 由老師下載檔案後交給 Claude，不在 GAS 呼叫 AI）。增量檔：貼進正式 GAS 專案成為新檔案，不要覆蓋原本的 程式碼.gs。
   依賴正式 GAS 既有函式：ok_、err_、now_、isTeacher_、rows_；以及 WorkBoard.gs 的 wbSheet_、wbRows_、wbAuthorized_。
   正式 程式碼.gs 的 doPost 需新增兩個路由（保留其他路由）：
     uploadWork   → uploadWork_(payload,password)
     listWorks    → listWorks_(payload,password)
   指令碼屬性：
     CATCUP_UPLOAD_FOLDER_ID（選填；第一次上傳自動建立「貓咪盃作品上傳」資料夾並記下）
   Drive 結構：貓咪盃作品上傳／隊名（遊戲組|動畫組）／yyyy-MM-dd／HHmmss_帳號_原檔名.sb3
   檔名都加時間，不會蓋掉舊檔。檔案只有 GAS 擁有者（老師）看得到。 */

var WU_HEAD_=['id','time','team','group','account','name','fileName','fileId','fileUrl','folder','size',
  'checks','summaryFileId'];
var WU_MAX_BYTES_=15*1024*1024;
var WU_TZ_='Asia/Taipei';

function wuSheet_(){return wbSheet_('work_uploads',WU_HEAD_);}
function wuRows_(){return wbRows_('work_uploads',WU_HEAD_);}
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
function wuChecks_(value){
  var list=Array.isArray(value)?value:[];
  return list.slice(0,80).map(function(item){
    return {level:['bug','warn','tip'].indexOf(item&&item.level)>=0?item.level:'tip',
      where:String(item&&item.where||'').slice(0,80),text:String(item&&item.text||'').slice(0,240)};
  });
}
function wuPublic_(row,teacher){
  var checks=[];try{checks=JSON.parse(row.checks||'[]');}catch(e){}
  var out={id:String(row.id),time:String(row.time),team:String(row.team),group:String(row.group),
    account:String(row.account),name:String(row.name||''),fileName:String(row.fileName),folder:String(row.folder),
    size:Number(row.size)||0,checks:checks};
  if(teacher){out.fileUrl=String(row.fileUrl||'');
    out.summaryUrl=row.summaryFileId?'https://drive.google.com/file/d/'+String(row.summaryFileId)+'/view':'';}
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
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  var dayFolder,file,summaryId='';
  try{
    dayFolder=wuChild_(wuChild_(wuRoot_(),teamFolderName),day);
    var base=hms+'_'+wuSafe_(account,20)+'_'+wuSafe_(fileName.replace(/\.sb3$/i,''),40),finalName=base+'.sb3',n=2;
    while(dayFolder.getFilesByName(finalName).hasNext())finalName=base+'_'+(n++)+'.sb3';
    file=dayFolder.createFile(Utilities.newBlob(bytes,'application/x.scratch.sb3',finalName));
    var summary=String(payload.summary||'').slice(0,100000);
    if(summary){
      var sf=wuChild_(dayFolder,'_程式摘要').createFile(finalName.replace(/\.sb3$/,'')+'_摘要.txt',summary,MimeType.PLAIN_TEXT);
      summaryId=sf.getId();
    }
  }finally{lock.releaseLock();}

  var id=Utilities.getUuid(),checks=wuChecks_(payload.checks),folderPath=teamFolderName+'/'+day+'/'+file.getName();
  wuSheet_().appendRow([id,now_(),team,group,account,name,file.getName(),file.getId(),file.getUrl(),folderPath,bytes.length,
    JSON.stringify(checks),summaryId]);
  return ok_({item:wuPublic_({id:id,time:now_(),team:team,group:group,account:account,name:name,fileName:file.getName(),
    folder:folderPath,size:bytes.length,checks:JSON.stringify(checks)},false)});
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

/* 在編輯器手動執行一次：授權 Drive，建立上傳資料夾與 work_uploads 分頁 */
function testWorkUpload(){
  var root=wuRoot_();wuSheet_();
  Logger.log('上傳資料夾：'+root.getName()+' '+root.getUrl());
}
