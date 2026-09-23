/**
 * v1.2 增量擴充：貓咪盃專用工作分配與必做功能編輯。
 * 加入現有試算表綁定的 GAS 專案；不要覆蓋原有 Code.gs。
 * Code.gs 的 doGet/doPost default 分支需加入下方 README 所示的三個路由。
 */
function workSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(headers); sh.setFrozenRows(1); }
  return sh;
}
function workRows_(name, headers) {
  var sh = workSheet_(name, headers), values = sh.getDataRange().getValues(), result=[];
  for (var i=1;i<values.length;i++) {
    if (values[i].join('')==='') continue;
    var row={_row:i+1};
    headers.forEach(function(header,j){row[header]=values[i][j];});
    result.push(row);
  }
  return result;
}
function workConfig_() {
  var rows=workRows_('feature_config',['group','json','updated']), out={};
  rows.forEach(function(row){try{out[row.group]=JSON.parse(row.json||'{}');}catch(ex){}});
  return out;
}
function workBoard_(team,group) {
  var row=workRows_('work_boards',['team','group','json','updated']).filter(function(r){return r.team===team&&r.group===group;})[0];
  if (!row) return {order:[],assignments:{}};
  try{return JSON.parse(row.json||'{}');}catch(ex){return {order:[],assignments:{}};}
}
function getWorkData_(p, teacherPassword) {
  var team=String(p.team||'').trim(), group=p.group==='game'?'game':'anim';
  if (!team) return err_('缺少 team');
  if (!workAuthorize_(p,teacherPassword)) return err_('需由同隊學生或教師驗證');
  var roster=rows_('students').filter(function(student){
    return String(student.team||'').trim()===team && student.enabled!==false && String(student.enabled).toLowerCase()!=='false';
  }).map(function(student){return {account:String(student.account),name:String(student.name||''),team:team,group:student.group};});
  return ok_({featureConfig:workConfig_(),roster:roster,board:workBoard_(team,group)});
}
function workAuthorize_(payload,teacherPassword) {
  if (isTeacher_(teacherPassword)) return true;
  var credential=payload.credential||{};
  var found=rows_('students').filter(function(student){
    return String(student.account).trim().toLowerCase()===String(credential.account||'').trim().toLowerCase() &&
      String(student.password)===String(credential.password||'') &&
      String(student.team||'').trim()===String(payload.team||'').trim() &&
      student.enabled!==false && String(student.enabled).toLowerCase()!=='false';
  });
  return found.length>0;
}
function saveWorkBoard_(payload,teacherPassword) {
  var team=String(payload.team||'').trim(), group=payload.group==='game'?'game':'anim';
  if(!team||!workAuthorize_(payload,teacherPassword)) return err_('需由同隊學生或教師驗證');
  var board=payload.board||{}, base=group==='game'?'G':'A';
  var validId=function(id){return new RegExp('^'+base+'\\d{2}$').test(String(id));};
  var order=Array.isArray(board.order)?board.order.filter(validId):[];
  if(order.length!==new Set(order).size) return err_('項目順序不可重複');
  var roster=rows_('students').filter(function(student){return String(student.team||'').trim()===team;});
  var accounts=roster.map(function(student){return String(student.account);});
  var assignments={};
  Object.keys(board.assignments||{}).forEach(function(id){
    var account=String(board.assignments[id]||'');
    if(validId(id)&&(!account||accounts.indexOf(account)>=0)) assignments[id]=account;
  });
  var clean={order:order,assignments:assignments};
  var sh=workSheet_('work_boards',['team','group','json','updated']);
  var old=workRows_('work_boards',['team','group','json','updated']).filter(function(row){return row.team===team&&row.group===group;})[0];
  var values=[team,group,JSON.stringify(clean),now_()];
  if(old) sh.getRange(old._row,1,1,4).setValues([values]); else sh.appendRow(values);
  return ok_({saved:true,board:clean});
}
function saveFeatureConfig_(payload,teacherPassword) {
  if(!isTeacher_(teacherPassword)) return err_('需要教師密碼');
  var group=payload.group==='game'?'game':'anim', config=payload.config||{}, base=group==='game'?'G':'A';
  var validId=function(id){return new RegExp('^'+base+'\\d{2}$').test(String(id));};
  var order=Array.isArray(config.order)?config.order.filter(validId):[];
  if(order.length!==new Set(order).size) return err_('項目順序不可重複');
  var items={};
  Object.keys(config.items||{}).forEach(function(id){
    if(!validId(id))return;
    var item=config.items[id]||{};
    var name=String(item.name||'').trim(),cond=String(item.cond||'').trim(),pri=Number(item.pri);
    if(name&&cond&&name.length<=100&&cond.length<=500&&[1,2,3].indexOf(pri)>=0) items[id]={name:name,cond:cond,pri:pri};
  });
  var clean={order:order,items:items};
  var sh=workSheet_('feature_config',['group','json','updated']);
  var old=workRows_('feature_config',['group','json','updated']).filter(function(row){return row.group===group;})[0];
  var values=[group,JSON.stringify(clean),now_()];
  if(old) sh.getRange(old._row,1,1,3).setValues([values]); else sh.appendRow(values);
  return ok_({saved:true,config:clean});
}
