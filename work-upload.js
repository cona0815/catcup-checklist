/* work-upload.js v1.0（2026-10-15）
   作品上傳＋自動檢查＋AI 找 bug。
   學生：選 .sb3 → 立刻看自動檢查 → 上傳到老師的 Google Drive（隊名／日期資料夾，不覆蓋舊檔）。
   老師：看各隊上傳紀錄、開 Drive 檔案、看或重跑 AI 檢查。
   後端路由：uploadWork、listWorks、analyzeWork（WorkUpload.gs）。 */
const WU_MAX=15*1024*1024;
let wuChecked=null,wuFile=null,wuItems=[],wuTeamFilter='',wuBusy=false,wuLastUpload='';
const WU_ICON={bug:'🔴',warn:'🟠',tip:'💡'},WU_WORD={bug:'要修',warn:'注意',tip:'小提醒'};

function wuStyle(){
  if(document.querySelector('#wu-style'))return;
  const s=document.createElement('style');s.id='wu-style';
  s.textContent=`.wu-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:10px 0 14px}
.wu-step{border:1px solid var(--line);border-radius:12px;padding:10px;text-align:center;font-size:.9rem;font-weight:700}
.wu-step b{display:block;font-size:1.5rem;line-height:1.2}
.wu-drop{display:block;border:2px dashed var(--brand);border-radius:14px;padding:18px;text-align:center;cursor:pointer;font-weight:700;color:var(--brand)}
.wu-drop input{display:block;margin:10px auto 0;max-width:100%}
.wu-findings{list-style:none;padding:0;margin:10px 0;display:grid;gap:6px}
.wu-findings li{border:1px solid var(--line);border-left-width:5px;border-radius:10px;padding:8px 10px;font-size:.92rem;overflow-wrap:anywhere}
.wu-findings li.bug{border-left-color:var(--bad)}.wu-findings li.warn{border-left-color:var(--warn)}.wu-findings li.tip{border-left-color:var(--brand)}
.wu-findings small{display:block;color:var(--muted)}
.wu-ok{border:1px solid var(--ok);color:var(--ok);border-radius:10px;padding:10px;font-weight:700;overflow-wrap:anywhere}
.wu-list{display:grid;gap:10px;margin-top:10px}
.wu-item{border:1px solid var(--line);border-radius:12px;padding:10px 12px;min-width:0}
.wu-item .wu-head{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:baseline}
.wu-item .wu-head strong{overflow-wrap:anywhere}
.wu-count{font-size:.85rem;color:var(--muted)}
.wu-report{white-space:pre-wrap;overflow-wrap:anywhere;background:var(--bg);border-radius:10px;padding:10px;font:inherit;font-size:.9rem;margin:8px 0 0}
.wu-item details{margin-top:6px}
@media(max-width:560px){.wu-steps{grid-template-columns:1fr}.wu-step{display:flex;gap:10px;align-items:center;text-align:left}.wu-step b{font-size:1.2rem}}`;
  document.head.appendChild(s);
}
function wuCounts(checks){
  const c={bug:0,warn:0,tip:0};(checks||[]).forEach(x=>{if(c[x.level]!=null)c[x.level]++;});
  return `${WU_ICON.bug} ${c.bug}　${WU_ICON.warn} ${c.warn}　${WU_ICON.tip} ${c.tip}`;
}
function wuFindingsHtml(list){
  if(!list.length)return '<p class="wu-ok">✅ 自動檢查沒有發現問題。上傳後老師還會用 AI 再看一次。</p>';
  return `<ul class="wu-findings">${list.map(f=>`<li class="${esc(f.level)}"><small>${WU_ICON[f.level]||''} ${WU_WORD[f.level]||''}｜${esc(f.where)}</small>${esc(f.text)}</li>`).join('')}</ul>`;
}
function wuCanUpload(){return api.on()&&state.profile.team&&(workCredential||teacherPw());}
function wuGroupName(g){return g==='game'?'遊戲組':'動畫組';}

