/* work-upload.js v1.4（2026-10-16）
   作品上傳＋老師建議 PDF。
   學生：選 .sb3 → 上傳到老師的 Google Drive（隊名／日期資料夾，不覆蓋舊檔）；老師回覆後，登入就能看建議 PDF。
   老師：看各隊上傳紀錄、開 Drive 檔案、複製「給 Claude 的找 bug 說明」、把 Claude 產出的建議 PDF 傳回該筆紀錄。
   後端路由：uploadWork、listWorks、uploadFeedback、getFeedback（WorkUpload.gs v1.5；建議按鈕顯示回覆日期）。 */
const WU_MAX=15*1024*1024;
let wuFile=null,wuError='',wuItems=[],wuTeamFilter='',wuBusy=false,wuLastUpload='';

function wuStyle(){
  if(document.querySelector('#wu-style'))return;
  const s=document.createElement('style');s.id='wu-style';
  s.textContent=`.wu-steps{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0 14px}
.wu-step{border:1px solid var(--line);border-radius:12px;padding:10px;text-align:center;font-size:.9rem;font-weight:700}
.wu-step b{display:block;font-size:1.5rem;line-height:1.2}
.wu-drop{display:block;border:2px dashed var(--brand);border-radius:14px;padding:18px;text-align:center;cursor:pointer;font-weight:700;color:var(--brand)}
.wu-drop input{display:block;margin:10px auto 0;max-width:100%}
.wu-picked{margin:10px 0 0;font-weight:700;overflow-wrap:anywhere}
.wu-ok{border:1px solid var(--ok);color:var(--ok);border-radius:10px;padding:10px;font-weight:700;overflow-wrap:anywhere}
.wu-list{display:grid;gap:10px;margin-top:10px}
.wu-item{border:1px solid var(--line);border-radius:12px;padding:10px 12px;min-width:0}
.wu-item .wu-head{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:baseline}
.wu-item .wu-head strong{overflow-wrap:anywhere}
.wu-count{font-size:.85rem;color:var(--muted)}
.wu-item a.btn{text-decoration:none;width:auto}
.wu-new{border:2px solid var(--bad);border-radius:12px;padding:10px 12px;font-weight:700;margin:0 0 12px}
.wu-fb{display:inline-block;font-size:.85rem;font-weight:700;color:var(--ok)}
.wu-fb.unread{color:var(--warn)}
.wu-dot{display:inline-block;min-width:1.3em;padding:0 .35em;border-radius:99px;background:var(--bad);color:#fff;font-size:.75rem;line-height:1.3em;text-align:center;margin-left:4px}
@media(max-width:560px){.wu-step{display:flex;gap:10px;align-items:center;text-align:left}.wu-step b{font-size:1.2rem}}`;
  document.head.appendChild(s);
}
function wuCanUpload(){return api.on()&&state.profile.team&&(workCredential||teacherPw());}
function wuGroupName(g){return g==='game'?'遊戲組':'動畫組';}

