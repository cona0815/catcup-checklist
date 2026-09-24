/* 工作分配與教師必做功能編輯。保留原有 feature ID，以免打亂既有進度。 */
const WORK_ALL='__all__';
const workKey=()=>`${state.profile.team}|${G()}`;
const CLOUD_PENDING_LS='catcup_cloud_pending';
let cloudPending={},cloudSaveTimer=null,cloudSaving=false,cloudSaveMessage='',cloudLoadedKeys=new Set();
function loadCloudPending(){try{cloudPending=JSON.parse(localStorage.getItem(CLOUD_PENDING_LS)||'{}')||{};}catch(e){cloudPending={};}}
function persistCloudPending(){try{localStorage.setItem(CLOUD_PENDING_LS,JSON.stringify(cloudPending));return true;}catch(e){return false;}}
function hasCloudPending(key=workKey()){const p=cloudPending[key];return Boolean(p&&(Object.keys(p.doc||{}).length||p.timer));}
function cloudStatusText(){
  if(!state.profile.team)return '請先選擇隊伍，資料才能存到 GAS。';
  if(!teacherPw()&&!workCredential)return '⚠️ 尚未驗證學生帳號，資料尚未寫入 GAS；請登入後再確認。';
  if(hasCloudPending())return cloudSaveMessage||'💾 已暫存在本機，等待上傳 GAS…';
  return cloudLoadedKeys.has(workKey())?(cloudSaveMessage||'☁️ 已從 GAS 讀取；修改後會自動儲存。'):'☁️ 正在讀取 GAS 資料…';
}
function refreshCloudStatus(){['#docSaveStatus','#timerSaveStatus'].forEach(selector=>{const el=$(selector);if(el)el.textContent=cloudStatusText();});}
function scheduleCloudSave(delay=1200){clearTimeout(cloudSaveTimer);cloudSaveTimer=setTimeout(saveCloudPending,delay);}
function queueCloudDoc(field,value){
  if(!state.auth&&!teacherPw()){cloudSaveMessage='訪客預覽不會儲存到 GAS；請登入學生帳號';refreshCloudStatus();return;}
  const key=workKey(),p=cloudPending[key]||{};
  p.doc={...(p.doc||{}),[field]:value};cloudPending[key]=p;
  cloudSaveMessage=persistCloudPending()?'💾 本機暫存中，稍後上傳 GAS…':'⚠️ 本機暫存失敗，請勿關閉網頁';
  refreshCloudStatus();scheduleCloudSave();
}
function queueCloudTimer(){
  if(!state.auth&&!teacherPw()){cloudSaveMessage='訪客預覽不會儲存到 GAS；請登入學生帳號';refreshCloudStatus();return;}
  const key=workKey(),p=cloudPending[key]||{};
  p.timer={...state.timer};cloudPending[key]=p;
  cloudSaveMessage=persistCloudPending()?'💾 本機暫存中，正在上傳 GAS…':'⚠️ 本機暫存失敗，請勿關閉網頁';
  refreshCloudStatus();scheduleCloudSave(0);
}
async function saveCloudPending(){
  const key=workKey(),pending=cloudPending[key];if(!hasCloudPending(key)||cloudSaving)return;
  if(!teacherPw()&&!workCredential){cloudSaveMessage='⚠️ 請重新登入學生帳號，才能上傳 GAS';refreshCloudStatus();return;}
  const team=state.profile.team,group=G(),credential=workCredential;
  const patch={};if(Object.keys(pending.doc||{}).length)patch.doc={...pending.doc};
  if(pending.timer)patch.timer={...pending.timer};
  cloudSaving=true;cloudSaveMessage='☁️ 正在儲存到 GAS…';refreshCloudStatus();
  const r=await api.post('saveWorkBoard',{team,group,patch,credential},teacherPw());
  cloudSaving=false;
  if(r&&r.ok){
    const latest=cloudPending[key]||{};
    Object.keys(patch.doc||{}).forEach(field=>{if(latest.doc?.[field]===patch.doc[field])delete latest.doc[field];});
    if(patch.timer&&JSON.stringify(latest.timer)===JSON.stringify(patch.timer))delete latest.timer;
    if(!Object.keys(latest.doc||{}).length&&!latest.timer)delete cloudPending[key];
    persistCloudPending();
    state.workBoards[key]=r.data?.board||{...state.workBoards[key],...patch};saveLocal();
    cloudSaveMessage=`☁️ 已於 ${new Date().toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'})} 儲存到 GAS`;
    if(hasCloudPending(key))scheduleCloudSave(1200);
  }else{cloudSaveMessage='⚠️ GAS 儲存失敗；本機保留待上傳資料，稍後重試';scheduleCloudSave(10000);}
  refreshCloudStatus();
}
const currentBoard=()=>state.workBoards[workKey()]||{assignments:{},notes:{}};
let workDraft=null,workSaveState='';
function currentWorkDraft(){
  if(!workDraft||workDraft.key!==workKey()){
    if(workDraft)workSaveState='';
    const board=currentBoard();
    workDraft={key:workKey(),assignments:{...(board.assignments||{})},notes:{...(board.notes||{})},changes:{assignments:{},notes:{}},dirty:false};
  }
  return workDraft;
}
const hasUnsavedWork=()=>Boolean(workDraft?.dirty);
function markWorkDirty(){
  workDraft.dirty=true;workSaveState='尚未儲存；請按「確認儲存分工」';
  const status=$('#workSaveStatus'),button=$('#workSaveButton');
  if(status)status.textContent=workSaveState;
  if(button)button.disabled=false;
}
const orderedWorkFeatures=()=>feats();
async function loadWorkData(){
  if(!api.on()||!state.profile.team) return false;
  const team=state.profile.team,group=G();
  const credential=workCredential;
  if(!teacherPw()&&!credential)return false;
  const r=await api.post('getWorkData',{team,group,credential},teacherPw());
  if(!r||!r.ok) return false;
  if(team!==state.profile.team||group!==G())return false;
  if(credential)workCredential=credential;
  state.featureConfig=r.data.featureConfig||{};
  state.roster=r.data.roster||[];
  const board=r.data.board||{assignments:{},notes:{}};
  state.workBoards[workKey()]=board;
  const pending=cloudPending[workKey()]||{};
  const serverDoc=board.doc||{},localDoc=state.doc[group]||{};
  if(!Object.keys(serverDoc).length&&Object.keys(localDoc).length&&!Object.keys(pending.doc||{}).length){pending.doc={...localDoc};cloudPending[workKey()]=pending;persistCloudPending();}
  state.doc[group]={...serverDoc,...(pending.doc||{})};
  if(board.timer?.start)state.timer=pending.timer||board.timer;
  else if(state.timer?.start&&!pending.timer){pending.timer={...state.timer};cloudPending[workKey()]=pending;persistCloudPending();}
  else state.timer=pending.timer||{start:0,running:false};
  cloudLoadedKeys.add(workKey());
  if(workDraft&&!workDraft.dirty)workDraft=null;
  saveLocal(); renderFeat(); renderWork(); renderDash();renderDoc();renderTime();refreshCloudStatus();
  if(hasCloudPending())scheduleCloudSave();
  return true;
}
function renderWork(){
  const el=$('#tab-work'); if(!el) return;
  if(!state.auth&&!teacherPw()){
    el.innerHTML='<div class="card"><h2>👥 工作分配</h2><p class="sub">請先用學生帳號登入，才能查看同隊伙伴與分配必做功能。</p></div>';
    return;
  }
  if(state.auth&&!teacherPw()&&!workCredential){
    el.innerHTML=`<div class="card"><h2>👥 工作分配</h2>
      <p class="sub">為保護伙伴資料，重新開啟網頁後需再次驗證學生密碼；密碼只在這次開啟期間使用，不儲存在本機。</p>
      <div class="row"><input type="password" id="workPassword" autocomplete="current-password" placeholder="學生密碼" aria-label="學生密碼">
      <button class="btn" id="workVerify">驗證並載入伙伴</button></div></div>`;
    el.querySelector('#workVerify').onclick=async()=>{
      const password=el.querySelector('#workPassword').value;
      if(!password)return toast('請輸入學生密碼');
      workCredential={account:state.auth.account,password};
      const ok=await loadWorkData();
      if(!ok){workCredential=null;toast('驗證或讀取失敗，請確認密碼',3500);}
    };
    return;
  }
  const f=orderedWorkFeatures(), board=currentWorkDraft();
  const members=state.roster.filter(member=>member.team===state.profile.team&&member.group===G());
  const manager=members[0],canAssign=Boolean(teacherPw()||(state.auth&&manager&&state.auth.account===manager.account));
  const label=member=>`${esc(maskName(member.name))}（${esc(member.account)}）`;
  el.innerHTML=`<div class="card"><h2>👥 工作分配</h2>
    <p class="sub">${state.profile.team?`隊伍：${esc(state.profile.team)}。將必做功能分配給伙伴；勾選完成仍在「必做功能」頁。`:teacherPw()?'請先在上方選擇隊伍，即可查看、分配及編輯工作。':'登入學生帳號後，即可查看同隊伙伴與分工。'}</p>
    ${state.profile.team?`<div class="row"><button class="btn ghost" data-work-refresh>☁️ 重新讀取分工</button>
      <span id="workStatus" class="sub">${teacherPw()?'老師可分配、改派負責伙伴，並編輯分工備註；兩位學生都可查看。':canAssign?'本組第一位學生可分配工作；兩位都可查看與補充分工備註。':'分工由本組第一位學生安排；兩位都可查看與補充分工備註。'}</span></div>
      <div class="row noprint" style="margin:12px 0"><button class="btn" id="workSaveButton" ${board.dirty?'':'disabled'}>確認儲存分工</button>
        <span id="workSaveStatus" class="sub" role="status" aria-live="polite">${esc(workSaveState||'目前沒有待儲存變更')}</span></div>
      <h3>我的伙伴</h3><div class="row">${members.length?members.map(m=>`<span class="pill">👤 ${label(m)}</span>`).join(''):'<span class="sub">此隊尚無可顯示的學生帳號；若已有帳號，請按「重新讀取分工」。</span>'}</div>
      <div id="workList">${f.map(item=>`<div class="item work-row" data-work-id="${esc(item.id)}">
        <div class="bd"><div class="nm">${esc(item.name)} <small>${featureDisplayId(item.id)}</small></div><div class="cd">${esc(item.cond)}</div>
          <div class="row noprint"><label>負責伙伴 <select data-assign="${esc(item.id)}" ${canAssign?'':'disabled'}><option value="">尚未分配</option>
          <option value="${WORK_ALL}" ${board.assignments?.[item.id]===WORK_ALL?'selected':''}>每個人都要</option>
          ${members.map(m=>`<option value="${esc(m.account)}" ${board.assignments?.[item.id]===m.account?'selected':''}>${label(m)}</option>`).join('')}</select></label></div>
          <label class="fl">分工備註（老師與兩位學生可編輯）
            <textarea rows="2" maxlength="500" data-work-note="${esc(item.id)}" placeholder="例如：我先做角色，同伴負責音效">${esc(board.notes?.[item.id]||'')}</textarea></label>
        </div></div>`).join('')}</div>`:''}</div>`;
  el.onclick=async e=>{
    if(e.target.closest('#workSaveButton')){await saveWorkDraft();return;}
    if(e.target.closest('[data-work-refresh]')){ if(hasUnsavedWork()&&!confirm('目前有尚未儲存的分工，確定放棄並重新讀取嗎？'))return;
      workDraft=null;const ok=await loadWorkData(); toast(ok?'已重新讀取分工':'分工讀取失敗，請檢查 GAS 連線'); return; }
  };
  el.onchange=e=>{
    const s=e.target.closest('[data-assign]');
    if(s){if(!canAssign)return toast('只有本組第一位學生或老師可以分配工作');
      board.assignments[s.dataset.assign]=s.value;board.changes.assignments[s.dataset.assign]=s.value;markWorkDirty();}
  };
  el.oninput=e=>{const note=e.target.closest('[data-work-note]');if(!note)return;
    board.notes[note.dataset.workNote]=note.value;board.changes.notes[note.dataset.workNote]=note.value.trim();markWorkDirty();};
}
async function saveWorkDraft(){
  const draft=currentWorkDraft();if(!draft.dirty||!state.profile.team)return;
  const credential=workCredential;
  if(!teacherPw()&&!credential){toast('請先登入學生帳號，才能同步分工');return;}
  const patch={};
  if(Object.keys(draft.changes.assignments).length)patch.assignments={...draft.changes.assignments};
  if(Object.keys(draft.changes.notes).length)patch.notes={...draft.changes.notes};
  const key=draft.key,button=$('#workSaveButton'),status=$('#workSaveStatus');
  if(button)button.disabled=true;if(status)status.textContent='正在儲存到雲端…';
  $('#tab-work').querySelectorAll('[data-assign],[data-work-note]').forEach(input=>input.disabled=true);
  const r=await api.post('saveWorkBoard',{team:state.profile.team,group:G(),patch,credential},teacherPw());
  if(r&&r.ok){
    state.workBoards[key]=r.data?.board||{...state.workBoards[key],...patch};saveLocal();
    if(workDraft===draft){workDraft=null;workSaveState=`已於 ${new Date().toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'})} 儲存到雲端`;renderWork();}
    toast('分工已儲存到雲端');
  }else{
    workSaveState='儲存失敗；變更仍在此頁，請檢查連線後重試';
    if(status)status.textContent=workSaveState;if(button)button.disabled=false;
    renderWork();
    toast(workSaveState,4000);
  }
}
function featureEditor(item){
  const pinned=isPinnedFeature(item.id);
  return `<details class="teacher-feature noprint tonly" draggable="${pinned?'false':'true'}" data-feature-id="${esc(item.id)}">
    <summary>編輯 ${featureDisplayId(item.id)}　${esc(item.name)}</summary>
    <div class="row"><strong>☰ ${featureDisplayId(item.id)}　教師編輯</strong>
      ${pinned?'<span class="sub">固定於準備流程前四項</span>':`<button class="btn ghost" data-feature-move="${esc(item.id)}" data-dir="-1">↑</button>
      <button class="btn ghost" data-feature-move="${esc(item.id)}" data-dir="1">↓</button>
      <button class="btn danger" data-feature-delete="${esc(item.id)}">刪除</button>`}</div>
    <input data-feature-name="${esc(item.id)}" value="${esc(item.name)}" aria-label="功能名稱">
    <textarea data-feature-cond="${esc(item.id)}" rows="2" aria-label="完成條件">${esc(item.cond)}</textarea>
    <label>優先順序 <select data-feature-pri="${esc(item.id)}">${[1,2,3].map(n=>`<option value="${n}" ${Number(item.pri)===n?'selected':''}>${n}</option>`).join('')}</select></label>
    <div class="sub">相關連結</div>
    ${(item.links||[]).map((link,i)=>`<div class="row"><a class="lk" href="${esc(link.url)}" target="_blank" rel="noopener">${esc(link.title)}</a>
      <button class="btn ghost" data-feature-link-remove="${esc(item.id)}" data-link-index="${i}">移除連結</button></div>`).join('')}
    <div class="row"><input data-feature-link-title="${esc(item.id)}" placeholder="連結名稱" aria-label="連結名稱">
      <input data-feature-link-url="${esc(item.id)}" placeholder="https://..." aria-label="連結網址">
      <button class="btn ghost" data-feature-link-add="${esc(item.id)}">＋ 加連結</button></div>
    <button class="btn" data-feature-save="${esc(item.id)}">儲存這項設定</button></details>`;
}
function nextFeatureId(){
  const prefix=G()==='game'?'G':'A';
  const used=new Set([...baseFeatures(G()).map(x=>x.id),...(state.featureConfig[G()]?.added||[]),
    ...(state.featureConfig[G()]?.hidden||[]),...Object.keys(state.featureConfig[G()]?.items||{})]);
  for(let n=(G()==='game'?18:16);n<=99;n++){const id=prefix+String(n).padStart(2,'0');if(!used.has(id))return id;}
  return '';
}
function validFeatureUrl(value){try{const url=new URL(value);return ['http:','https:'].includes(url.protocol);}catch(e){return false;}}
async function saveFeatureConfig(config){
  if(!teacherPw())return toast('請先以老師身分登入');
  state.featureConfig[G()]=config;saveLocal();renderFeat();renderWork();renderDash();
  const r=await api.post('saveFeatureConfig',{group:G(),config},teacherPw());
  if(r&&r.ok&&r.data?.config){state.featureConfig[G()]=r.data.config;saveLocal();renderFeat();renderWork();renderDash();}
  toast(r&&r.ok?'必做功能已存到 GAS':'GAS 儲存失敗；本機保留草稿',3500);
}
