/* tutorial-merge.js v1.1（2026-10-16）：新手版合併教學的步驟圖（簡化的 Scratch 3 繁中介面示意）＋積木渲染 */
(function(){
const ONE='#2457c5',ONE_BG='#e8f0ff',TWO='#7b3fb0',TWO_BG='#f3eafc',HI='#ffd84d',BAD='#c62828',OK='#1b7f3b',INK='#163657';
const t=(x,y,s,size=15,o={})=>`<text x="${x}" y="${y}" font-size="${size}" font-family="Noto Sans TC,Microsoft JhengHei,sans-serif" font-weight="${o.w||700}" fill="${o.fill||INK}" text-anchor="${o.a||'start'}"${o.deco?` text-decoration="${o.deco}"`:''}>${s}</text>`;
const r=(x,y,w,h,fill,o={})=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx??8}" fill="${fill}" stroke="${o.stroke||'#b9c8dc'}" stroke-width="${o.sw||1.5}"${o.dash?' stroke-dasharray="6 4"':''}/>`;
const cursor=(x,y)=>`<path d="M${x} ${y}l0 22l6-6l5 10l4-2l-5-10l8 0z" fill="#fff" stroke="#111" stroke-width="1.5"/>`;
const menu=(x,y,items,hi)=>r(x,y,110,items.length*28+8,'#fff',{stroke:'#8aa0bb'})+items.map((s,i)=>(i===hi?r(x+4,y+4+i*28,102,26,HI,{stroke:HI,rx:5}):'')+t(x+14,y+23+i*28,s,15,{w:i===hi?800:600})).join('');
const thumb=(x,y,label,color,bg,o={})=>r(x,y,74,70,bg,{stroke:o.sel?color:'#b9c8dc',sw:o.sel?3:1.5})+`<circle cx="${x+37}" cy="${y+28}" r="14" fill="${color}" opacity=".85"/>`+t(x+37,y+62,label,12.5,{a:'middle',fill:color});
const svg=(body,h=180)=>`<svg viewBox="0 0 300 ${h}" role="img" xmlns="http://www.w3.org/2000/svg">${r(1,1,298,h-2,'#f7f9fc',{stroke:'#d4e0ef'})}${body}</svg>`;
const roundBtn=(cx,cy,icon,color)=>`<circle cx="${cx}" cy="${cy}" r="22" fill="${color}"/>${t(cx,cy+7,icon,20,{a:'middle',fill:'#fff'})}`;
const fileMenu=(hi)=>r(12,12,276,30,'#4d97ff',{stroke:'#4d97ff',rx:6})+t(24,33,'檔案',15,{fill:'#fff'})+t(74,33,'編輯',15,{fill:'#fff',w:500})+menu(14,46,['新建','從你的電腦挑選','下載到你的電腦'],hi);
const tick=(x,y)=>t(x,y,'✔',18,{fill:OK});const cross=(x,y)=>t(x,y,'✘',18,{fill:BAD});

const pics={
  save:()=>svg(fileMenu(2)+cursor(110,118)),
  exportSprite:()=>svg(t(12,26,'角色區',14,{w:800})+thumb(14,36,'2主角',TWO,TWO_BG,{sel:true})+thumb(96,36,'2終點',TWO,TWO_BG)+menu(150,40,['複製','匯出','刪除'],1)+cursor(70,70)+t(14,150,'右鍵 → 匯出',16,{fill:TWO,w:800})),
  exportBackdrop:()=>svg(r(10,10,280,30,'#fff')+t(26,31,'程式',14,{w:500})+r(80,12,62,26,'#e9f1ff',{stroke:'#4d97ff',rx:6})+t(94,31,'背景',14,{fill:'#2b6fe3',w:800})+t(160,31,'音效',14,{w:500})
    +thumb(14,52,'1遊戲',ONE,ONE_BG)+thumb(96,52,'2遊戲',TWO,TWO_BG,{sel:true})+menu(178,56,['複製','匯出','刪除'],1)+cursor(150,90)+t(14,150,'紫色的背景 → 右鍵 → 匯出',15,{fill:TWO,w:800}),180),
  downloads:()=>svg(r(10,10,280,160,'#fff')+t(20,32,'本機 › 下載',14,{w:800})+t(150,32,'類型',13,{w:800,fill:'#55708f'})+
    t(24,60,'2主角',14,{w:600})+t(150,60,'SPRITE3',13,{w:600})+t(222,60,'→角色',13,{fill:TWO})+
    t(24,84,'2終點',14,{w:600})+t(150,84,'SPRITE3',13,{w:600})+t(222,84,'→角色',13,{fill:TWO})+
    t(24,108,'2遊戲',14,{w:600})+t(150,108,'SVG',13,{w:600})+t(222,108,'→背景',13,{fill:TWO})+
    t(24,132,'2遊戲 (1)',14,{w:600,fill:'#888',deco:'line-through'})+t(150,132,'SVG',13,{w:600,fill:'#888'})+cross(226,133)+
    t(24,158,'USB：角色／背景 兩個資料夾',14,{fill:TWO,w:800})),
  backup:()=>svg(r(12,12,276,30,'#4d97ff',{stroke:'#4d97ff',rx:6})+t(24,33,'檔案',15,{fill:'#fff'})+r(120,16,110,22,'#fff',{stroke:'#fff',rx:4})+t(128,32,'1_備份',14,{fill:ONE,w:800})+t(236,33,'←改名',13,{fill:'#fff'})
    +menu(14,46,['新建','從你的電腦挑選','下載到你的電腦'],2)+t(150,150,'→ 1_備份.sb3',15,{fill:ONE,w:800})),
  uploadSprite:()=>svg(r(150,8,104,28,'#333',{stroke:'#333',rx:6})+t(202,27,'上傳角色',14,{fill:'#fff',a:'middle'})+
    `<g>${[44,78,112].map(y=>`<circle cx="236" cy="${y}" r="15" fill="#855cd6"/>`).join('')}</g>`+t(236,50,'⬆',16,{fill:'#fff',a:'middle'})+r(219,28,34,34,'none',{stroke:HI,sw:3,rx:17})+
    roundBtn(236,148,'🐱','#855cd6')+t(20,60,'貓咪按鈕',16,{w:800})+t(20,84,'＝加角色',15,{w:600})+t(20,130,'Ctrl＋點',15,{w:800,fill:ONE})+t(20,152,'一次選很多個',14,{w:600})+cursor(240,40)),
  checkSprite:()=>svg(thumb(14,24,'2主角',TWO,TWO_BG)+thumb(96,24,'2主角2',TWO,TWO_BG)+`<line x1="100" y1="28" x2="166" y2="90" stroke="${BAD}" stroke-width="4"/><line x1="166" y1="28" x2="100" y2="90" stroke="${BAD}" stroke-width="4"/>`
    +t(182,52,'名字多一個 2',14,{fill:BAD})+t(182,74,'＝放了兩次',14,{fill:BAD})+t(14,130,'點一下角色 → 看程式還在',15,{w:800,fill:ONE})+tick(260,130)),
  deleteBackdrop:()=>svg(thumb(14,16,'2說明',TWO,TWO_BG,{sel:true})+thumb(96,16,'2遊戲',TWO,TWO_BG)+menu(178,20,['複製','匯出','刪除'],2)+cursor(70,50)
    +t(14,120,'紫色的全部刪掉',16,{fill:BAD,w:800})+t(14,146,'（藍色的不要動）',14,{w:600})),
  uploadBackdrop:()=>svg(roundBtn(80,140,'🐱','#855cd6')+t(80,30,'角色',14,{a:'middle',w:600})+`<line x1="80" y1="36" x2="80" y2="112" stroke="#bbb" stroke-dasharray="3 3"/>`
    +roundBtn(200,140,'🏞','#855cd6')+r(150,10,100,28,'#333',{stroke:'#333',rx:6})+t(200,29,'上傳背景',14,{fill:'#fff',a:'middle'})+`<circle cx="200" cy="64" r="15" fill="#855cd6"/>`+t(200,70,'⬆',16,{fill:'#fff',a:'middle'})+r(183,47,34,34,'none',{stroke:HI,sw:3,rx:17})+cursor(204,60)
    +t(110,100,'背景按鈕',14,{w:800,a:'middle'})),
  rename:()=>svg(t(14,30,'畫圖區上方的名字格',14,{w:800})+r(14,42,170,32,'#fff',{stroke:BAD,sw:2.5})+t(24,64,'2遊戲 (1)',16,{fill:BAD})+cross(196,64)
    +r(14,100,170,32,'#fff',{stroke:OK,sw:2.5})+t(24,122,'2遊戲',16,{fill:OK})+tick(196,122)+t(14,162,'要剛好一樣，不能有空格',14,{w:600})),
  play:()=>svg(`<g>${['open','menu','1說明','1遊戲','1完成','2說明','2遊戲','2完成','成果'].map((s,i)=>{const x=14+(i%3)*94,y=46+Math.floor(i/3)*40,c=i<5?ONE:TWO,b=i<5?ONE_BG:TWO_BG;return r(x,y,86,30,b,{stroke:c})+t(x+43,y+21,s,14,{a:'middle',fill:c});}).join('')}</g>`
    +`<path d="M22 12 v22" stroke="#4cbf56" stroke-width="3"/><path d="M22 12 h16 l-4 6 l4 6 h-16z" fill="#4cbf56"/>`+t(46,30,'按綠旗，從頭玩到尾',15,{w:800})),
  final:()=>svg(r(12,12,276,30,'#4d97ff',{stroke:'#4d97ff',rx:6})+t(24,33,'檔案',15,{fill:'#fff'})+r(120,16,110,22,'#fff',{stroke:'#fff',rx:4})+t(128,32,'完成',14,{fill:ONE,w:800})
    +menu(14,46,['新建','從你的電腦挑選','下載到你的電腦'],2)+t(150,150,'→ 完成.sb3',16,{fill:OK,w:800}))
};
document.querySelectorAll('[data-pic]').forEach(el=>{const f=pics[el.dataset.pic];if(f)el.innerHTML=f();});
try{if(window.scratchblocks?.allLanguages?.zh_tw)scratchblocks.renderMatching('pre.blocks',{style:'scratch3',languages:['zh_tw'],scale:1});}
catch(e){console.warn('Scratch 積木圖無法顯示，保留文字版。',e);}
})();
