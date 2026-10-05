/* 重要事件使用現有教師資源 API 保存，沿用 GAS 教師驗證。 */
const CONTEST_LINK='https://scratch.tn.edu.tw/modules/kw_contest/index.php';
const DEFAULT_EVENT={title:'國小組預賽',start:'2026-11-04T13:00',end:'2026-11-04T16:10'};
function eventResource(item){try{const url=new URL(item.url);return url.origin==='https://cona0815.github.io'&&url.pathname==='/catcup-checklist/'&&url.searchParams.get('catcupEvent')==='1';}catch{return false;}}
function currentImportantEvent(){
  const saved=resourceItems.find(eventResource);if(!saved)return {...DEFAULT_EVENT};
  const params=new URL(saved.url).searchParams;
  const start=params.get('start'),end=params.get('end');
  if(!start||!end||!Number.isFinite(Date.parse(start+'+08:00'))||!Number.isFinite(Date.parse(end+'+08:00')))return {...DEFAULT_EVENT};
  return {id:saved.id,title:saved.title,start,end};
}
function eventCountdown(event,now=Date.now()){
  const start=Date.parse(event.start+'+08:00'),end=Date.parse(event.end+'+08:00');
  if(now>=end)return '活動已結束';if(now>=start)return '正在進行';
  const minutes=Math.ceil((start-now)/60000),days=Math.floor(minutes/1440),hours=Math.floor(minutes%1440/60),mins=minutes%60;
  return `倒數 ${days} 天 ${hours} 小時 ${mins} 分`;
}
function renderImportantEvent(){
  const box=document.querySelector('#importantEvent');if(!box)return;
  const event=currentImportantEvent(),date=new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',month:'numeric',day:'numeric',weekday:'short'}).format(new Date(event.start+'+08:00'));
  box.innerHTML=`<div><strong>📅 ${esc(event.title)}</strong><span>${esc(date)} ${esc(event.start.slice(11))}–${esc(event.end.slice(11))}</span></div><b class="event-count">${esc(eventCountdown(event))}</b>${teacherPw()?'<button class="hbtn" id="eventEdit">✏️ 編輯事件</button>':''}`;
  const button=box.querySelector('#eventEdit');if(button)button.onclick=()=>{
    const dialog=document.querySelector('#eventDialog');
    dialog.innerHTML=`<form id="eventForm"><h2>📅 編輯重要事件</h2><label>事件名稱<input name="title" maxlength="100" required value="${esc(event.title)}"></label><label>開始日期與時間<input name="start" type="datetime-local" required value="${esc(event.start)}"></label><label>結束日期與時間<input name="end" type="datetime-local" required value="${esc(event.end)}"></label><p>時間以臺灣時間計算。</p><p id="eventStatus" role="status"></p><div class="row"><button class="btn" type="submit">確認儲存</button><button class="btn ghost" id="eventCancel" type="button">取消</button></div></form>`;
    dialog.querySelector('#eventCancel').onclick=()=>dialog.close();dialog.showModal();
    dialog.querySelector('form').onsubmit=async e=>{
      e.preventDefault();if(!teacherPw())return;
      const form=e.currentTarget,title=form.elements.title.value.trim(),start=form.elements.start.value,end=form.elements.end.value;
      const status=dialog.querySelector('#eventStatus');if(!title||Date.parse(end+'+08:00')<=Date.parse(start+'+08:00')){status.textContent='結束時間必須晚於開始時間';return;}
      const url=new URL('https://cona0815.github.io/catcup-checklist/');url.searchParams.set('catcupEvent','1');url.searchParams.set('start',start);url.searchParams.set('end',end);
      const submit=form.querySelector('[type=submit]');submit.disabled=true;status.textContent='正在儲存…';
      try{const saved=await api.post('saveResource',{kind:'site',id:event.id||'',title,url:url.href},teacherPw());
        if(!saved?.ok){status.textContent='儲存失敗：'+(saved?.error||'請稍後重試');return;}
        event.id=saved.data.item.id;resourceItems=resourceItems.filter(item=>!eventResource(item));resourceItems.push(saved.data.item);renderImportantEvent();status.textContent='已儲存到雲端，所有學生都能讀取';
      }catch{status.textContent='儲存失敗，請檢查連線';}finally{submit.disabled=false;}
    };
  };
}
setInterval(()=>{if(typeof resourceItems!=='undefined')renderImportantEvent();},60000);
