/* 工作分配與教師必做功能編輯。保留原有 feature ID，以免打亂既有進度。 */
const WORK_ALL='__all__';
const workKey=()=>`${state.profile.team}|${G()}`;
const currentBoard=()=>state.workBoards[workKey()]||{assignments:{},notes:{}};
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
  state.workBoards[workKey()]=r.data.board||{assignments:{},notes:{}};
  saveLocal(); renderFeat(); renderWork(); renderDash();
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
  const f=orderedWorkFeatures(), board=currentBoard();
  const members=state.roster.filter(member=>member.team===state.profile.team&&member.group===G());
  const manager=members[0],canAssign=Boolean(teacherPw()||(state.auth&&manager&&state.auth.account===manager.account));
  const label=member=>`${esc(maskName(member.name))}（${esc(member.account)}）`;
  el.innerHTML=`<div class="card"><h2>👥 工作分配</h2>
    <p class="sub">${state.profile.team?`隊伍：${esc(state.profile.team)}。將必做功能分配給伙伴；勾選完成仍在「必做功能」頁。`:teacherPw()?'請先在上方選擇隊伍，即可查看、分配及編輯工作。':'登入學生帳號後，即可查看同隊伙伴與分工。'}</p>
    ${state.profile.team?`<div class="row"><button class="btn ghost" data-work-refresh>☁️ 重新讀取分工</button>
      <span id="workStatus" class="sub">${teacherPw()?'老師可分配、改派負責伙伴，並編輯分工備註；兩位學生都可查看。':canAssign?'本組第一位學生可分配工作；兩位都可查看與補充分工備註。':'分工由本組第一位學生安排；兩位都可查看與補充分工備註。'}</span></div>
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
    if(e.target.closest('[data-work-refresh]')){ const ok=await loadWorkData(); toast(ok?'已重新讀取分工':'分工讀取失敗，請檢查 GAS 連線'); return; }
  };
  el.onchange=async e=>{
    const s=e.target.closest('[data-assign]');
    if(s){if(!canAssign)return toast('只有本組第一位學生或老師可以分配工作');await updateWorkBoard({assignments:{...currentBoard().assignments,[s.dataset.assign]:s.value}});return;}
    const note=e.target.closest('[data-work-note]');
    if(note)await updateWorkBoard({notes:{...currentBoard().notes,[note.dataset.workNote]:note.value.trim()}});
  };
}
async function updateWorkBoard(patch){
  if(!state.profile.team)return;
  const credential=workCredential;
  if(!teacherPw()&&!credential){toast('請先登入學生帳號，才能同步分工');return;}
  const board={assignments:currentBoard().assignments||{},notes:currentBoard().notes||{},...patch};
  state.workBoards[workKey()]=board;saveLocal();renderWork();
  const r=await api.post('saveWorkBoard',{team:state.profile.team,group:G(),patch,credential},teacherPw());
  if(r&&r.ok){workCredential=credential;toast('分工已存到雲端');}
  else toast('雲端儲存失敗；暫存於本機，請檢查登入與 GAS 部署',4000);
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
