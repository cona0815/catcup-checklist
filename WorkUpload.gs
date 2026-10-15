/* WorkUpload.gs v1.0（2026-10-15）
   貓咪盃作品上傳＋AI 找 bug。增量檔：貼進正式 GAS 專案成為新檔案，不要覆蓋原本的 程式碼.gs。
   依賴正式 GAS 既有函式：ok_、err_、now_、isTeacher_、rows_；以及 WorkBoard.gs 的 wbSheet_、wbRows_、wbAuthorized_。
   正式 程式碼.gs 的 doPost 需新增三個路由（保留其他路由）：
     uploadWork   → uploadWork_(payload,password)
     listWorks    → listWorks_(payload,password)
     analyzeWork  → analyzeWork_(payload,password)
   指令碼屬性：
     GEMINI_API_KEY（必填才有 AI 檢查；不要寫進網站程式）
     GEMINI_MODEL（選填，預設 gemini-3.8-flash；要更省可改 gemini-3.5-flash-lite）
     CATCUP_UPLOAD_FOLDER_ID（選填；第一次上傳自動建立「貓咪盃作品上傳」資料夾並記下）
   Drive 結構：貓咪盃作品上傳／隊名（遊戲組|動畫組）／yyyy-MM-dd／HHmmss_帳號_原檔名.sb3
   檔名都加時間，不會蓋掉舊檔。檔案只有 GAS 擁有者（老師）看得到。 */

var WU_HEAD_=['id','time','team','group','account','name','fileName','fileId','fileUrl','folder','size',
  'checks','summaryFileId','aiStatus','aiReport','aiModel','aiTime'];
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
    size:Number(row.size)||0,checks:checks,aiStatus:String(row.aiStatus||'')};
  if(teacher){out.fileUrl=String(row.fileUrl||'');out.aiReport=String(row.aiReport||'');
    out.aiModel=String(row.aiModel||'');out.aiTime=String(row.aiTime||'');}
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
      var sf=wuChild_(dayFolder,'_AI摘要').createFile(finalName.replace(/\.sb3$/,'')+'_摘要.txt',summary,MimeType.PLAIN_TEXT);
      summaryId=sf.getId();
    }
  }finally{lock.releaseLock();}

  var id=Utilities.getUuid(),checks=wuChecks_(payload.checks),folderPath=teamFolderName+'/'+day+'/'+file.getName();
  wuSheet_().appendRow([id,now_(),team,group,account,name,file.getName(),file.getId(),file.getUrl(),folderPath,bytes.length,
    JSON.stringify(checks),summaryId,'','','','']);
  return ok_({item:wuPublic_({id:id,time:now_(),team:team,group:group,account:account,name:name,fileName:file.getName(),
    folder:folderPath,size:bytes.length,checks:JSON.stringify(checks),aiStatus:''},false)});
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

function analyzeWork_(payload,password){
  var teacher=isTeacher_(password),id=String(payload.id||'');
  var row=wuRows_().filter(function(r){return String(r.id)===id;})[0];
  if(!row)return err_('找不到這筆上傳');
  if(!teacher){
    if(!wbAuthorized_({team:row.team,group:row.group,credential:payload.credential},password))return err_('沒有權限');
    if(String(row.aiStatus||''))return ok_({aiStatus:String(row.aiStatus)}); /* 學生只能觸發第一次 */
  }
  var key=PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  var sh=wuSheet_(),col=function(name){return WU_HEAD_.indexOf(name)+1;};
  if(!key){sh.getRange(row._row,col('aiStatus')).setValue('未設定 GEMINI_API_KEY');return err_('老師尚未設定 GEMINI_API_KEY');}
  var summary='';
  try{summary=row.summaryFileId?DriveApp.getFileById(String(row.summaryFileId)).getBlob().getDataAsString('UTF-8'):'';}catch(e){}
  if(!summary)return err_('這筆上傳沒有程式摘要，請重新上傳');
  sh.getRange(row._row,col('aiStatus')).setValue('檢查中');
  var model=PropertiesService.getScriptProperties().getProperty('GEMINI_MODEL')||'gemini-3.8-flash';
  var result=wuGemini_(key,model,row,summary);
  var status=result.ok?'完成':'失敗：'+result.error;
  sh.getRange(row._row,col('aiStatus'),1,4).setValues([[status,String(result.text||'').slice(0,40000),model,now_()]]);
  if(!result.ok)return err_('AI 檢查失敗：'+result.error);
  return ok_({aiStatus:status,aiReport:teacher?result.text:'',aiModel:model});
}

