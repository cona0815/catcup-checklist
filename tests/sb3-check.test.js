/* sb3-check 規則單元測試（Node，不需瀏覽器） */
const assert=require('node:assert/strict');
const {analyzeProject,fileKind}=require('../sb3-check.js');

let seq=0;const id=()=>'b'+(++seq);
/* 小工具：把一串積木接成程式 */
function script(blocks,list){
  let prev=null,first=null;
  for(const [opcode,extra={}] of list){
    const k=id();blocks[k]={opcode,next:null,parent:prev,inputs:{},fields:{},shadow:false,topLevel:!prev,...extra};
    if(prev)blocks[prev].next=k;else first=k;prev=k;
  }
  return first;
}
function backdropMenu(blocks,name){const k=id();blocks[k]={opcode:'looks_backdrops',shadow:true,topLevel:false,fields:{BACKDROP:[name,null]},inputs:{}};return [1,k];}
const bc=name=>({inputs:{BROADCAST_INPUT:[1,[11,name,'id-'+name]]}});
const recv=name=>({fields:{BROADCAST_OPTION:[name,'id-'+name]}});

function project({backdrops,stage=[],sprites=[]}){
  const stageBlocks={};stage.forEach(s=>script(stageBlocks,s(stageBlocks)));
  return {targets:[{isStage:true,name:'Stage',costumes:backdrops.map(name=>({name})),variables:{},blocks:stageBlocks},
    ...sprites.map(sp=>{const blocks={};(sp.scripts||[]).forEach(s=>script(blocks,s(blocks)));
      return {isStage:false,name:sp.name,costumes:[{name:'c1'}],variables:sp.variables||{},blocks};})],extensions:[]};
}
const switchTo=(b,name)=>['looks_switchbackdropto',{inputs:{BACKDROP:backdropMenu(b,name)}}];

/* 1. 正確的 1.sb3：不應有 bug */
const good=project({backdrops:['open','menu','1說明','1遊戲','1完成'],
  stage:[b=>[['event_whenflagclicked'],['event_broadcast',bc('open')]],
    ...['open','menu','1說明','1遊戲','1完成'].map(n=>b=>[['event_whenbroadcastreceived',recv(n)],switchTo(b,n)])],
  sprites:[{name:'1開始',scripts:[b=>[['event_whenthisspriteclicked'],['event_broadcast',bc('menu')]],
    b=>[['event_whenbroadcastreceived',recv('open')],['looks_show']],b=>[['event_whenbroadcastreceived',recv('menu')],['looks_hide']],
    b=>[['event_whenthisspriteclicked'],['event_broadcast',bc('1說明')]],b=>[['event_whenthisspriteclicked'],['event_broadcast',bc('1遊戲')]],
    b=>[['event_whenthisspriteclicked'],['event_broadcast',bc('1完成')]]]}]});
const r1=analyzeProject(good,'1.sb3');
assert.equal(r1.fileKind,'1');
assert.deepEqual(r1.findings.filter(f=>f.level==='bug'),[],JSON.stringify(r1.findings));
assert.ok(r1.summary.includes('event_whenflagclicked'));
assert.ok(r1.summary.includes('角色 1開始'));

/* 2. 各種 bug */
const bad=project({backdrops:['HOME','背景1'],
  stage:[b=>[['event_whenbroadcastreceived',recv('1遊戲')],switchTo(b,'1說明')]],
  sprites:[{name:'角色1',variables:{v1:['PAGE',0]},scripts:[
    b=>[['event_whenthisspriteclicked'],['event_broadcast',bc('menu')],['looks_show']],
    b=>[['event_whenbroadcastreceived',recv('2遊戲')],['control_if',{inputs:{}}]],
    b=>[['motion_movesteps']],
    b=>[['event_whenthisspriteclicked'],['control_create_clone_of',{inputs:{CLONE_OPTION:(()=>{const k=id();b[k]={opcode:'control_create_clone_of_menu',shadow:true,fields:{CLONE_OPTION:['_myself_',null]},inputs:{}};return [1,k];})()}}]]
  ]}]});
const r2=analyzeProject(bad,'my game.sb3');
const texts=r2.findings.map(f=>f.level+'|'+f.text).join('\n');
for(const expect of [
  /bug\|沒有「當綠旗被點擊」/,/bug\|要換成「1說明」背景，可是舞台沒有/,/bug\|送出「menu」，可是沒有人收到/,
  /bug\|沒有人送「2遊戲」/,/bug\|「如果」的六角形格子是空的/,/warn\|收到「1遊戲」卻換成「1說明」/,
  /warn\|有 1 組積木沒有接在帽子積木下面/,/warn\|「HOME」是舊名稱，請改成「open」/,/warn\|只有「顯示」沒有「隱藏」/,
  /warn\|有建立分身，卻沒有「分身刪除」/,/warn\|變數「PAGE」要建立成「適用於所有角色」/,
  /tip\|背景「背景1」還是預設名稱/,/tip\|還是預設名稱，請改成像「1主角」/,/tip\|檔名「my game.sb3」/]) assert.match(texts,expect);
assert.equal(r2.findings[0].level,'bug','bugs sorted first');

/* 3. 2.sb3：收到 1 號負責的訊息只算提醒；缺背景用二號清單 */
const two=project({backdrops:['2說明','2遊戲'],stage:[b=>[['event_whenflagclicked'],switchTo(b,'2說明')],b=>[['event_whenbroadcastreceived',recv('menu')],switchTo(b,'2說明')]]});
const r3=analyzeProject(two,'2.sb3');
assert.match(r3.findings.map(f=>f.level+'|'+f.text).join('\n'),/tip\|沒有人送「menu」/);
assert.match(r3.findings.map(f=>f.text).join('\n'),/還缺這些背景：2完成、成果/);
assert.equal(fileKind('完成.sb3'),'完成');assert.equal(fileKind('1_備份.sb3'),'1');assert.equal(fileKind('x.sb3'),'');
console.log('sb3-check rules: naming, broadcasts, backdrops, empty conditions, clones, variables and summary passed');
