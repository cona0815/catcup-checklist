/* 依必做項目提供圖示流程；設備、文件與 AI 用流程圖，標準積木用 Scratch 3 圖形。 */
const visualFlows={
 A01:[['🏠','標題首頁'],['▶️','按開始'],['📣','T1_PLAY'],['🎬','第一個任務']],
 A02:[['🌅','任務一背景'],['📣','T2_PLAY'],['🏞️','任務二背景'],['📣','T3_PLAY'],['🌃','任務三背景']],
 A03:[['👤','選主角'],['🎭','換造型'],['➡️','移動'],['✨','觀察變化']],
 A04:[['🎙️','錄一段語音'],['🔊','開始播放'],['💬','同時說字幕'],['👂','聽完再下一句']],
 A05:[['🎵','選背景音樂'],['🎬','進入場景'],['🔔','動作配音效'],['🎧','調整音量']],
 A06:[['🟦','準備遮罩角色'],['🌫️','淡出淡入'],['➡️','第二次滑動'],['✨','清除效果']],
 A08:[['📷','鏡頭開啟'],['👋','做指定動作'],['📣','劇情前進'],['⌨️','備援也能前進']],
 A09:[['👋','偵測動作'],['🔒','鎖住一次'],['📣','前進一幕'],['⏱️','冷卻後解鎖']],
 A10:[['🎬','最後任務'],['📣','END'],['🎉','出現片尾'],['💡','寫學到什麼']],
 A12:[['📥','下載範本'],['📝','寫五段故事'],['🎞️','每任務三分鏡'],['🔍','對照作品']],
 A13:[['🔌','先接耳機與 USB 鏡頭'],['⚙️','在電腦設定好裝置'],['🧪','先測聲音與鏡頭'],['🐱','再開啟 Scratch'],['✅','在 Scratch 測試一次']],
 A14:[['📁','建立隊名資料夾'],['💾','另存 .sb3'],['🧩','匯出 .sprite3'],['🔌','複製到 USB'],['✅','重開確認']],
 A15:[['📥','下載 CC BY-NC-SA 圖示'],['🧩','上傳為角色或背景素材'],['🏠','放在標題 HOME 頁'],['✅','檢查清楚、不遮住按鈕']],
 G01:[['🏠','HOME'],['▶️','按開始'],['📣','MENU'],['🗺️','選擇關卡']],
 G02:[['🎮','寫操作'],['➕','列加減分'],['🏁','寫完成條件'],['▶️','按開始']],
 G03:[['🔄','重設分數時間'],['🎮','操作主角'],['🎲','隨機出現物件'],['➕','碰撞計分'],['🏁','停止並結算']],
 G04:[['🎮','第一關：收集'],['🧠','第二關：分類'],['🔀','選不同玩法'],['✅','各自測一次']],
 G05:[['📷','鏡頭偵測'],['✋','手勢操控'],['🎮','主角動作'],['⌨️','備援可操作']],
 G07:[['✋','動作持續成立'],['🔒','鎖定觸發'],['⏱️','冷卻時間'],['⌨️','鍵盤救援']],
 G08:[['➕','得分音'],['➖','扣分音'],['🏁','過關音'],['❌','失敗音'],['⏱️','倒數提醒']],
 G09:[['🏁','成功／失敗'],['🖼️','顯示結果頁'],['🔁','按再玩'],['🧹','清分身歸零'],['🎮','重新開始']],
 G10:[['🏠','HOME'],['🎮','L1_PLAY'],['🏁','L1_DONE'],['🎮','L2_PLAY'],['🎉','END']],
 G11:[['📊','保存兩關分數'],['➕','計算總分'],['🧮','列統計次數'],['🖼️','結算畫面']],
 G14:[['📥','下載範本'],['🎯','一句玩家目標'],['🎮','每關玩法'],['➕','計分與完成條件'],['🔍','對照作品']],
 A_TEAM:[['🏷️','統一命名'],['🧑‍🤝‍🧑','各做一部分'],['🧩','合併同一檔'],['✅','兩人都測'],['💾','備份正式版']]
};
visualFlows.G15=visualFlows.A13;visualFlows.G16=visualFlows.A14;visualFlows.G17=visualFlows.A15;visualFlows.G_TEAM=visualFlows.A_TEAM;
const realBlockExamples={
 A01:'當 @greenFlag 被點擊\n廣播訊息 [HOME v]\n\n當角色被點擊\n廣播訊息 [T1_PLAY v]',
 A02:'當收到訊息 [T1_PLAY v]\n背景換成 [T1_PLAY v]\n\n當收到訊息 [T2_PLAY v]\n背景換成 [T2_PLAY v]',
 A03:'當收到訊息 [T1_PLAY v]\n顯示\n造型換成 [開心 v]\n移動 (50) 點',
 A04:'當收到訊息 [T1_PLAY v]\n播放音效 [錄音1 v]\n說出 [你好！我們出發吧。] 持續 (2) 秒\n播放音效 [錄音2 v]\n說出 [下一段故事開始了！] 持續 (3) 秒',
 A05:'當收到訊息 [T1_PLAY v]\n播放音效 [背景音樂 v]\n\n當收到訊息 [T1_動作 v]\n播放音效 [音效1 v]',
 A06:'當收到訊息 [T2_PLAY v]\n重複 (10) 次\n  效果 [幻影 v] 改變 (10)\n  等待 (0.1) 秒\nend\n隱藏\n圖像效果清除',
 A10:'當收到訊息 [END v]\n背景換成 [END v]',
 G01:'當 @greenFlag 被點擊\n廣播訊息 [HOME v]\n\n當角色被點擊\n廣播訊息 [MENU v]',
 G03:'當收到訊息 [L1_PLAY v]\n變數 [分數 v] 設為 (0)\n重複無限次\n  如果 <碰到 [寶物 v] ?> 那麼\n    變數 [分數 v] 改變 (1)\n    等待 (0.5) 秒\n  end\nend',
 G08:'當收到訊息 [得分 v]\n播放音效 [得分音 v]\n\n當收到訊息 [失敗 v]\n播放音效 [失敗音 v]',
 G09:'當角色被點擊\n變數 [分數 v] 設為 (0)\n廣播訊息 [L1_PLAY v]',
 G10:'當角色被點擊\n廣播訊息 [L2_INFO v]\n\n當收到訊息 [L2_INFO v]\n背景換成 [L2_INFO v]',
 G11:'當收到訊息 [END v]\n變數 [總分 v] 設為 ((第一關分數) + (第二關分數))'
};
realBlockExamples.A02+='\n\n當收到訊息 [T3_PLAY v]\n背景換成 [T3_PLAY v]';
realBlockExamples.G03='當收到訊息 [L1_PLAY v]\n變數 [分數 v] 設為 (0)\n變數 [遊戲中 v] 設為 (1)\n\n當分身產生\n定位到 x: (隨機取數 (-200) 到 (200)) y: (100)\n顯示\n等待直到 <碰到 [主角 v]？>\n變數 [分數 v] 改變 (1)\n分身刪除\n\n當收到訊息 [L1_CLEAR v]\n分身刪除';
function enhanceFeatureGuide(id){
 const path=visualFlows[id];if(!path)return;
 const box=document.createElement('div');box.className='card visual-guide';
 const height=path.length*112+8;
 box.innerHTML=`<h2>🧭 看圖走一次</h2><svg viewBox="0 0 620 ${height}" role="img" aria-label="${esc(lessons[id][1])}操作流程"><defs><marker id="step-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#4979ba"/></marker></defs>${path.map(([icon,label],i)=>`<rect x="50" y="${i*112+8}" width="520" height="86" rx="16" fill="${i===path.length-1?'#e5f8eb':'#edf4ff'}" stroke="${i===path.length-1?'#68b37d':'#8eb2e2'}" stroke-width="2"/><text x="88" y="${i*112+61}" font-size="36">${icon}</text><text x="146" y="${i*112+61}" fill="#183b66" font-size="25" font-weight="750">${esc(label)}</text>${i<path.length-1?`<path d="M310 ${i*112+94}V${i*112+114}" stroke="#4979ba" stroke-width="3" marker-end="url(#step-arrow)"/>`:''}`).join('')}</svg><p class="visual-tip">👇 依箭頭順序做，最後一格確認完成。</p>`;
 document.querySelector('#lesson').prepend(box);
 if(id==='G03'){const note=document.createElement('p');note.className='visual-tip';note.textContent='分身範例：寶物原件先隱藏，由生成程式建立分身。此圖是計分與清理部分；倒數、生成與完成判斷另接。';document.querySelector('#example-card').append(note);}
 document.querySelectorAll('.step').forEach((step,i)=>{const icon=document.createElement('span');icon.className='step-icon';icon.textContent=path[Math.min(i,path.length-1)][0];step.prepend(icon);});
 if(realBlockExamples[id]){const pre=document.querySelector('#example');pre.textContent=realBlockExamples[id];pre.classList.add('blocks');document.querySelector('#example-card h2').textContent='🧱 Scratch 3 積木範例';}
 else document.querySelector('#example-card h2').textContent='🗺️ 操作與流程示意';
 if(id==='A12'||id==='G14'){const link=document.createElement('a');link.href=`assets/past-papers/${id==='A12'?'animation':'game'}-template.docx`;link.textContent='📥 下載 Word 範本';link.className='back';link.download='';document.querySelector('#related').prepend(link);}
}
