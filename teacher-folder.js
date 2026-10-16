/* teacher-folder.js v1.0（2026-10-16）
   「📁 老師資料夾」分頁：老師的 Google Drive 資料夾，學生登入後可瀏覽、下載。
   老師：新資料夾、上傳（可多檔／拖曳）、改名、移動、刪除（移到 Drive 垃圾桶）。
   學生：只能看、下載。
   後端路由：listTeacherFiles、getTeacherFile、teacherFileOp（TeacherFolder.gs v1.0）。 */
const TF_MAX=20*1024*1024;
let tfFolderId='',tfData=null,tfError='',tfLoading=false,tfBusy='',tfSeq=0;

function tfStyle(){
  if(document.querySelector('#tf-style'))return;
  const s=document.createElement('style');s.id='tf-style';
  s.textContent=`.tf-crumbs{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin:4px 0 10px;font-weight:700}
.tf-crumbs button{border:0;background:none;color:var(--brand);font:inherit;cursor:pointer;padding:4px 2px;text-decoration:underline}
.tf-crumbs span.cur{padding:4px 2px}
.tf-tools{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 10px}
.tf-tools .btn,.tf-tools label.btn{width:auto}
.tf-tools input[type=file]{display:none}
.tf-drop{border:2px dashed var(--line);border-radius:12px;padding:10px;text-align:center;color:var(--muted);font-size:.9rem;margin:0 0 10px}
.tf-drop.over{border-color:var(--brand);color:var(--brand);background:#4d97ff12}
.tf-list{display:grid;gap:8px}
.tf-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;border:1px solid var(--line);border-radius:12px;padding:8px 10px;min-width:0}
.tf-main{flex:1 1 200px;min-width:0;display:flex;align-items:center;gap:8px;border:0;background:none;font:inherit;color:inherit;text-align:left;cursor:pointer;padding:4px 0}
.tf-main .tf-ico{font-size:1.4rem;flex:none}
.tf-main .tf-name{font-weight:700;overflow-wrap:anywhere}
.tf-meta{font-size:.8rem;color:var(--muted)}
.tf-acts{display:flex;flex-wrap:wrap;gap:6px}
.tf-acts .btn{width:auto;padding:6px 10px;font-size:.85rem}
.tf-empty{color:var(--muted);text-align:center;padding:18px 0}
#tfMove select{width:100%;margin:8px 0}`;
  document.head.appendChild(s);
}
function tfCanRead(){return api.on()&&(workCredential||teacherPw());}
function tfIcon(name,mime){
  const ext=(String(name).match(/\.([^.]+)$/)||[])[1]?.toLowerCase()||'';
  if(ext==='sb3'||ext==='sprite3')return '🐱';
  if(ext==='pdf'||/google-apps\.document/.test(mime))return '📕';
  if(/^(png|jpe?g|gif|svg|webp)$/.test(ext))return '🖼';
  if(/^(mp3|wav|m4a|ogg)$/.test(ext))return '🔊';
  if(/^(mp4|mov|webm)$/.test(ext))return '🎬';
  if(/^(pptx?|odp)$/.test(ext)||/presentation/.test(mime))return '📊';
  if(/^(docx?|odt|txt)$/.test(ext))return '📝';
  if(ext==='zip')return '🗜';
  return '📄';
}
function tfSize(n){n=Number(n)||0;return n<1024?n+' B':n<1048576?Math.round(n/1024)+' KB':(n/1048576).toFixed(1)+' MB';}

