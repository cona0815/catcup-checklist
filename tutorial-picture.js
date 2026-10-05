/* Picture-first presentation. Full instructions remain available on demand. */
(()=>{
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const drawings={
 screen:'<rect x="12" y="12" width="96" height="66" rx="8"/><path d="M60 78v16M35 94h50"/><path d="M30 43l15 15 37-31" stroke="#24a56a"/>',
 file:'<path d="M30 8h43l22 23v74H30z"/><path d="M73 8v23h22M42 48h40M42 63h40M42 78h26"/>',
 sound:'<path d="M20 44h20l24-20v72L40 76H20zM77 38q24 22 0 44M86 24q40 36 0 72"/>',
 camera:'<rect x="10" y="30" width="100" height="67" rx="12"/><circle cx="60" cy="64" r="22"/><path d="M30 30l9-16h38l12 16M91 43h7"/>',
 mouse:'<rect x="36" y="17" width="48" height="85" rx="24"/><path d="M60 17v33M36 50h48M90 14l13-9M96 29h15"/>',
 title:'<rect x="8" y="17" width="104" height="82" rx="12"/><path d="M30 39h60M60 39v43M43 83h34"/><path d="M16 6v9M6 17h9M104 104v9M110 99h8" stroke="#efa81b"/>',
 lock:'<rect x="24" y="50" width="72" height="55" rx="10"/><path d="M39 50V32a21 21 0 0142 0v18M60 70v17"/>',
 people:'<circle cx="35" cy="30" r="16"/><circle cx="85" cy="30" r="16"/><path d="M9 99V74a26 26 0 0152 0v25M61 99V74a24 24 0 0148 0v25"/>',
 move:'<path d="M10 60h100M10 60l20-20M10 60l20 20M110 60L90 40M110 60L90 80"/>',
 check:'<circle cx="60" cy="60" r="44"/><path d="M34 60l18 18 34-37" stroke="#269a63"/>'
};
function kind(text){
 if(/鏡頭|攝影|AI|手勢/.test(text))return 'camera';
 if(/聲|音效|錄音|耳機/.test(text))return 'sound';
 if(/備份|文件|USB|存檔|匯出|匯入|下載/.test(text))return 'file';
 if(/兩人|同伴|分工|共同/.test(text))return 'people';
 if(/鎖|冷卻|解鎖/.test(text))return 'lock';
 if(/標題|文字|字幕|造型/.test(text))return 'title';
 if(/移動|滑動|滑行/.test(text))return 'move';
 if(/按鈕|點擊|操作|鍵盤/.test(text))return 'mouse';
 return 'screen';
}
function icon(name,x,y){return '<g transform="translate('+x+' '+y+')" fill="none" stroke="#255ea6" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">'+drawings[name]+'</g>';}
function picture(title,index){
 const words=title.length>12?[title.slice(0,12),title.slice(12)]:[title];
 return '<svg class="picture-step" viewBox="0 0 440 235" role="img" aria-label="'+esc(title)+'圖解"><rect x="4" y="4" width="432" height="227" rx="18" fill="#edf4ff" stroke="#b7cfec"/><circle cx="32" cy="32" r="19" fill="#245ab1"/><text x="32" y="39" text-anchor="middle" font-size="20" fill="white">'+(index+1)+'</text>'+icon(kind(title),45,44)+'<path d="M196 104h54l-13-12m13 12l-13 12" fill="none" stroke="#6c88ad" stroke-width="6"/>'+icon('check',275,44)+words.map((t,i)=>'<text x="220" y="'+(184+i*27)+'" text-anchor="middle" fill="#173c6d" font-size="23" font-weight="bold">'+esc(t)+'</text>').join('')+'</svg>';
}
function fold(element,label){
 if(!element||element.closest('details'))return;
 const details=document.createElement('details');details.className='picture-details';
 const summary=document.createElement('summary');summary.textContent=label;
 element.before(details);details.append(summary,element);
}
document.querySelectorAll('.guide-panel').forEach((panel,index)=>{
 const title=panel.querySelector('h3').textContent.replace(/^\d+｜/,'');
 const iconBox=panel.querySelector('.guide-icon');iconBox.outerHTML=picture(title,index);
 const paragraphs=[...panel.querySelectorAll(':scope > p')];
 const details=document.createElement('details');details.className='picture-details';
 details.innerHTML='<summary>👆 不懂時，點這裡看說明</summary>';
 paragraphs.forEach(p=>details.append(p));panel.append(details);
});
document.querySelectorAll('.guide-reading,.guide-trouble').forEach(el=>fold(el,'🔎 看積木解說／找問題'));
// Retain long-form help without making children read it before the diagrams.
document.querySelectorAll('.steps').forEach(el=>fold(el,'📝 查看文字步驟'));
document.querySelectorAll('.deep-guide > .guide-caption').forEach(el=>fold(el,'ℹ️ 查看補充提醒'));
document.querySelectorAll('#lesson > .card').forEach(card=>{
 if(card.querySelector('.title-effect-demo')){
   const instructions=[...card.querySelectorAll(':scope > p')];
   const d=document.createElement('details');d.className='picture-details';d.innerHTML='<summary>🧱 看設定方法</summary>';
   instructions.forEach(p=>d.append(p));card.append(d);
 }
});
const main=document.querySelector('main');
if(main&&!document.querySelector('#lesson')){
 document.querySelectorAll('section.card').forEach(section=>{
  // Preserve actual blocks, flows, interactive buttons, downloads and warnings.
  section.querySelectorAll(':scope > p:not(.key):not(.callout):not(.guide-focus):not([id])').forEach(p=>{if(p.textContent.length>45)fold(p,'💡 看說明');});
 });
}
const style=document.createElement('style');style.textContent='.picture-step{width:100%;height:auto;display:block;margin:8px 0}.picture-details{border:1px solid #d3e1f1;border-radius:10px;padding:10px;margin:10px 0;background:white}.picture-details summary{cursor:pointer;color:#2059a3;font-weight:750;min-height:28px}.guide-panel h3{font-size:1.15rem}.picture-details table{margin-top:10px}.guide-panel{background:white}';document.head.append(style);
})();