function renderUpload(){
  wuStyle();
  const panel=$('#tab-upload');if(!panel)return;
  const teacher=!!teacherPw(),team=state.profile.team;
  const who=team?`${esc(team)}（${wuGroupName(G())}）`:'（尚未選隊）';
  let uploadNote='';
  if(!api.on())uploadNote='<p class="bad-txt">目前沒有連雲端，不能上傳。</p>';
  else if(!team)uploadNote='<p class="bad-txt">先登入或選隊，才能上傳。</p>';
  else if(!workCredential&&!teacher)uploadNote='<p class="bad-txt">先用學生帳號登入，才能上傳。</p>';
  const unread=teacher?0:wuItems.filter(x=>x.hasFeedback&&!x.feedbackSeen).length;
  wuNavBadge(unread);
  panel.innerHTML=`${unread?`<div class="card wu-new" id="wuUnread">📬 老師有 ${unread} 份新建議，看下面「本隊上傳紀錄」的「📄 看老師建議」。</div>`:''}<div class="card"><h2>📤 作品上傳</h2>
    <p class="sub">上傳到老師的 Google Drive：${who} → 今天日期的資料夾。每次上傳都另存一份，不會蓋掉舊檔。</p>
    <div class="wu-steps"><div class="wu-step"><b>①</b>選 .sb3 檔</div><div class="wu-step"><b>②</b>按上傳</div></div>
    <label class="wu-drop">📁 選作品檔（1.sb3、2.sb3 或 完成.sb3）<input type="file" id="wuFile" accept=".sb3"></label>
    ${wuFile?`<p class="wu-picked">已選：${esc(wuFile.name)}（${wuFile.size<1048576?Math.max(1,Math.round(wuFile.size/1024))+' KB':(wuFile.size/1048576).toFixed(1)+' MB'}）</p>`:''}
    ${wuError?`<p class="bad-txt" id="wuError">❌ ${esc(wuError)}</p>`:''}
    ${uploadNote}
    <div class="row" style="margin-top:10px"><button class="btn" id="wuUpload" ${wuFile&&wuCanUpload()&&!wuBusy?'':'disabled'}>${wuBusy?'上傳中…':'☁️ 上傳'}</button></div>
    ${wuLastUpload?`<p class="wu-ok" id="wuDone">✅ 已上傳：${esc(wuLastUpload)}</p>`:''}
  </div>
  <div class="card" style="margin-top:14px"><h2>${teacher?'🗂 各隊上傳紀錄':'🗂 本隊上傳紀錄'}</h2>
    ${teacher?`<p class="sub">① 開 Drive 檔案下載 .sb3 → ② 複製給 Claude，一起貼到 Claude 找 bug、做成 PDF → ③ 上傳建議 PDF，學生登入就看得到。</p><div class="row"><label>隊伍
      <select id="wuTeam"><option value="">全部隊伍</option>${[...new Set([...(state.teacherStudents||[]).map(s=>s.team),...wuItems.map(x=>x.team),wuTeamFilter].filter(Boolean))].sort().map(t=>`<option ${t===wuTeamFilter?'selected':''}>${esc(t)}</option>`).join('')}</select></label>
      <button class="btn ghost" id="wuRefresh">↻ 重新整理</button></div>`:'<p class="sub">只顯示自己這隊。</p>'}
    <div class="wu-list" id="wuList">${wuListHtml()}</div></div>`;
  panel.querySelector('#wuFile').onchange=e=>wuPick(e.target.files[0]);
  panel.querySelector('#wuUpload').onclick=wuUpload;
  const sel=panel.querySelector('#wuTeam');if(sel)sel.onchange=()=>{wuTeamFilter=sel.value;loadUploads();};
  const ref=panel.querySelector('#wuRefresh');if(ref)ref.onclick=loadUploads;
  panel.querySelector('#wuList').onclick=e=>{
    const copy=e.target.closest('[data-wu-copy]'),view=e.target.closest('[data-wu-view]');
    if(copy)wuCopy(copy.dataset.wuCopy);
    if(view)wuViewFeedback(view.dataset.wuView,view);
  };
  panel.querySelectorAll('[data-wu-fbfile]').forEach(input=>input.onchange=()=>wuUploadFeedback(input.dataset.wuFbfile,input.files[0]));
}
function wuListHtml(){
  if(!api.on())return '<p class="sub">沒有連雲端。</p>';
  if(!wuItems.length)return '<p class="sub">還沒有上傳紀錄。</p>';
  const teacher=!!teacherPw();
  return wuItems.map(it=>`<article class="wu-item">
    <div class="wu-head"><strong>${esc(it.fileName)}</strong>
      <span class="wu-count">${esc(it.time)}・${teacher?esc(it.team)+'（'+wuGroupName(it.group)+'）・':''}${esc(teacher||typeof maskName!=='function'?it.name:maskName(it.name))||esc(it.account)}</span></div>
    ${teacher?`<div class="row" style="margin-top:6px">${it.fileUrl?`<a class="btn ghost" href="${esc(it.fileUrl)}" target="_blank" rel="noopener">⬇️ 開 Drive 檔案</a>`:''}
      <button class="btn ghost" data-wu-copy="${esc(it.id)}">📋 複製給 Claude</button>
      <label class="btn ghost">📄 ${it.hasFeedback?'重新上傳建議':'上傳建議 PDF'}<input type="file" accept="application/pdf,.pdf" data-wu-fbfile="${esc(it.id)}" hidden></label>
      ${it.hasFeedback?`<button class="btn ghost" data-wu-view="${esc(it.id)}">👀 看建議</button>`:''}</div>
      ${it.hasFeedback?`<p class="wu-fb ${it.feedbackSeen?'':'unread'}">已回覆 ${esc(it.feedbackTime)}・${it.feedbackSeen?'學生已讀 '+esc(it.feedbackSeen):'學生還沒看'}</p>`:''}`
    :it.hasFeedback?`<div class="row" style="margin-top:6px"><button class="btn" data-wu-view="${esc(it.id)}">📄 看老師建議${it.feedbackTime?`（${esc(String(it.feedbackTime).slice(5,10).replace('-','/'))}）`:''}${it.feedbackSeen?'':'<span class="wu-dot">新</span>'}</button></div>`
    :'<p class="wu-count">老師還沒回覆建議。</p>'}
  </article>`).join('');
}
function wuClaudeText(it){
  return ['請幫我找這份 Scratch 作品的 bug（附上 .sb3 檔）。',
    `隊名：${it.team}｜組別：${it.group==='game'?'國小遊戲 AI 互動組':'國小動畫 AI 互動組'}｜上傳者：${it.name||it.account}｜時間：${it.time}`,
    `檔案：${it.fileName}（Drive：${it.folder}）`,
    '',
    '本校規則：背景和廣播同名，open → menu → 1說明 → 1遊戲 → 1完成 → 2說明 → 2遊戲 → 2完成 → 成果；綠旗先到 open；任務達成自動廣播 1完成／2完成，不用按完成；只有 1說明、2說明 有回 menu；成果的從頭再玩送 open。',
    '1.sb3 一號（首頁、選單、第一關、正式舞台）；2.sb3 二號（第二關、成果，舞台程式只是臨時測試）；完成.sb3 合併後作品。角色如 1主角、2開始；PAGE、L1_、L2_ 變數要「適用於所有角色」。',
    '',
    '請列出：確定的 bug（位置→問題→怎麼修）、要按按看才能確定的問題，以及給國小學生的修改指令（一句話一個動作）。',
    `我確認內容後，請做成給學生看的 A4 PDF，檔名：建議_${String(it.fileName).replace(/\.sb3$/i,'')}.pdf`].join('\n');
}
async function wuCopy(id){
  const it=wuItems.find(x=>x.id===id);if(!it)return;
  const text=wuClaudeText(it);
  try{await navigator.clipboard.writeText(text);toast('📋 已複製，貼到 Claude 並附上 .sb3');}
  catch(e){prompt('請複製以下文字：',text);}
}
function wuPick(file){
  wuFile=null;wuError='';wuLastUpload='';
  if(file){
    if(!/\.sb3$/i.test(file.name))wuError='請選 .sb3 檔。';
    else if(file.size>WU_MAX)wuError='檔案超過 15 MB，請先刪掉用不到的音效或造型。';
    else wuFile=file;
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
    const r=await api.post('uploadWork',{team:state.profile.team,group:G(),credential:workCredential,fileName:wuFile.name,base64},teacherPw());
    if(!r?.ok){wuError='上傳失敗：'+(r?.error||'連不到雲端，請再按一次');return;}
    wuLastUpload=r.data.item.folder;wuFile=null;wuError='';
    wuItems=[r.data.item,...wuItems.filter(x=>x.id!==r.data.item.id)];
    toast('✅ 上傳完成');
    loadUploads();
  }catch(e){wuError='上傳失敗：'+(e.message||e);}
  finally{wuBusy=false;renderUpload();}
}
async function loadUploads(){
  if(!api.on())return;
  const teacher=!!teacherPw();
  if(!teacher&&(!workCredential||!state.profile.team))return;
  const r=await api.post('listWorks',teacher?{team:wuTeamFilter}:{team:state.profile.team,group:G(),credential:workCredential},teacherPw());
  if(r?.ok){wuItems=r.data.items||[];renderUpload();}
}
function wuNavBadge(n){
  const b=document.querySelector('nav button[data-tab="upload"]');if(!b)return;
  b.innerHTML='📤 作品上傳'+(n?`<span class="wu-dot" aria-label="${n} 份新建議">${n}</span>`:'');
}
function wuOpenPdf(win,base64,name){
  const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
  const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
  if(win&&!win.closed){win.location.href=url;}
  else{const a=document.createElement('a');a.href=url;a.download=name||'建議.pdf';document.body.appendChild(a);a.click();a.remove();}
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}
async function wuViewFeedback(id,button){
  const win=window.open('','_blank');
  if(win)win.document.write('<p style="font:20px sans-serif;padding:20px">建議載入中…</p>');
  const old=button.innerHTML;button.disabled=true;button.textContent='載入中…';
  const r=await api.post('getFeedback',{id,credential:workCredential},teacherPw());
  button.disabled=false;button.innerHTML=old;
  if(!r?.ok){if(win)win.close();toast('打不開建議：'+(r?.error||'連不到雲端'),4000);return;}
  wuOpenPdf(win,r.data.base64,r.data.name);
  if(!teacherPw())loadUploads();
}
async function wuUploadFeedback(id,file){
  if(!file)return;
  if(!/\.pdf$/i.test(file.name)&&file.type!=='application/pdf')return toast('請選 PDF 檔',3000);
  if(file.size>10*1024*1024)return toast('PDF 超過 10 MB',3000);
  toast('建議上傳中…',8000);
  const r=await api.post('uploadFeedback',{id,base64:await wuBase64(file)},teacherPw());
  if(!r?.ok)return toast('上傳失敗：'+(r?.error||'連不到雲端'),4000);
  toast('✅ 已傳給學生：'+r.data.feedbackName,3500);
  loadUploads();
}