function renderTeacherFolder(){
  tfStyle();
  const panel=$('#tab-tfold');if(!panel)return;
  const teacher=!!teacherPw();
  if(!tfCanRead()){
    panel.innerHTML=`<div class="card"><h2>📁 老師資料夾</h2><p class="bad-txt" id="tfNeedLogin">${api.on()?'先用學生帳號登入，才能看老師的檔案。':'目前沒有連雲端，看不到老師資料夾。'}</p></div>`;
    return;
  }
  const d=tfData,crumbs=d?d.path:[{id:'',name:'老師資料夾'}];
  const items=d?[...d.folders.map(f=>({...f,kind:'folder'})),...d.files.map(f=>({...f,kind:'file'}))]:[];
  panel.innerHTML=`<div class="card"><h2>📁 老師資料夾</h2>
    <p class="sub">${teacher?'放在你的 Google Drive「貓咪盃老師資料夾」。學生登入後只能看、下載，不能改。'+(d?.rootUrl?` <a href="${esc(d.rootUrl)}" target="_blank" rel="noopener">在 Drive 開啟</a>`:''):'老師放的檔案。按「⬇ 下載」就能拿到。'}</p>
    <nav class="tf-crumbs" aria-label="資料夾位置">${crumbs.map((c,i)=>i===crumbs.length-1?`<span class="cur">${esc(c.name)}</span>`:`<button data-tf-go="${esc(c.id)}">${esc(c.name)}</button><span>›</span>`).join('')}</nav>
    ${teacher?`<div class="tf-tools"><button class="btn" id="tfMkdir">➕ 新資料夾</button>
      <label class="btn" id="tfUpLabel">⬆ 上傳檔案<input type="file" id="tfUpload" multiple></label>
      <button class="btn ghost" id="tfRefresh">↻ 重新整理</button></div>
      <div class="tf-drop" id="tfDrop">也可以把檔案拖到這裡（每個 20 MB 以內）</div>`:''}
    ${tfBusy?`<p class="sub" id="tfBusy">⏳ ${esc(tfBusy)}</p>`:''}
    ${tfError?`<p class="bad-txt" id="tfError">❌ ${esc(tfError)}</p>`:''}
    <div class="tf-list" id="tfList">${tfLoading&&!d?'<p class="tf-empty">載入中…</p>':items.length?items.map(x=>tfRow(x,teacher)).join(''):d?'<p class="tf-empty">這個資料夾是空的。</p>':''}</div></div>`;
  panel.querySelectorAll('[data-tf-go]').forEach(b=>b.onclick=()=>tfOpen(b.dataset.tfGo));
  panel.querySelectorAll('[data-tf-dl]').forEach(b=>b.onclick=()=>tfDownload(b.dataset.tfDl,b));
  if(!teacher)return;
  $('#tfMkdir').onclick=tfMkdir;
  $('#tfRefresh').onclick=()=>loadTeacherFolder();
  $('#tfUpload').onchange=e=>{tfUploadFiles([...e.target.files]);e.target.value='';};
  const drop=$('#tfDrop');
  drop.ondragover=e=>{e.preventDefault();drop.classList.add('over');};
  drop.ondragleave=()=>drop.classList.remove('over');
  drop.ondrop=e=>{e.preventDefault();drop.classList.remove('over');tfUploadFiles([...(e.dataTransfer?.files||[])]);};
  panel.querySelectorAll('[data-tf-op]').forEach(b=>b.onclick=()=>{
    const row=b.closest('.tf-row'),it={id:row.dataset.id,kind:row.dataset.kind,name:row.dataset.name};
    ({rename:tfRename,move:tfMove,delete:tfDelete})[b.dataset.tfOp](it);
  });
}
function tfRow(x,teacher){
  const folder=x.kind==='folder';
  const main=folder?`<button class="tf-main" data-tf-go="${esc(x.id)}"><span class="tf-ico">📁</span><span><span class="tf-name">${esc(x.name)}</span><br><span class="tf-meta">資料夾</span></span></button>`
    :`<div class="tf-main"><span class="tf-ico">${tfIcon(x.name,x.mime)}</span><span><span class="tf-name">${esc(x.name)}</span><br><span class="tf-meta">${/google-apps/.test(x.mime||'')?'Google 檔案（下載成 PDF）':tfSize(x.size)}${x.updated?'・'+esc(x.updated):''}</span></span></div>`;
  const acts=[folder?'':`<button class="btn" data-tf-dl="${esc(x.id)}">⬇ 下載</button>`,
    teacher?`<button class="btn ghost" data-tf-op="rename">✏️ 改名</button><button class="btn ghost" data-tf-op="move">📦 移動</button><button class="btn ghost" data-tf-op="delete">🗑 刪除</button>`:''].join('');
  return `<div class="tf-row" data-id="${esc(x.id)}" data-kind="${x.kind}" data-name="${esc(x.name)}">${main}${acts?`<div class="tf-acts">${acts}</div>`:''}</div>`;
}
async function loadTeacherFolder(id=tfFolderId){
  if(!tfCanRead()){renderTeacherFolder();return;}
  const seq=++tfSeq;tfLoading=true;tfError='';renderTeacherFolder();
  const r=await api.post('listTeacherFiles',{folderId:id,credential:workCredential},teacherPw());
  if(seq!==tfSeq)return;
  tfLoading=false;
  if(r?.ok){tfData=r.data;tfFolderId=r.data.folder.id;}
  else{tfError=r?.error||'連不到雲端';if(id&&/找不到/.test(tfError)){tfFolderId='';}}
  renderTeacherFolder();
}
function tfOpen(id){tfFolderId=id||'';loadTeacherFolder(tfFolderId);}
async function tfDownload(id,button){
  const old=button.textContent;button.disabled=true;button.textContent='下載中…';
  const r=await api.post('getTeacherFile',{id,credential:workCredential},teacherPw());
  button.disabled=false;button.textContent=old;
  if(!r?.ok){toast('下載失敗：'+(r?.error||'連不到雲端'),4000);return;}
  const bytes=Uint8Array.from(atob(r.data.base64),c=>c.charCodeAt(0));
  const url=URL.createObjectURL(new Blob([bytes],{type:r.data.mime||'application/octet-stream'}));
  const a=document.createElement('a');a.href=url;a.download=r.data.name||'檔案';document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}
