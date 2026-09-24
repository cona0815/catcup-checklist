const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const sheets=new Map(),files=[];let serial=0,folderId='';
function sheet(name){
  if(!sheets.has(name))sheets.set(name,{rows:[],appendRow(row){this.rows.push(row);},setFrozenRows(){},
    getDataRange(){return {getValues:()=>this.rows};},
    getRange(row,col){return {setValues:values=>{this.rows[row-1]=values[0];},setValue:value=>{this.rows[row-1][col-1]=value;}};}
  });
  return sheets.get(name);
}
const folder={getId:()=> 'folder-1',createFile(blob){const file={getId:()=> 'file-1234567890',setSharing(access,permission){this.access=access;this.permission=permission;}};files.push({blob,file});return file;}};
const props={getProperty:()=>folderId,setProperty:(key,value)=>{folderId=value;}};
const context=vm.createContext({
  SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:name=>sheets.get(name)||null,insertSheet:name=>sheet(name)})},
  DriveApp:{createFolder:()=>folder,getFolderById:()=>folder,Access:{ANYONE_WITH_LINK:'anyone'},Permission:{VIEW:'view'}},
  PropertiesService:{getScriptProperties:()=>props},
  Utilities:{getUuid:()=> 'resource-'+(++serial),base64Decode:value=>Array.from(Buffer.from(value,'base64')),
    newBlob:(bytes,mime,name)=>({bytes,mime,name})},
  isTeacher_:password=>password==='teacher-test',ok_:data=>({ok:true,data}),err_:error=>({ok:false,error}),
  now_:()=> '2026-09-24 09:00:00',Set,JSON,Object,String,Number,Array,RegExp
});
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','ResourceBoard.gs'),'utf8'),context);
let result=context.getResourceData_();
assert.equal(result.ok,true);assert.equal(result.data.items.length,5);
assert.equal(context.saveResource_({kind:'code',title:'測試',url:'https://example.com'},'student').ok,false);
assert.equal(context.saveResource_({kind:'code',title:'測試',url:'javascript:alert(1)'},'teacher-test').ok,false);
result=context.saveResource_({kind:'code',title:'角色移動',url:'https://example.com/code'},'teacher-test');
assert.equal(result.ok,true);const id=result.data.item.id;
result=context.saveResource_({id,kind:'code',title:'角色移動新版',url:'https://example.com/v2'},'teacher-test');
assert.equal(result.ok,true);assert.equal(context.getResourceData_().data.items.find(item=>item.id===id).title,'角色移動新版');
assert.equal(context.deleteResource_({id},'student').ok,false);
assert.equal(context.deleteResource_({id},'teacher-test').ok,true);
assert.equal(context.getResourceData_().data.items.some(item=>item.id===id),false);
result=context.uploadResourceImage_({mime:'image/png',base64:Buffer.from('test').toString('base64')},'teacher-test');
assert.equal(result.ok,true);assert.equal(files.length,1);assert.equal(files[0].file.access,'anyone');
assert.equal(context.uploadResourceImage_({mime:'text/html',base64:'abcd'},'teacher-test').ok,false);
console.log('Resource CRUD, teacher authorization, URL validation and image upload tests passed');