function renderUpload(){
  wuStyle();
  const panel=$('#tab-upload');if(!panel)return;
  const teacher=!!teacherPw(),team=state.profile.team;
  const who=team?`${esc(team)}（${wuGroupName(G())}）`:'（尚未選隊）';
  let uploadNote='';
  if(!api.on())uploadNote='<p class="bad-txt">目前沒有連雲端，只能先做自動檢查。</p>';
  else if(!team)uploadNote='<p class="bad-txt">先登入或選隊，才能上傳。</p>';
  else if(!workCredential&&!teacher)uploadNote='<p class="bad-txt">先用學生帳號登入，才能上傳。</p>';
  panel.innerHTML=`<div class="card"><h2>📤 作品上傳</h2>
    <p class="sub">上傳到老師的 Google Drive：${who} → 今天日期的資料夾。每次上傳都另存一份，不會蓋掉舊檔。</p>
    <div class="wu-steps"><div class="wu-step"><b>①</b>選 .sb3 檔</div><div class="wu-step"><b>②</b>看自動檢查</div><div class="wu-step"><b>③</b>按上傳</div></div>
    <label class="wu-drop">📁 選作品檔（1.sb3、2.sb3 或 完成.sb3）<input type="file" id="wuFile" accept=".sb3"></label>
    <div id="wuResult">${wuChecked?wuResultHtml():''}</div>
    ${uploadNote}
    <div class="row" style="margin-top:10px"><button class="btn" id="wuUpload" ${wuFile&&wuCanUpload()&&!wuBusy?'':'disabled'}>${wuBusy?'上傳中…':'☁️ 上傳'}</button></div>
    ${wuLastUpload?`<p class="wu-ok" id="wuDone">✅ 已上傳：${esc(wuLastUpload)}</p>`:''}
  </div>
  <div class="card" style="margin-top:14px"><h2>${teacher?'🗂 各隊上傳紀錄':'🗂 本隊上傳紀錄'}</h2>
    ${teacher?`<p class="sub">AI 檢查結果只有老師看得到。按檔名可開 Drive 檔案。</p><div class="row"><label>隊伍
      <select id="wuTeam"><option value="">全部隊伍</option>${[...new Set([...(state.teacherStudents||[]).map(s=>s.team),...wuItems.map(x=>x.team),wuTeamFilter].filter(Boolean))].sort().map(t=>`<option ${t===wuTeamFilter?'selected':''}>${esc(t)}</option>`).join('')}</select></label>
      <button class="btn ghost" id="wuRefresh">↻ 重新整理</button></div>`:'<p class="sub">只顯示自己這隊。</p>'}
    <div class="wu-list" id="wuList">${wuListHtml()}</div></div>`;
  panel.querySelector('#wuFile').onchange=e=>wuPick(e.target.files[0]);
  panel.querySelector('#wuUpload').onclick=wuUpload;
  const sel=panel.querySelector('#wuTeam');if(sel)sel.onchange=()=>{wuTeamFilter=sel.value;loadUploads();};
  const ref=panel.querySelector('#wuRefresh');if(ref)ref.onclick=loadUploads;
  panel.querySelector('#wuList').onclick=e=>{const b=e.target.closest('[data-wu-ai]');if(b)wuAnalyze(b.dataset.wuAi,b);};
}
function wuResultHtml(){
  if(wuChecked.error)return `<p class="bad-txt">❌ ${esc(wuChecked.error)}</p>`;
  const s=wuChecked.stats;
  return `<h3>② 自動檢查：${esc(wuFile?.name||'')}</h3>
    <p class="sub">角色 ${s.sprites}・背景 ${s.backdrops}・積木 ${s.blocks}・訊息 ${s.broadcasts}　${wuCounts(wuChecked.findings)}</p>
    ${wuFindingsHtml(wuChecked.findings)}`;
}
function wuListHtml(){
  if(!api.on())return '<p class="sub">沒有連雲端。</p>';
  if(!wuItems.length)return '<p class="sub">還沒有上傳紀錄。</p>';
  const teacher=!!teacherPw();
  return wuItems.map(it=>`<article class="wu-item">
    <div class="wu-head"><strong>${teacher&&it.fileUrl?`<a class="lk" href="${esc(it.fileUrl)}" target="_blank" rel="noopener">${esc(it.fileName)}</a>`:esc(it.fileName)}</strong>
      <span class="wu-count">${esc(it.time)}・${teacher?esc(it.team)+'（'+wuGroupName(it.group)+'）・':''}${esc(teacher||typeof maskName!=='function'?it.name:maskName(it.name))||esc(it.account)}</span>
      <span class="wu-count">${wuCounts(it.checks)}</span></div>
    ${it.checks?.length?`<details><summary>自動檢查 ${it.checks.length} 項</summary>${wuFindingsHtml(it.checks)}</details>`:''}
    ${teacher?wuAiHtml(it):`<p class="wu-count">🤖 AI 檢查：${esc(it.aiStatus||'等待中')}</p>`}
  </article>`).join('');
}
function wuAiHtml(it){
  const running=it.aiStatus==='檢查中';
  return `<div class="row" style="margin-top:6px"><span class="wu-count">🤖 AI：${esc(it.aiStatus||'尚未檢查')}${it.aiTime?'・'+esc(it.aiTime):''}</span>
    <button class="btn ghost" data-wu-ai="${esc(it.id)}" ${running?'disabled':''}>${it.aiReport?'重新 AI 檢查':'🤖 AI 找 bug'}</button></div>
    ${it.aiReport?`<details open><summary>AI 檢查報告</summary><pre class="wu-report">${esc(it.aiReport)}</pre></details>`:''}`;
}

