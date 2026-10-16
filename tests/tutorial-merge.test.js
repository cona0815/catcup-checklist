/* 新手版合併教學頁：步驟圖、積木、範本下載內容、動畫換幕表、手機版面 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');

/* 不靠套件讀 .sb3（zip）裡的 project.json */
function projectJson(file){
  const buf=fs.readFileSync(file);let i=buf.lastIndexOf(Buffer.from([0x50,0x4b,0x05,0x06]));
  const count=buf.readUInt16LE(i+10);let p=buf.readUInt32LE(i+16);
  for(let k=0;k<count;k++){
    const method=buf.readUInt16LE(p+10),size=buf.readUInt32LE(p+20),nameLen=buf.readUInt16LE(p+28),extra=buf.readUInt16LE(p+30),cmt=buf.readUInt16LE(p+32),off=buf.readUInt32LE(p+42);
    const name=buf.subarray(p+46,p+46+nameLen).toString();
    if(name==='project.json'){const ln=buf.readUInt16LE(off+26),le=buf.readUInt16LE(off+28);const data=buf.subarray(off+30+ln+le,off+30+ln+le+size);
      return JSON.parse((method===8?zlib.inflateRawSync(data):data).toString());}
    p+=46+nameLen+extra+cmt;
  }
  throw new Error('no project.json in '+file);
}
const GAME=['open','menu','1說明','1遊戲','1完成','2說明','2遊戲','2完成','成果'],ANIM=['open','1幕','2幕','3幕','結尾'];
{ /* 動畫完整例子：5 個角色、每個都有綠旗隱藏、每一幕只有一個換幕的人 */
  const pj=projectJson(path.join(root,'assets/templates/anim/example.sb3'));
  assert.deepEqual(pj.targets.slice(1).map(t=>t.name),['1標題','1開始鈕','1CC','1小明','2小美','2小狗','2結尾字']);
  const switches={};
  for(const t of pj.targets.slice(1)){
    const bl=Object.values(t.blocks);
    assert.ok(bl.some(b=>b.opcode==='event_whenflagclicked'&&t.blocks[b.next].opcode==='looks_hide'),t.name+' hides on green flag');
    for(const b of bl.filter(b=>b.opcode==='looks_switchbackdropto')){let h=b;while(h.parent)h=t.blocks[h.parent];const from=h.opcode==='event_whenthisspriteclicked'?'open':h.fields.BACKDROP[0];switches[from]=(switches[from]||0)+1;}
  }
  assert.deepEqual(switches,{open:1,'1幕':1,'2幕':1,'3幕':1},'one scene-changer per scene, none at 結尾');
}
for(const [kind,names,start1,start2,msgs] of [['game',GAME,'open','2說明',true],['anim',ANIM,'open','2幕',false]]){
  for(const n of [1,2]){
    const pj=projectJson(path.join(root,'assets/templates',kind,n+'.sb3')),st=pj.targets[0];
    assert.deepEqual(st.costumes.map(c=>c.name),names,kind+n+' backdrops');
    assert.deepEqual(Object.values(st.broadcasts).sort(),msgs?[...names].sort():[],kind+n+' messages');
    const flag=Object.values(st.blocks).find(b=>b.opcode==='event_whenflagclicked');
    const next=st.blocks[flag.next];
    const target=msgs?next.inputs.BROADCAST_INPUT[1][1]:st.blocks[next.inputs.BACKDROP[1]].fields.BACKDROP[0];
    assert.equal(target,n===1?start1:start2,kind+n+' green flag');
    if(msgs)for(const name of names)assert.ok(Object.values(st.blocks).some(b=>b.opcode==='event_whenbroadcastreceived'&&b.fields.BROADCAST_OPTION[0]===name),'receiver '+name);
    assert.equal(pj.targets.length,1,'templates start with no sprites');
  }
}
const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
if(!fs.existsSync(edge)){console.log('Templates checked; Edge unavailable, merge page browser test skipped');process.exit(0);}
(async()=>{
  const b=await chromium.launch({headless:true,executablePath:edge});
  try{
    const p=await b.newPage({viewport:{width:390,height:844}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
    await p.goto('file:///'+path.join(root,'tutorial-merge.html').replace(/\\/g,'/'));
    await p.locator('svg.scratchblocks-style-scratch3').first().waitFor();
    assert.equal(await p.locator('#two .steps>li').count(),4);
    assert.equal(await p.locator('#one .steps>li').count(),8);
    assert.equal(await p.locator('[data-pic] svg').count(),12);
    assert.equal(await p.locator('svg .sb3-obsolete').count(),0);
    assert.equal(await p.locator('pre.blocks:not(:has(svg))').count(),0,'all block text rendered');assert.equal(await p.locator('pre.blocks svg').count(),14);
    assert.match(await p.locator('.stop').innerText(),/不要用「檔案 → 從你的電腦挑選」打開二號的檔案/);
    const order=await p.evaluate(()=>[document.querySelector('.stop'),document.querySelector('#one')].map(e=>e.getBoundingClientRect().top));
    assert.ok(order[0]<order[1],'warning comes before 一號 steps');
    for(const [k,f] of [['game1','game/1.sb3'],['game2','game/2.sb3'],['anim1','anim/1.sb3'],['anim2','anim/2.sb3']]){
      const a=p.locator(`[data-template="${k}"]`);assert.equal(await a.getAttribute('href'),'assets/templates/'+f);assert.match(await a.getAttribute('download'),/^[12]\.sb3$/);
    }
    const ex=p.locator('[data-template="animExample"]');assert.equal(await ex.getAttribute('href'),'assets/templates/anim/example.sb3');assert.match(await ex.getAttribute('download'),/\.sb3$/);
    assert.equal(await p.locator('.storyboard').evaluate(img=>img.complete&&img.naturalWidth>0),true,'storyboard loads');
    assert.deepEqual(await p.locator('.ex-sprite h4').allInnerTexts(),['🎭 舞台','1標題','1開始鈕','1CC','1小明','2小美','2小狗','2結尾字']);
    const cols=await p.evaluate(()=>{const rows=[...document.querySelectorAll('#anim tbody tr')];return [1,2,3,4].map(i=>rows.filter(r=>r.cells[i].textContent.includes('換幕')).length);});
    assert.deepEqual(cols,[1,1,1,1],'one scene-changer per scene');
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
    assert.deepEqual(errors,[]);
    console.log('Merge guide: templates, 12 step pictures, Scratch blocks, warning order, one scene-changer per scene and phone layout passed');
  }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1);});
