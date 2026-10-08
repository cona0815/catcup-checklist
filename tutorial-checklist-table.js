(()=>{
const rows=[
['檔案與角色'],
['★ 工作檔','存成 1.sb3','存成 2.sb3'],
['角色名稱','1主角、1開始、1返回','2主角、2開始、2返回'],
['其他角色','名稱前加 1；字幕用 1字幕','名稱前加 2；字幕用 2字幕'],
['背景名稱：廣播也用同一個名字'],
['首頁／選單','open／menu',''],
['說明／遊戲','1說明／1遊戲','2說明／2遊戲'],
['完成／成果','1完成','2完成／成果'],
['按鈕與廣播'],
['首頁按開始','廣播 menu',''],
['選單選關卡','第一關送 1說明；第二關送 2說明',''],
['說明頁按開始','廣播 1遊戲','廣播 2遊戲'],
['說明頁回選單','廣播 menu','廣播 menu'],
['任務完成','自動廣播 1完成','自動廣播 2完成'],
['完成頁按再玩','廣播 1遊戲','廣播 2遊戲'],
['完成頁下一步','廣播 2說明','廣播 成果'],
['成果頁從頭再玩','','廣播 open'],
['顯示、隱藏與重玩'],
['進入自己的關卡','顯示第一關角色','顯示第二關角色'],
['離開自己的關卡','隱藏角色、清分身、停止活動','隱藏角色、清分身、停止活動'],
['返回按鈕','只在 1說明 顯示','只在 2說明 顯示'],
['按再玩','重設位置、物品、時間和狀態','重設位置、物品、時間和狀態'],
['交付與合併'],
['★ 合併前備份','另存 1_備份.sb3','保留 2.sb3'],
['★ 角色檔','用「上傳角色」匯入','匯出所有 .sprite3 角色檔'],
['★ 背景圖','用「上傳背景」匯入','匯出 2說明、2遊戲、2完成、成果'],
['★ 程式說明表','收下並核對','填好角色、廣播、變數與操作方式'],
['舞台換背景','收到訊息 → 換同名背景','告訴一號要接哪些訊息'],
['匯入後核對','積木重新選新背景；核對變數','核對角色、造型、音效都有帶進來'],
['兩人一起測試'],
['從首頁玩到成果','操作一次','在旁檢查'],
['直接選第二關','確認可以進入','確認可以正常玩'],
['兩關都按再玩','第一關重新開始','第二關重新開始'],
['交換操作','換二號玩，自己檢查','從首頁完整玩一次'],
['★ 最後作品檔','存成 完成.sb3 到 USB','確認最後只交這一份'],
['重開確認','從 USB 打開 完成.sb3','確認角色、背景、聲音都在']
];
const section=document.querySelector('.single-checks');if(!section)return;
const guides=document.createElement('details');guides.innerHTML='<summary>📖 看一號／二號操作圖</summary>';
section.querySelectorAll('.player-check>details').forEach(d=>guides.append(d));
const col=section.querySelector('.player-columns');
const holder=document.createElement('div');holder.className='cooperation-table-wrap';
holder.innerHTML='<table class="cooperation-table"><thead><tr><th scope="col">檢核項目</th><th scope="col">① 一號選手</th><th scope="col">② 二號選手</th></tr></thead><tbody>'+rows.map((r,i)=>r.length===1?'<tr class="check-category"><th colspan="3" scope="rowgroup">'+r[0]+'</th></tr>':'<tr><th scope="row">'+r[0]+'</th>'+r.slice(1).map((t,p)=>'<td>'+(t?'<label><input type="checkbox" aria-label="'+(p+1)+'號：'+r[0]+'"><span>'+t+'</span></label>':'—')+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
col.replaceWith(holder);holder.after(guides);
section.querySelector('h2').textContent='雙人合作檢核表';
section.insertAdjacentHTML('afterbegin','<a class="lesson-link pdf-checklist" href="assets/checklists/cooperation-checklist.pdf" download="雙人合作檢核表.pdf">⬇ 下載一張 A4 PDF 檢核表</a><p class="lesson-tip">★ 必要檔案。正式繳交格式依比賽規定。</p>');
section.querySelector('.shared-check h2').textContent='流程示範與列印';
section.querySelector('.shared-check .player-items').remove();
document.querySelector('.naming-overview').insertAdjacentHTML('beforeend','<a class="lesson-link" href="#detailed-checklist">↓ 看一號／二號詳細檢核表</a>');section.id='detailed-checklist';
const style=document.createElement('style');style.textContent='.cooperation-table-wrap{overflow-x:auto;background:white;border-radius:12px;margin:16px 0}.cooperation-table{min-width:620px;width:100%;border-collapse:collapse;font-size:16px}.cooperation-table th,.cooperation-table td{border:1px solid #c5d4e3;padding:10px;vertical-align:top}.cooperation-table thead th{background:#dce9f7}.cooperation-table tbody th{width:20%;font-weight:600}.cooperation-table td{width:40%}.cooperation-table td:nth-child(2){background:#f4f8ff}.cooperation-table td:nth-child(3){background:#fbf5ff}.cooperation-table .check-category th{background:#e5edf6;color:#204674}.cooperation-table label{display:flex;gap:9px;align-items:flex-start;cursor:pointer}.cooperation-table input{width:20px;height:20px;flex-shrink:0;margin-top:3px}.pdf-checklist{margin-bottom:8px}';document.head.append(style);
})();
