/* 合併擴充檔：三個 .gs 在同一個環境載入，路由表每個名稱都對到函式。 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ctx=vm.createContext({ok_:d=>({ok:true,data:d}),err_:e=>({ok:false,error:e}),isTeacher_:()=>false,rows_:()=>[]});
for(const f of ['WorkBoard.gs','WorkUpload.gs','TeacherFolder.gs','CatcupRoutes.gs'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),ctx);
for(const a of ['uploadWork','listWorks','uploadFeedback','getFeedback','listTeacherFiles','getTeacherFile','teacherFileOp']){
  assert.equal(typeof ctx[a+'_'],'function',a+'_ defined');
  ctx[a+'_']=(p,pw)=>({hit:a,p,pw});const r=ctx.catcupRoute_(a,{x:1},'pw');
  assert.equal(r.hit,a);assert.equal(r.p.x,1);assert.equal(r.pw,'pw');}
assert.equal(ctx.catcupRoute_('nope',{},''),null);
console.log('Catcup routes: all 7 extension actions routed');
