const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const sheets=new Map();
function sheet(name){
  if(!sheets.has(name))sheets.set(name,{rows:[],
    appendRow(row){this.rows.push(row);},setFrozenRows(){},
    getDataRange(){return {getValues:()=>this.rows};},
    getRange(index){return {setValues:values=>{this.rows[index-1]=values[0];}};}
  });
  return sheets.get(name);
}
const students=[
  {account:'50101',password:'student-a',team:'TeamA',group:'anim',name:'甲',enabled:true},
  {account:'50102',password:'student-b',team:'TeamA',group:'anim',name:'乙',enabled:true},
  {account:'50201',password:'other',team:'TeamB',group:'anim',name:'丙',enabled:true}
];
const context=vm.createContext({
  SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:name=>sheets.get(name)||null,insertSheet:name=>sheet(name)})},
  LockService:{getDocumentLock:()=>({waitLock(){},releaseLock(){}})},
  rows_:name=>name==='students'?students:[],
  isTeacher_:password=>password==='teacher-test',
  ok_:data=>({ok:true,data}),err_:error=>({ok:false,error}),now_:()=> '2026-09-23T00:00:00Z',
  PropertiesService:{getScriptProperties:()=>({getProperty:()=>''})},DEFAULT_TEACHER_PASSWORD:'',Logger:{log(){}},
  Set,JSON,Object,String,Number,Array,RegExp
});
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','WorkBoard.gs'),'utf8'),context);
const saveConfig=context.saveFeatureConfig_({group:'anim',config:{
  added:['A13'],hidden:['A01'],order:['A12','A13','A01'],
  items:{A13:{name:'新功能',cond:'完成一個作品',pri:2,links:[{title:'教學',url:'https://example.com'}]}}
}},'teacher-test');
assert.equal(saveConfig.ok,true);
assert.equal(saveConfig.data.config.added[0],'A13');
assert.equal(saveConfig.data.config.items.A13.links[0].title,'教學');
assert.equal(context.saveFeatureConfig_({group:'anim',config:{}},'student-a').ok,false);

const credential={account:'50101',password:'student-a'};
assert.equal(context.getWorkData_({team:'TeamA',group:'anim',credential},'').ok,true);
assert.equal(context.getWorkData_({team:'TeamB',group:'anim',credential},'').ok,false);
assert.equal(context.getWorkData_({team:'TeamA',group:'game',credential},'').ok,false);
let result=context.saveWorkBoard_({team:'TeamA',group:'anim',credential,
  patch:{assignments:{A13:'50102'},notes:{A13:'我先做角色'},order:['A13','A12']}},'');
assert.equal(result.ok,true);
assert.equal(result.data.board.assignments.A13,'50102');
assert.equal(result.data.board.notes.A13,'我先做角色');
assert.equal(result.data.board.order.length,0);
result=context.saveWorkBoard_({team:'TeamA',group:'anim',credential,
  patch:{assignments:{A01:'50101'}}},'');
assert.equal(result.data.board.assignments.A13,'50102');
assert.equal(result.data.board.notes.A13,'我先做角色');
assert.equal(context.saveWorkBoard_({team:'TeamB',group:'anim',credential,patch:{}},'').ok,false);
console.log('WorkBoard GAS authorization, feature CRUD schema, and student assignment/note tests passed');