function wuPrompt_(row,summary){
  var checks='';try{checks=JSON.parse(row.checks||'[]').map(function(c){return '- ['+c.level+'] '+c.where+'：'+c.text;}).join('\n');}catch(e){}
  return [
    '你是國小 Scratch 競賽指導老師的助教。請找出下面這份學生作品的 bug，寫給老師看。',
    '組別：'+(row.group==='game'?'國小遊戲 AI 互動組':'國小動畫 AI 互動組')+'；隊名：'+row.team+'；檔名：'+row.fileName,
    '',
    '本校規則（遊戲組）：背景和廣播訊息同名，依序 open → menu → 1說明 → 1遊戲 → 1完成 → 2說明 → 2遊戲 → 2完成 → 成果。',
    '綠旗先到 open；menu 可選第一關或第二關；任務達成自動廣播 1完成／2完成（沒有「按完成」按鈕、不用分數門檻）；',
    '只有 1說明、2說明 有「回關卡選擇」送 menu；完成頁可再玩或下一步；成果的從頭再玩送 open。',
    '1.sb3 是一號（首頁、選單、第一關、正式舞台程式）；2.sb3 是二號（第二關與成果頁，舞台程式只是臨時測試）；完成.sb3 是合併後作品。',
    'PAGE、L1_RUN／L2_RUN、完成狀態、分數與時間要用「適用於所有角色」的變數。換頁要隱藏上一頁角色；再玩要重設角色、道具、分身與變數。',
    '動畫組沒有關卡選擇，依各組自己的流程判斷，不要硬套遊戲組名稱。',
    '',
    '網站的自動檢查已找到：',checks||'（沒有）',
    '',
    '下面是 project.json 轉成的程式摘要（Scratch 3 opcode；縮排表示包在 C 形積木裡）：',
    summary,
    '',
    '請用繁體中文、純文字回答，格式：',
    '【一句話總結】',
    '【確定的 bug】最多 8 項，每項：位置（角色→哪段程式）／問題／怎麼修（一句話一個動作）。',
    '【要按按看才能確定】可能的問題，說明怎麼測。',
    '【給學生的修改指令】3 到 5 句，國小學生看得懂，一句話一個動作，積木用中文名稱。',
    '只根據摘要裡真的有的積木判斷，不要編造不存在的角色或程式；自動檢查已列的項目可以合併說明，不必重複。'
  ].join('\n');
}
function wuGemini_(key,model,row,summary){
  var url='https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent';
  var body={contents:[{role:'user',parts:[{text:wuPrompt_(row,summary)}]}],
    generationConfig:{temperature:0.2,maxOutputTokens:4096}};
  try{
    var res=UrlFetchApp.fetch(url,{method:'post',contentType:'application/json',headers:{'x-goog-api-key':key},
      payload:JSON.stringify(body),muteHttpExceptions:true});
    var code=res.getResponseCode(),json={};try{json=JSON.parse(res.getContentText());}catch(e){}
    if(code!==200)return {ok:false,error:'HTTP '+code+' '+String(json.error&&json.error.message||'').slice(0,200)};
    var parts=(((json.candidates||[])[0]||{}).content||{}).parts||[];
    var text=parts.map(function(p){return p.text||'';}).join('').trim();
    return text?{ok:true,text:text}:{ok:false,error:'AI 沒有回覆內容'};
  }catch(e){return {ok:false,error:String(e).slice(0,200)};}
}

/* 在編輯器手動執行一次：授權 Drive 與外部連線，並確認設定 */
function testWorkUpload(){
  var root=wuRoot_();wuSheet_();
  Logger.log('上傳資料夾：'+root.getName()+' '+root.getUrl());
  Logger.log('GEMINI_API_KEY：'+(PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY')?'已設定':'未設定'));
  UrlFetchApp.fetch('https://generativelanguage.googleapis.com/',{muteHttpExceptions:true});
  Logger.log('外部連線授權完成');
}
