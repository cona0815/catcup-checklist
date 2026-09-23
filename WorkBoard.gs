/* 貓咪盃工作分配與教師必做功能設定。只擴充原 GAS，不更動 Code.gs 的帳號路由。 */
function wbSheet_(name,head){
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sh=ss.getSheetByName(name);
  if(!sh){sh=ss.insertSheet(name);sh.appendRow(head);sh.setFrozenRows(1);}
  return sh;
}
function wbRows_(name,head){
  var values=wbSheet_(name,head).getDataRange().getValues(),out=[];
  for(var i=1;i<values.length;i++){
    if(values[i].join('')==='')continue;
    var row={_row:i+1};head.forEach(function(key,j){row[key]=values[i][j];});out.push(row);
  }
  return out;
}
function wbRead_(name,head,key){
  var row=wbRows_(name,head).filter(function(x){
    return key.every(function(value,i){return x[head[i]]===value;});
  })[0];
  if(!row)return {};
  try{return JSON.parse(row.json||'{}');}catch(e){return {};}
}
function wbConfig_(){
  var out={};wbRows_('feature_config',['group','json','updated']).forEach(function(row){
    try{out[row.group]=JSON.parse(row.json||'{}');}catch(e){}
  });return out;
}
function wbSave_(name,head,key,obj){
  var sh=wbSheet_(name,head),old=wbRows_(name,head).filter(function(row){
    return key.every(function(value,i){return row[head[i]]===value;});
  })[0],values=key.concat([JSON.stringify(obj),now_()]);
  if(old)sh.getRange(old._row,1,1,values.length).setValues([values]);else sh.appendRow(values);
}
function wbBoard_(team,group){
  var board=wbRead_('work_boards',['team','group','json','updated'],[team,group]);
  return Object.keys(board).length?board:{order:[],assignments:{},notes:{}};
}
function wbAuthorized_(payload,password){
  if(isTeacher_(password))return true;
  var credential=payload.credential||{};
  return rows_('students').some(function(student){
    return String(student.account).trim().toLowerCase()===String(credential.account||'').trim().toLowerCase() &&
      String(student.password)===String(credential.password||'') &&
      String(student.team||'').trim()===String(payload.team||'').trim() &&
      String(student.group||'anim')===String(payload.group||'anim') &&
      student.enabled!==false && String(student.enabled).toLowerCase()!=='false';
  });
}
function getWorkData_(payload,password){
  var team=String(payload.team||'').trim(),group=payload.group==='game'?'game':'anim';
  if(!team)return err_('缺少 team');
  if(!wbAuthorized_(payload,password))return err_('需由同隊學生或教師驗證');
  var roster=rows_('students').filter(function(student){
    return String(student.team||'').trim()===team && student.enabled!==false && String(student.enabled).toLowerCase()!=='false';
  }).map(function(student){
    return {account:String(student.account),name:String(student.name||''),team:team,group:student.group};
  });
  return ok_({featureConfig:wbConfig_(),roster:roster,board:wbBoard_(team,group)});
}
function saveWorkBoard_(payload,password){
  var team=String(payload.team||'').trim(),group=payload.group==='game'?'game':'anim';
  if(!team||!wbAuthorized_(payload,password))return err_('需由同隊學生或教師驗證');
  var lock=LockService.getDocumentLock()||LockService.getScriptLock();
  lock.waitLock(10000);
  try{
    var old=wbBoard_(team,group),patch=payload.patch||null;
    var board=patch?{
      assignments:Object.assign({},old.assignments||{},patch.assignments||{}),
      notes:Object.assign({},old.notes||{},patch.notes||{})
    }:(payload.board||{});
    var prefix=group==='game'?'G':'A',valid=function(id){
      return new RegExp('^'+prefix+'[0-9]{2}$').test(String(id));
    };
    var accounts=rows_('students').filter(function(student){
      return String(student.team||'').trim()===team && student.enabled!==false && String(student.enabled).toLowerCase()!=='false';
    }).map(function(student){return String(student.account);});
    var assignments={};Object.keys(board.assignments||{}).forEach(function(id){
      var account=String(board.assignments[id]||'');
      if(valid(id)&&(!account||accounts.indexOf(account)>=0))assignments[id]=account;
    });
    var notes={};Object.keys(board.notes||{}).forEach(function(id){
      if(valid(id))notes[id]=String(board.notes[id]||'').slice(0,500);
    });
    // 舊順序保留作資料相容，但不接受學生或舊版頁面調整必做功能順序。
    var clean={order:Array.isArray(old.order)?old.order:[],assignments:assignments,notes:notes};
    wbSave_('work_boards',['team','group','json','updated'],[team,group],clean);
    return ok_({saved:true,board:clean});
  }finally{lock.releaseLock();}
}
function saveFeatureConfig_(payload,password){
  if(!isTeacher_(password))return err_('需要教師密碼');
  var group=payload.group==='game'?'game':'anim',config=payload.config||{};
  var prefix=group==='game'?'G':'A',first=group==='game'?'G14':'A12';
  var valid=function(id){return new RegExp('^'+prefix+'[0-9]{2}$').test(String(id));};
  var order=Array.isArray(config.order)?config.order.filter(valid):[];
  if(order.length!==new Set(order).size)return err_('項目順序重複');
  var added=Array.isArray(config.added)?config.added.filter(function(id){
    return valid(id)&&Number(id.slice(1))>(group==='game'?14:12);
  }):[];
  if(added.length!==new Set(added).size||added.length>80)return err_('新增項目代碼重複或過多');
  var hidden=Array.isArray(config.hidden)?config.hidden.filter(function(id){return valid(id)&&id!==first;}):[];
  if(hidden.length!==new Set(hidden).size)return err_('刪除項目代碼重複');
  var items={};Object.keys(config.items||{}).forEach(function(id){
    if(!valid(id))return;
    var item=config.items[id]||{},name=String(item.name||'').trim(),cond=String(item.cond||'').trim(),pri=Number(item.pri);
    if(!name||!cond||name.length>100||cond.length>500||[1,2,3].indexOf(pri)<0)return;
    var links=Array.isArray(item.links)?item.links.slice(0,10).map(function(link){
      var title=String(link.title||'').trim().slice(0,80),url=String(link.url||'').trim();
      return title&&/^https?:\/\//i.test(url)&&url.length<=2000?{title:title,url:url}:null;
    }).filter(Boolean):[];
    items[id]={name:name,cond:cond,pri:pri,links:links};
  });
  if(added.some(function(id){return !items[id];}))return err_('新增項目缺少名稱或完成條件');
  var clean={order:order,items:items,added:added,hidden:hidden};
  wbSave_('feature_config',['group','json','updated'],[group],clean);
  return ok_({saved:true,config:clean});
}
function testWorkBoard(){
  var pw=PropertiesService.getScriptProperties().getProperty('TEACHER_PASSWORD')||DEFAULT_TEACHER_PASSWORD;
  Logger.log(getWorkData_({team:'測試隊',group:'anim'},pw).getContent());
  Logger.log(getWorkData_({team:'測試隊',group:'anim'},'').getContent());
}