async function wuPick(file){
  wuFile=null;wuChecked=null;wuLastUpload='';
  if(!file){renderUpload();return;}
  if(!/\.sb3$/i.test(file.name))wuChecked={error:'請選 .sb3 檔。'};
  else if(file.size>WU_MAX)wuChecked={error:'檔案超過 15 MB，請先刪掉用不到的音效或造型。'};
  else{
    try{wuChecked=await Sb3Check.readSb3(file);wuFile=file;}
    catch(e){wuChecked={error:'讀不到這個檔案：'+(e.message||e)};}
  }
  renderUpload();
}
function wuBase64(file){
  return new Promise((resolve,reject)=>{const r=new FileReader();
    r.onload=()=>resolve(String(r.result).split(',')[1]||'');r.onerror=()=>reject(r.error);r.readAsDataURL(file);});
}
async function wuUpload(){
  if(!wuFile||!wuCanUpload()||wuBusy)return;
  wuBusy=true;renderUpload();
  try{
    const base64=await wuBase64(wuFile);
    const r=await api.post('uploadWork',{team:state.profile.team,group:G(),credential:workCredential,fileName:wuFile.name,base64,
      checks:wuChecked.findings,summary:wuChecked.summary},teacherPw());
    if(!r?.ok){toast('上傳失敗：'+(r?.error||'連不到雲端，請再按一次'),4000);return;}
    wuLastUpload=r.data.item.folder;wuFile=null;wuChecked=null;
    wuItems=[r.data.item,...wuItems.filter(x=>x.id!==r.data.item.id)];
    toast('✅ 上傳完成');
    api.post('analyzeWork',{id:r.data.item.id,credential:workCredential},teacherPw()).then(()=>loadUploads());
  }catch(e){toast('上傳失敗：'+(e.message||e),4000);}
  finally{wuBusy=false;renderUpload();}
}
async function loadUploads(){
  if(!api.on())return;
  const teacher=!!teacherPw();
  if(!teacher&&(!workCredential||!state.profile.team))return;
  const r=await api.post('listWorks',teacher?{team:wuTeamFilter}:{team:state.profile.team,group:G(),credential:workCredential},teacherPw());
  if(r?.ok){wuItems=r.data.items||[];renderUpload();}
}
async function wuAnalyze(id,button){
  button.disabled=true;button.textContent='AI 檢查中…（約 30 秒）';
  const r=await api.post('analyzeWork',{id},teacherPw());
  if(!r?.ok)toast(r?.error||'AI 檢查失敗',4500);
  await loadUploads();
}