async function tfOp(payload,busy){
  tfBusy=busy;renderTeacherFolder();
  const r=await api.post('teacherFileOp',payload,teacherPw());
  tfBusy='';
  if(!r?.ok){toast('沒有成功：'+(r?.error||'連不到雲端'),4000);renderTeacherFolder();return null;}
  return r.data;
}
async function tfMkdir(){
  const name=(prompt('新資料夾名稱','新資料夾')||'').trim();if(!name)return;
  if(await tfOp({op:'mkdir',parentId:tfFolderId,name},'建立資料夾…'))toast('✅ 已建立資料夾',2500);
  loadTeacherFolder();
}
function tfBase64(file){
  return new Promise((resolve,reject)=>{const r=new FileReader();
    r.onload=()=>resolve(String(r.result).split(',')[1]||'');r.onerror=()=>reject(r.error);r.readAsDataURL(file);});
}
async function tfUploadFiles(files){
  if(!files.length)return;
  const big=files.filter(f=>f.size>TF_MAX);
  if(big.length)toast('超過 20 MB 不能放：'+big.map(f=>f.name).join('、'),5000);
  const ok=files.filter(f=>f.size<=TF_MAX);let done=0;
  for(const f of ok){
    const r=await tfOp({op:'upload',parentId:tfFolderId,fileName:f.name,mime:f.type,base64:await tfBase64(f)},`上傳中 ${done+1}/${ok.length}：${f.name}`);
    if(r)done++;
  }
  if(done)toast(`✅ 已上傳 ${done} 個檔案`,2500);
  loadTeacherFolder();
}
async function tfRename(it){
  const name=(prompt('新名稱',it.name)||'').trim();if(!name||name===it.name)return;
  if(await tfOp({op:'rename',id:it.id,kind:it.kind,name},'改名中…'))toast('✅ 已改名',2500);
  loadTeacherFolder();
}
async function tfDelete(it){
  if(!confirm(`把「${it.name}」移到 Drive 垃圾桶？${it.kind==='folder'?'\n裡面的檔案也會一起移走。':''}\n（30 天內可以在 Drive 垃圾桶還原）`))return;
  if(await tfOp({op:'delete',id:it.id,kind:it.kind},'刪除中…'))toast('🗑 已移到垃圾桶',2500);
  loadTeacherFolder();
}
async function tfMove(it){
  tfBusy='讀取資料夾…';renderTeacherFolder();
  const r=await api.post('listTeacherFiles',{folderId:tfFolderId,tree:true},teacherPw());
  tfBusy='';renderTeacherFolder();
  if(!r?.ok||!r.data.tree){toast('讀不到資料夾清單',3000);return;}
  const choices=r.data.tree.filter(f=>f.id!==tfFolderId&&!(it.kind==='folder'&&(f.id===it.id||r.data.tree.find(x=>x.id===it.id)&&f.path.startsWith(r.data.tree.find(x=>x.id===it.id).path+' / '))));
  if(!choices.length){toast('沒有其他資料夾可以放，先建一個新資料夾',3500);return;}
  let dlg=$('#tfMove');
  if(!dlg){dlg=document.createElement('dialog');dlg.id='tfMove';document.body.appendChild(dlg);}
  dlg.innerHTML=`<form method="dialog"><h3 style="margin:0 0 6px">📦 移動「${esc(it.name)}」到</h3>
    <select id="tfMoveTo">${choices.map(f=>`<option value="${esc(f.id)}">${esc(f.path)}</option>`).join('')}</select>
    <div class="row"><button class="btn" value="ok" id="tfMoveOk">移過去</button><button class="btn ghost" value="cancel">取消</button></div></form>`;
  dlg.onclose=async()=>{
    if(dlg.returnValue!=='ok')return;
    const targetId=$('#tfMoveTo').value;
    if(await tfOp({op:'move',id:it.id,kind:it.kind,targetId},'移動中…'))toast('✅ 已移動',2500);
    loadTeacherFolder();
  };
  dlg.returnValue='';dlg.showModal();
}
