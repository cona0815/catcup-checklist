/* 獨立教材資源：公開讀取，老師維護。 */
let resourceItems=[];
function resourceFallback(){
  return BASIC_COURSE.sites.map((item,index)=>({id:'site-'+(index+1),kind:'site',title:item.title,url:item.url,imageUrl:''}));
}
async function loadResources(){
  const response=await api.post('getResourceData');
  resourceItems=response?.ok&&Array.isArray(response.data?.items)?response.data.items:resourceFallback();
  renderSites();renderCode();
}
function resourceList(kind){return resourceItems.filter(item=>item.kind===kind);}
function resourceForm(kind){
  if(!teacherPw())return '';
  return `<form class="resource-form" data-resource-form="${kind}">
    <h3>${kind==='site'?'管理常用網頁':'管理常用程式碼'}</h3>
    <input type="hidden" name="id"><input type="hidden" name="imageUrl"><input type="hidden" name="imageFileId">
    <label>標題<input type="text" name="title" maxlength="100" required placeholder="例如：角色移動程式"></label>
    <label>連結<input type="url" name="url" maxlength="2000" required placeholder="https://..."></label>
    ${kind==='code'?`<label>圖片（可選，JPG／PNG／WebP）<input type="file" name="image" accept="image/jpeg,image/png,image/webp"></label>
      <label><input type="checkbox" name="removeImage"> 移除目前圖片</label><p class="sub">圖片會上傳到這個專案的 Google Drive，公開供網站訪客查看。</p>`:''}
    <div class="resource-actions"><button class="btn" type="submit">儲存資源</button><button class="btn ghost" type="reset">清空／取消編輯</button></div>
  </form>`;
}
function renderResourcePanel(kind){
  const panel=document.querySelector(kind==='site'?'#tab-sites':'#tab-code');
  if(!panel)return;
  const site=kind==='site',items=resourceList(kind);
  panel.innerHTML=`<div class="card"><h2>${site?'🔗 常用網頁':'🧱 常用程式碼'}</h2>
    <p class="sub">${site?'課堂、上傳與 Scratch 教學連結集中在此。':'整理可參考的程式寫法、作品連結與圖片。'}</p>
    <div class="resource-grid">${items.length?items.map(item=>`<article class="resource-item" data-resource-id="${esc(item.id)}">
      ${item.imageUrl?`<img src="${esc(item.imageUrl)}" alt="${esc(item.title)} 的範例圖片" loading="lazy">`:''}
      <strong>${esc(item.title)}</strong><a class="lk" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">🔗 開啟連結</a>
      ${teacherPw()?`<div class="resource-actions"><button class="btn ghost" data-resource-edit="${esc(item.id)}">編輯</button>
        <button class="btn danger" data-resource-delete="${esc(item.id)}">刪除</button></div>`:''}
    </article>`).join(''):'<p class="sub">目前沒有資源，老師可在下方新增。</p>'}</div>
    ${resourceForm(kind)}</div>`;
  panel.onclick=async event=>{
    const edit=event.target.closest('[data-resource-edit]');
    const remove=event.target.closest('[data-resource-delete]');
    if(!teacherPw()||(!edit&&!remove))return;
    const id=(edit||remove).dataset.resourceEdit||(edit||remove).dataset.resourceDelete;
    const item=resourceItems.find(value=>value.id===id&&value.kind===kind);
    if(!item)return;
    if(edit){
      const form=panel.querySelector('[data-resource-form]');
      for(const key of ['id','title','url','imageUrl','imageFileId'])form.elements[key].value=item[key]||'';
      form.elements.removeImage&&(form.elements.removeImage.checked=false);
      form.scrollIntoView({behavior:'smooth',block:'center'});
      return;
    }
    if(!confirm('確定刪除「'+item.title+'」？'))return;
    const response=await api.post('deleteResource',{id:item.id},teacherPw());
    if(!response?.ok)return toast('刪除失敗：'+(response?.error||'無法連線'),3500);
    await loadResources();toast('資源已刪除');
  };
  const form=panel.querySelector('[data-resource-form]');
  if(form)form.onsubmit=async event=>{
    event.preventDefault();
    if(!teacherPw())return toast('請先以老師身分登入');
    const title=form.elements.title.value.trim(),url=form.elements.url.value.trim();
    if(!title||!/^https:\/\//i.test(url))return toast('請填寫標題與 HTTPS 連結',3500);
    const payload={kind,id:form.elements.id.value,title,url,
      imageUrl:form.elements.removeImage?.checked?'':form.elements.imageUrl.value,
      imageFileId:form.elements.removeImage?.checked?'':form.elements.imageFileId.value};
    const file=form.elements.image?.files?.[0];
    if(file){
      try{
        const image=await prepareResourceImage(file);
        const uploaded=await api.post('uploadResourceImage',image,teacherPw());
        if(!uploaded?.ok)return toast('圖片上傳失敗：'+(uploaded?.error||'無法連線'),4500);
        payload.imageUrl=uploaded.data.imageUrl;payload.imageFileId=uploaded.data.imageFileId;
      }catch(error){return toast(error.message||'無法處理圖片',4500);}
    }
    const saved=await api.post('saveResource',payload,teacherPw());
    if(!saved?.ok)return toast('儲存失敗：'+(saved?.error||'無法連線'),4500);
    await loadResources();toast('資源已儲存');
  };
}
async function prepareResourceImage(file){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('請選擇 JPG、PNG 或 WebP 圖片');
  const bitmap=await createImageBitmap(file);
  try{
    for(const limit of [1400,1000,750]){
      const scale=Math.min(1,limit/Math.max(bitmap.width,bitmap.height));
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
      for(const quality of [.85,.72,.6]){
        const base64=canvas.toDataURL('image/jpeg',quality).split(',')[1];
        if(base64.length<=1450000)return {mime:'image/jpeg',base64};
      }
    }
    throw Error('圖片過大，請先縮小後再上傳');
  }finally{bitmap.close();}
}
