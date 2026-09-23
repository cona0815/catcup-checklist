/* 工作分配與教師必做功能編輯。保留原有 feature ID，以免打亂既有進度。 */
const workKey=()=>`${state.profile.team}|${G()}`;
const currentBoard=()=>state.workBoards[workKey()]||{order:[],assignments:{}};
function orderedWorkFeatures(){
  const order=currentBoard().order||[];
  return feats().slice().sort((a,b)=>{
    const ai=order.indexOf(a.id),bi=order.indexOf(b.id);
    return (ai<0?999:ai)-(bi<0?999:bi);
  });
}
async function loadWorkData(){
  if(!api.on()||!state.profile.team) return false;
  let credential=workCredential;
  if(!teacherPw()&&!credential&&state.auth){
    const password=prompt('查看伙伴與分工，請再次輸入學生密碼驗證');
    if(password===null)return false;
    credential={account:state.auth.account,password};
  }
  if(!teacherPw()&&!credential)return false;
  const r=await api.post('getWorkData',{team:state.profile.team,group:G(),credential},teacherPw());
  if(!r||!r.ok) return false;
  if(credential)workCredential=credential;
  state.featureConfig=r.data.featureConfig||{};
  state.roster=r.data.roster||[];
  state.workBoards[workKey()]=r.data.board||{order:[],assignments:{}};
  saveLocal(); renderFeat(); renderWork(); renderDash();
  return true;
}
function renderWork(){
  const el=$('#tab-work'); if(!el) return;
  if(!state.auth&&!teacherPw()){
    el.innerHTML='<div class="card"><h2>👥 工作分配</h2><p class="sub">請先用學生帳號登入，才能查看同隊伙伴與分配必做功能。</p></div>';
    return;
  }
  const f=orderedWorkFeatures(), board=currentBoard();
  const members=state.roster.filter(member=>member.team===state.profile.team);
  const label=member=>`${esc(maskName(member.name))}（${esc(member.account)}）`;
  el.innerHTML=`<div class="card"><h2>👥 工作分配</h2>
    <p class="sub">${state.profile.team?`隊伍：${esc(state.profile.team)}。將必做功能分配給伙伴；勾選完成仍在「必做功能」頁。`:'登入學生帳號後，即可查看同隊伙伴與分工。'}</p>
    ${state.profile.team?`<div class="row"><button class="btn ghost" data-work-refresh>☁️ 重新讀取分工</button>
      <span id="workStatus" class="sub">拖拉項目可調整此隊順序；也可用上下按鈕。</span></div>
      <h3>我的伙伴</h3><div class="row">${members.length?members.map(m=>`<span class="pill">👤 ${label(m)}</span>`).join(''):'<span class="sub">此隊尚無可顯示的學生帳號；若已有帳號，請按「重新讀取分工」。</span>'}</div>
      <div id="workList">${f.map((item,i)=>`<div class="item work-row" draggable="true" data-work-id="${esc(item.id)}">
        <div class="bd"><div class="nm">☰ ${esc(item.name)} <small>${esc(item.id)}</small></div><div class="cd">${esc(item.cond)}</div>
          <div class="row noprint"><label>負責伙伴 <select data-assign="${esc(item.id)}"><option value="">尚未分配</option>
          ${members.map(m=>`<option value="${esc(m.account)}" ${board.assignments?.[item.id]===m.account?'selected':''}>${label(m)}</option>`).join('')}</select></label>
          <button class="btn ghost" data-work-move="${esc(item.id)}" data-dir="-1" ${i===0?'disabled':''}>↑ 上移</button>
          <button class="btn ghost" data-work-move="${esc(item.id)}" data-dir="1" ${i===f.length-1?'disabled':''}>↓ 下移</button></div>
        </div></div>`).join('')}</div>`:''}</div>`;
  el.onclick=async e=>{
    if(e.target.closest('[data-work-refresh]')){ const ok=await loadWorkData(); toast(ok?'已重新讀取分工':'分工讀取失敗，請檢查 GAS 連線'); return; }
    const b=e.target.closest('[data-work-move]'); if(!b)return;
    const order=orderedWorkFeatures().map(x=>x.id), at=order.indexOf(b.dataset.workMove), to=at+Number(b.dataset.dir);
    if(to<0||to>=order.length)return;
    [order[at],order[to]]=[order[to],order[at]];
    await updateWorkBoard({order});
  };
  el.onchange=async e=>{
    const s=e.target.closest('[data-assign]'); if(!s)return;
    await updateWorkBoard({assignments:{...currentBoard().assignments,[s.dataset.assign]:s.value}});
  };
  const list=el.querySelector('#workList');
  if(list){let dragged='';
    list.ondragstart=e=>{const row=e.target.closest('[data-work-id]'); if(row){dragged=row.dataset.workId;e.dataTransfer.effectAllowed='move';}};
    list.ondragover=e=>{if(e.target.closest('[data-work-id]'))e.preventDefault();};
    list.ondrop=async e=>{e.preventDefault();const row=e.target.closest('[data-work-id]');if(!row||!dragged||row.dataset.workId===dragged)return;
      const order=orderedWorkFeatures().map(x=>x.id), from=order.indexOf(dragged),to=order.indexOf(row.dataset.workId);
      order.splice(from,1);order.splice(to,0,dragged);dragged='';await updateWorkBoard({order});};
  }
}
async function updateWorkBoard(patch){
  if(!state.profile.team)return;
  let credential=workCredential;
  if(!teacherPw()&&!credential&&state.auth){
    const password=prompt('本次修改分工，請輸入你的學生密碼驗證');
    if(password===null)return;
    credential={account:state.auth.account,password};
  }
  if(!teacherPw()&&!credential){toast('請先登入學生帳號，才能同步分工');return;}
  const board={...currentBoard(),...patch};
  state.workBoards[workKey()]=board;saveLocal();renderWork();
  const r=await api.post('saveWorkBoard',{team:state.profile.team,group:G(),board,credential},teacherPw());
  if(r&&r.ok){workCredential=credential;toast('分工已存到雲端');}
  else toast('雲端儲存失敗；暫存於本機，請檢查登入與 GAS 部署',4000);
}
function featureEditor(item){
  return `<div class="teacher-feature noprint tonly" draggable="true" data-feature-id="${esc(item.id)}">
    <div class="row"><strong>☰ ${esc(item.id)}　教師編輯</strong>
      <button class="btn ghost" data-feature-move="${esc(item.id)}" data-dir="-1">↑</button>
      <button class="btn ghost" data-feature-move="${esc(item.id)}" data-dir="1">↓</button></div>
    <input data-feature-name="${esc(item.id)}" value="${esc(item.name)}" aria-label="功能名稱">
    <textarea data-feature-cond="${esc(item.id)}" rows="2" aria-label="完成條件">${esc(item.cond)}</textarea>
    <label>優先順序 <select data-feature-pri="${esc(item.id)}">${[1,2,3].map(n=>`<option value="${n}" ${Number(item.pri)===n?'selected':''}>${n}</option>`).join('')}</select></label>
    <button class="btn" data-feature-save="${esc(item.id)}">儲存這項設定</button></div>`;
}
async function saveFeatureConfig(config){
  if(!teacherPw())return toast('請先以老師身分登入');
  state.featureConfig[G()]=config;saveLocal();renderFeat();renderWork();renderDash();
  const r=await api.post('saveFeatureConfig',{group:G(),config},teacherPw());
  toast(r&&r.ok?'必做功能已存到 GAS':'GAS 儲存失敗；本機保留草稿',3500);
}
