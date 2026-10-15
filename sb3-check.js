/* sb3-check.js v1.0（2026-10-15）
   Scratch 3 作品自動檢查：讀 .sb3 的 project.json，依本站命名與流程規則找出常見 bug，
   並產生給 AI 閱讀的程式摘要。純前端執行，不上傳也能用。
   需要：assets/vendor/jszip/jszip.min.js（讀檔時才用到；analyzeProject 本身不需要）。 */
(function(root){
'use strict';
const SCENES=['open','menu','1說明','1遊戲','1完成','2說明','2遊戲','2完成','成果'];
const SCENES_BY_FILE={'1':['open','menu','1說明','1遊戲','1完成'],'2':['2說明','2遊戲','2完成','成果'],'完成':SCENES};
const OLD_NAMES={HOME:'open',MENU:'menu',L1_INFO:'1說明',L1_PLAY:'1遊戲',L1_DONE:'1完成',L1_CLEAR:'1完成',
  L2_INFO:'2說明',L2_PLAY:'2遊戲',L2_DONE:'2完成',L2_CLEAR:'2完成',END:'成果'};
const SHARED_VAR=/^(PAGE|L[12]_|FINAL_)/i;
const CONDITION_OPS={control_if:'如果',control_if_else:'如果…否則',control_wait_until:'等待直到',control_repeat_until:'重複直到',control_while:'當…重複'};

function fileKind(name){
  const base=String(name||'').replace(/^.*[\\/]/,'').replace(/\.sb3$/i,'').trim();
  if(base==='1'||base==='1_備份')return '1';
  if(base==='2')return '2';
  if(base==='完成')return '完成';
  return '';
}
function isHat(op){return /^event_when|^control_start_as_clone$|^procedures_definition$|_when[A-Z]/.test(op||'');}
function menuValue(blocks,input){
  /* input 形如 [1,id] / [3,reporterId,shadowId] / [1,[11,name,id]] */
  if(!Array.isArray(input))return {value:null,dynamic:false};
  const dynamic=input[0]===3&&typeof input[1]==='string';
  const ref=dynamic?input[2]:input[1];
  if(Array.isArray(ref))return {value:ref[1]==null?null:String(ref[1]),dynamic};
  const b=typeof ref==='string'?blocks[ref]:null;
  if(b&&b.fields){const key=Object.keys(b.fields)[0];if(key)return {value:String(b.fields[key][0]),dynamic};}
  return {value:null,dynamic};
}
function scriptOf(blocks,id){
  /* 往上找到頂端積木 */
  let cur=blocks[id],guard=0;
  while(cur&&cur.parent&&blocks[cur.parent]&&guard++<5000){id=cur.parent;cur=blocks[id];}
  return id;
}

function analyzeProject(project,fileName){
  const findings=[],add=(level,where,text)=>findings.push({level,where,text});
  const targets=Array.isArray(project&&project.targets)?project.targets:[];
  const stage=targets.find(t=>t.isStage)||{name:'舞台',blocks:{},costumes:[],variables:{}};
  const sprites=targets.filter(t=>!t.isStage);
  const backdrops=(stage.costumes||[]).map(c=>String(c.name));
  const sent=new Map(),received=new Map(),cloned=new Map();
  let greenFlags=0,blockTotal=0,greenToOpen=false;
  const kind=fileKind(fileName);
  const label=t=>t.isStage?'舞台':'角色「'+t.name+'」';

  for(const t of targets){
    const blocks=t.blocks||{};const ids=Object.keys(blocks);
    let shows=0,hides=0,deletesClone=0,loose=0;
    for(const id of ids){
      const b=blocks[id];
      if(!b||Array.isArray(b)||b.shadow)continue;
      blockTotal++;
      const op=b.opcode;
      if(b.topLevel&&!isHat(op))loose++;
      if(op==='event_whenflagclicked'){
        greenFlags++;
        let cur=b.next,guard=0;
        while(cur&&blocks[cur]&&guard++<200){const n=blocks[cur];
          if(/^event_broadcast/.test(n.opcode)&&menuValue(blocks,n.inputs&&n.inputs.BROADCAST_INPUT).value==='open')greenToOpen=true;
          if(/^looks_switchbackdropto/.test(n.opcode)&&menuValue(blocks,n.inputs&&n.inputs.BACKDROP).value==='open')greenToOpen=true;
          cur=n.next;}
      }
      if(op==='event_broadcast'||op==='event_broadcastandwait'){
        const m=menuValue(blocks,b.inputs&&b.inputs.BROADCAST_INPUT);
        if(m.value!=null&&!m.dynamic){if(!sent.has(m.value))sent.set(m.value,new Set());sent.get(m.value).add(label(t));}
      }
      if(op==='event_whenbroadcastreceived'){
        const name=b.fields&&b.fields.BROADCAST_OPTION?String(b.fields.BROADCAST_OPTION[0]):'';
        if(!received.has(name))received.set(name,new Set());received.get(name).add(label(t));
        /* 收到 X 卻換成 Y 背景 */
        let cur=b.next,guard=0;
        while(cur&&blocks[cur]&&guard++<200){const n=blocks[cur];
          if(/^looks_switchbackdropto/.test(n.opcode)){const v=menuValue(blocks,n.inputs&&n.inputs.BACKDROP);
            if(v.value&&!v.dynamic&&v.value!==name&&SCENES.includes(name)&&!/^(next backdrop|previous backdrop|random backdrop)$/.test(v.value))
              add('warn',label(t),`收到「${name}」卻換成「${v.value}」背景；背景和訊息要同名。`);}
          cur=n.next;}
      }
      if(/^looks_switchbackdropto/.test(op)){
        const v=menuValue(blocks,b.inputs&&b.inputs.BACKDROP);
        if(v.value&&!v.dynamic&&!backdrops.includes(v.value)&&!/^(next backdrop|previous backdrop|random backdrop)$/.test(v.value))
          add('bug',label(t),`要換成「${v.value}」背景，可是舞台沒有這個背景。`);
      }
      if(op==='event_whenbackdropswitchesto'){
        const v=b.fields&&b.fields.BACKDROP?String(b.fields.BACKDROP[0]):'';
        if(v&&!backdrops.includes(v))add('bug',label(t),`「當背景換成 ${v}」找不到這個背景，程式不會動。`);
      }
      if(CONDITION_OPS[op]&&(!b.inputs||!b.inputs.CONDITION||!b.inputs.CONDITION[1]))
        add('bug',label(t),`「${CONDITION_OPS[op]}」的六角形格子是空的，條件永遠不成立。`);
      if(op==='looks_show')shows++;
      if(op==='looks_hide')hides++;
      if(op==='control_delete_this_clone')deletesClone++;
      if(op==='control_create_clone_of'){
        const v=menuValue(blocks,b.inputs&&b.inputs.CLONE_OPTION).value;
        const who=v==='_myself_'?t.name:v;if(who){if(!cloned.has(who))cloned.set(who,label(t));}
      }
    }
    t.__stats={shows,hides,deletesClone,loose};
  }

  /* 散落積木 */
  for(const t of targets){
    const loose=t.__stats.loose;delete t.__stats.loose;
    if(loose)add('warn',label(t),`有 ${loose} 組積木沒有接在帽子積木下面，不會執行；用不到就刪掉。`);
  }
  /* 廣播配對 */
  for(const [name,who] of sent)if(!received.has(name))
    add('bug',[...who].join('、'),`送出「${name}」，可是沒有人收到。`);
  for(const [name,who] of received)if(!sent.has(name)&&name)
    add(kind==='2'&&SCENES_BY_FILE['1'].includes(name)?'tip':'bug',[...who].join('、'),`沒有人送「${name}」，收到它的程式不會動。`);
  /* 綠旗 */
  if(!greenFlags)add('bug','整個作品','沒有「當綠旗被點擊」，按綠旗不會開始。');
  else if((kind==='1'||kind==='完成')&&!greenToOpen)add('warn','舞台','按綠旗後要先到 open：廣播 open 或換成 open 背景。');
  /* 背景名稱 */
  const need=SCENES_BY_FILE[kind]||[];
  const missing=need.filter(n=>!backdrops.includes(n));
  if(missing.length)add('warn','舞台',`還缺這些背景：${missing.join('、')}。`);
  const oldUsed=[...new Set([...backdrops,...sent.keys(),...received.keys()].filter(n=>OLD_NAMES[n]))];
  oldUsed.forEach(n=>add('warn','名稱',`「${n}」是舊名稱，請改成「${OLD_NAMES[n]}」。`));
  backdrops.filter(n=>/^(背景|backdrop)\s*\d*$/i.test(n)).forEach(n=>add('tip','舞台',`背景「${n}」還是預設名稱，請改成用途名稱。`));
  /* 角色 */
  for(const s of sprites){
    if(/^(角色|Sprite)\s*\d*$/i.test(s.name))add('tip',label(s),'還是預設名稱，請改成像「1主角」這樣的名字。');
    if(s.__stats.shows&&!s.__stats.hides)add('warn',label(s),'只有「顯示」沒有「隱藏」，換頁後會留在畫面上。');
    if(cloned.has(s.name)&&!s.__stats.deletesClone)add('warn',label(s),'有建立分身，卻沒有「分身刪除」，分身會越來越多。');
    for(const id in (s.variables||{})){
      const name=String(s.variables[id][0]);
      if(SHARED_VAR.test(name))add('warn',label(s),`變數「${name}」要建立成「適用於所有角色」。`);
      if(Object.values(stage.variables||{}).some(v=>String(v[0])===name))add('warn',label(s),`變數「${name}」同時有共用與私有兩個，容易改錯。`);
    }
  }
  targets.forEach(t=>delete t.__stats);
  /* 檔名 */
  if(fileName&&!kind)add('tip','檔名',`檔名「${String(fileName).replace(/^.*[\\/]/,'')}」請改成 1.sb3、2.sb3 或 完成.sb3。`);

  const order={bug:0,warn:1,tip:2};
  findings.sort((a,b)=>order[a.level]-order[b.level]);
  const stats={sprites:sprites.length,backdrops:backdrops.length,blocks:blockTotal,
    broadcasts:[...new Set([...sent.keys(),...received.keys()])].length,extensions:(project&&project.extensions)||[]};
  return {fileKind:kind,stats,backdrops,sprites:sprites.map(s=>s.name),findings,summary:summarize(project,fileName,stats)};
}

/* ---------- 給 AI 的程式摘要 ---------- */
function literal(v){
  if(!Array.isArray(v))return '';
  if(v[0]>=4&&v[0]<=10)return JSON.stringify(String(v[1]));
  if(v[0]===11)return '[訊息 '+v[1]+']';
  if(v[0]===12)return '(變數 '+v[1]+')';
  if(v[0]===13)return '(清單 '+v[1]+')';
  return '';
}
function renderInput(blocks,input,depth){
  if(!Array.isArray(input))return '';
  const ref=input[1];
  if(Array.isArray(ref))return literal(ref);
  if(typeof ref==='string'&&blocks[ref])return renderBlock(blocks,ref,depth+1,true);
  if(Array.isArray(input[2]))return literal(input[2]);
  return '∅';
}
function renderBlock(blocks,id,depth,inline){
  const b=blocks[id];if(!b||depth>12)return '…';
  if(b.shadow&&b.fields){const k=Object.keys(b.fields)[0];return k?JSON.stringify(String(b.fields[k][0])):'';}
  const parts=[];
  for(const k in (b.fields||{}))parts.push(k+'='+JSON.stringify(String(b.fields[k][0])));
  for(const k in (b.inputs||{})){if(/^SUBSTACK/.test(k))continue;parts.push(k+'='+renderInput(blocks,b.inputs[k],depth));}
  if(b.mutation&&b.mutation.proccode)parts.push('proc='+JSON.stringify(b.mutation.proccode));
  const text=b.opcode+(parts.length?' '+parts.join(' '):'');
  return inline?'('+text+')':text;
}
function renderStack(blocks,id,indent,out,guard){
  let cur=id;
  while(cur&&blocks[cur]&&guard.n++<4000){
    const b=blocks[cur];out.push('  '.repeat(indent)+renderBlock(blocks,cur,0,false));
    if(b.inputs&&b.inputs.SUBSTACK&&typeof b.inputs.SUBSTACK[1]==='string')renderStack(blocks,b.inputs.SUBSTACK[1],indent+1,out,guard);
    if(b.inputs&&b.inputs.SUBSTACK2&&typeof b.inputs.SUBSTACK2[1]==='string'){out.push('  '.repeat(indent)+'else');renderStack(blocks,b.inputs.SUBSTACK2[1],indent+1,out,guard);}
    cur=b.next;
  }
}
function summarize(project,fileName,stats){
  const targets=(project&&project.targets)||[];const out=[];
  out.push('檔名: '+(fileName||'(未提供)'));
  out.push('擴充: '+((project&&project.extensions)||[]).join(', '));
  out.push(`統計: 角色 ${stats.sprites}、背景 ${stats.backdrops}、積木 ${stats.blocks}、訊息 ${stats.broadcasts}`);
  for(const t of targets){
    out.push('');
    out.push('=== '+(t.isStage?'舞台':'角色 '+t.name)+' ===');
    out.push((t.isStage?'背景':'造型')+': '+(t.costumes||[]).map(c=>c.name).join('、'));
    if((t.sounds||[]).length)out.push('音效: '+t.sounds.map(s=>s.name).join('、'));
    const vars=Object.values(t.variables||{}).map(v=>v[0]+'='+JSON.stringify(v[1]));
    if(vars.length)out.push((t.isStage?'共用變數':'私有變數')+': '+vars.join('、'));
    if(!t.isStage)out.push(`位置 (${Math.round(t.x||0)},${Math.round(t.y||0)}) ${t.visible===false?'隱藏':'顯示'}`);
    const blocks=t.blocks||{},guard={n:0};let n=0;
    for(const id in blocks){
      const b=blocks[id];if(!b||Array.isArray(b)||!b.topLevel||b.shadow)continue;
      out.push('--- 程式 '+(++n)+(isHat(b.opcode)?'':'（未接帽子積木）'));
      renderStack(blocks,id,1,out,guard);
    }
  }
  let text=out.join('\n');
  if(text.length>90000)text=text.slice(0,90000)+'\n…（摘要過長，已截斷）';
  return text;
}

async function readSb3(file){
  if(!root.JSZip)throw new Error('缺少 JSZip');
  const zip=await root.JSZip.loadAsync(file);
  const entry=zip.file('project.json');
  if(!entry)throw new Error('這不是 Scratch 3 的 .sb3 檔（找不到 project.json）');
  const project=JSON.parse(await entry.async('string'));
  if(!Array.isArray(project.targets))throw new Error('只支援 Scratch 3 的 .sb3 檔');
  return analyzeProject(project,file.name);
}

const api={analyzeProject,readSb3,fileKind,SCENES,version:'1.0'};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Sb3Check=api;
})(typeof window!=='undefined'?window:globalThis);
