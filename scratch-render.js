/* Common rendering options: English is needed for structural "end" tokens.
   Keep all visible block labels in Traditional Chinese. */
(()=>{
if(!window.scratchblocks)return;
const render=scratchblocks.renderMatching.bind(scratchblocks);
scratchblocks.renderMatching=(selector,options={})=>{
  document.querySelectorAll(selector).forEach(pre=>{
    if(pre.querySelector('svg'))return;
    pre.textContent=pre.textContent.replace(/ \?>/g,'？>')
      .replace(/(?<!圖像)效果 \[幻影 v\]/g,'圖像效果 [幻影 v]');
    pre.dataset.blockSource=pre.textContent;
  });
  return render(selector,{...options,languages:['zh_tw','en']});
};
})();
