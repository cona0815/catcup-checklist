/* Scratch 基本功課程：整理自作者的 scratchteam.netlify.app 教材。 */
const BASIC_COURSE = {
  title: 'Scratch 基本功',
  source: 'https://scratchteam.netlify.app/',
  sites: [
    {title:'加入 Google Classroom',url:'https://classroom.google.com/c/ODM5NjI1ODc2NDg3?cjc=2zq3psgj'},
    {title:'作業上傳',url:'https://stuworkupload.netlify.app/'},
    {title:'Scratch 基礎教學',url:'https://steam.oxxostudio.tw/category/scratch/index.html#google_vignette'}
  ],
  lessons: [
    {id:'SB0101',group:1,title:'臉型',heading:'人物－臉型',description:'學習使用「橢圓形」工具畫出基礎頭部，接著使用「變形工具（重新塑形）」調整兩側的控制點，就能畫出臉頰與各種不同的臉型。',video:'https://www.youtube.com/watch?v=_H-qZ4_QQsM&t=5s'},
    {id:'SB0102',group:1,title:'髮型塑形',heading:'人物－髮型塑形',description:'先畫一個大的橢圓形，再利用「變形工具（重新塑形）」加上節點，將節點改成尖角，拉出不同造型的瀏海。',video:'https://www.youtube.com/watch?v=_H-qZ4_QQsM&t=116s'},
    {id:'SB0103',group:1,title:'身體與圖層',heading:'人物－身體與圖層',description:'用簡單的長方形畫出二頭身角色的身體，再使用「移到最下層」，讓身體藏在頭部下方，接縫看起來更自然。',video:'https://www.youtube.com/watch?v=_H-qZ4_QQsM&t=400s'},
    {id:'SB0104',group:1,title:'喜怒哀樂',heading:'表情－喜怒哀樂設計',description:'複製原本的造型，再利用變形工具調整嘴巴弧度與眼睛形狀，做出開心、難過等不同表情。',video:'https://www.youtube.com/watch?v=WzzlpcN4vL4&t=0s'},
    {id:'SB0201',group:2,title:'簡易標題字',heading:'簡易標題字',description:'用文字工具輸入標題，搭配顏色、複製與錯位，做出陰影或立體效果，完成作品封面。',video:'https://www.youtube.com/watch?v=Q-P1e6ryrrg&t=0s'},
    {id:'SB0202',group:2,title:'動態效果－放大',heading:'簡易標題動態效果－放大',description:'使用 Scratch 的「尺寸」積木與重複執行迴圈，讓標題文字逐漸放大，做出生動的出場效果。',video:'https://www.youtube.com/watch?v=4TOoorTeh1c&t=0s'},
    {id:'SB0301',group:3,title:'動態按鈕',heading:'動態按鈕設計（4 種）',description:'運用「碰到滑鼠游標」與「滑鼠被按下」等偵測積木，讓按鈕在滑鼠移過或點擊時變色、放大或移動。',video:'https://www.youtube.com/watch?v=mC5w9-f53g4&t=0s'},
    {id:'SB0401',group:4,title:'塑膠袋',heading:'常用物件繪製－塑膠袋',description:'用繪圖工具畫出塑膠袋，再用變形工具拉出不規則的邊緣與皺褶，以線條表現輕透的材質。',video:'https://www.youtube.com/watch?v=zhYpboRXsfM&t=0s'},
    {id:'SB0402',group:4,title:'寶特瓶',heading:'常用物件繪製－寶特瓶',description:'將寶特瓶拆成瓶蓋、瓶身與標籤，使用幾何圖形組合與圖層堆疊，畫出立體的物件。',video:'https://www.youtube.com/watch?v=wVFfsmrJCeI&t=0s'},
    {id:'SB0403',group:4,title:'紅蘿蔔與火車',heading:'常用物件繪製－紅蘿蔔與火車',description:'畫出帶葉子的紅蘿蔔與小火車，綜合練習形狀拼貼與節點變形。',video:'https://www.youtube.com/watch?v=-1MbaAMyH5A&t=0s'},
    {id:'SB0404',group:4,title:'海星',heading:'常用物件繪製－海星',description:'從多邊形開始，用變形工具拉出五個觸角，再加上漸層與斑點，讓海星更有立體感。',video:'https://www.youtube.com/watch?v=zUqBJaWUAcM&t=0s'},
    {id:'SB0501',group:5,title:'一般背景',heading:'背景一般繪製',description:'運用幾何圖形與填色工具畫出天空、草地與自然場景，為角色建立舞台。',video:'https://www.youtube.com/watch?v=6ZJmXjef694&t=0s'},
    {id:'SB0502',group:5,title:'海灘場景',heading:'背景海灘繪製',description:'用漸層色表現海水深淺，再加入雲朵與沙灘等細節，完成夏日海灘背景。',video:'https://www.youtube.com/watch?v=nB92nMmS4r8&t=0s'},
    {id:'SB0601',group:6,title:'訊息整合',heading:'訊息整合－以運動會為例',description:'以運動會為主題，利用 Scratch 的「廣播訊息」與「接收到訊息時」，串接不同角色、背景與動作。',video:''},
    {id:'SB0701',group:7,title:'複製／匯出／上傳',heading:'角色造型的複製、匯出與上傳',description:'在角色區或造型區按右鍵選擇「匯出」，把素材存到電腦；在其他專案使用「上傳角色」或「上傳造型」重複利用。',video:'https://www.youtube.com/watch?v=WS0bJmAgVlU&t=0s'},
    {id:'SB0702',group:7,title:'角色匯出',heading:'Scratch 角色匯出',description:'匯出包含所有造型與程式碼的完整 Scratch 角色，建立自己的角色素材庫，再匯入新專案使用。',video:'https://www.youtube.com/watch?v=F-OTeBzJ8jg&t=0s'},
    {id:'SB0801',group:8,title:'重新組合',heading:'重新組合',description:'重組不同 Scratch 專案與角色，將現有元素結合成新的作品。',video:''},
    {id:'SB0901',group:9,title:'遊戲組練習',heading:'暑期練習－遊戲組',description:'至少自己完成兩個遊戲。可以先參考教學網站，再嘗試不看網站，獨立重做。',video:''},
    {id:'SB0902',group:9,title:'動畫組練習',heading:'暑期練習－動畫組',description:'至少完成三幕像繪本一樣的畫面安排。',video:''}
  ]
};
