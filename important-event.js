/* 重要事件使用現有教師資源 API 保存，沿用 GAS 教師驗證。 */
const CONTEST_LINK='https://scratch.tn.edu.tw/modules/kw_contest/index.php';
const DEFAULT_EVENT={title:'國小組預賽',start:'2026-11-04T13:00',end:'2026-11-04T16:10'};
const DEFAULT_EVENTS=[{...DEFAULT_EVENT,key:'exam',owner:''},{key:'upload',title:'上傳測試',start:'2026-10-26T00:00',end:'2026-10-27T00:00',allDay:true,owner:'隊長'}];
function eventResource(item){try{const url=new URL(item.url);return url.origin==='https://cona0815.github.io'&&url.pathname==='/catcup-checklist/'&&url.searchParams.get('catcupEvent')==='1';}catch{return false;}}
function resourceEventKey(item){return new URL(item.url).searchParams.get('eventKey')||'exam';}
function currentImportantEvents(){return DEFAULT_EVENTS.map(base=>{
  const saved=resourceItems.find(item=>eventResource(item)&&resourceEventKey(item)===base.key);if(!saved)return {...base};
  const params=new URL(saved.url).searchParams,start=params.get('start'),end=params.get('end');
  if(!start||!end||!Number.isFinite(Date.parse(start+'+08:00'))||!Number.isFinite(Date.parse(end+'+08:00')))return {...base};
  return {...base,id:saved.id,title:saved.title,start,end,owner:params.get('owner')??base.owner,allDay:params.get('allDay')==='1'};
});}
function currentImportantEvent(){return currentImportantEvents().find(event=>event.key==='exam');}
function eventCountdown(event,now=Date.now()){
  const start=Date.parse(event.start+'+08:00'),end=Date.parse(event.end+'+08:00');
  if(now>=end)return '活動已結束';if(now>=start)return '正在進行';
  const minutes=Math.ceil((start-now)/60000),days=Math.floor(minutes/1440),hours=Math.floor(minutes%1440/60),mins=minutes%60;
  return `倒數 ${days} 天 ${hours} 小時 ${mins} 分`;
}
function renderImportantEvent(){
  const box=document.querySelector('#importantEvent');if(!box)return;
  const events=currentImportantEvents().sort((a,b)=>a.start.localeCompare(b.start));
  box.innerHTML=events.map(event=>{const date=new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',month:'numeric',day:'numeric',weekday:'short'}).format(new Date(event.start+'+08:00'));
    return `<div class="event-row"><div><strong>${event.key==='upload'?'📤':'📅'} ${esc(event.title)}</strong><span>${esc(date)} ${event.allDay?'':`${esc(event.start.slice(11))}–${esc(event.end.slice(11))}`} ${event.owner?`・${esc(event.owner)}${event.key==='upload'?'上傳':''}`:''}</span></div><b class="event-count">${esc(eventCountdown(event))}</b>${teacherPw()?`<button class="hbtn" id="${event.key==='exam'?'eventEdit':'uploadEventEdit'}" data-edit-event="${event.key}">✏️ 編輯</button>`:''}</div>`;
  }).join('');
  box.querySelectorAll('[data-edit-event]').forEach(button=>{button.onclick=()=>{
    const event=events.find(item=>item.key===button.dataset.editEvent);
    const dialog=document.querySelector('#eventDialog');
    dialog.innerHTML=`<form id="eventForm"><h2>📅 編輯重要事件</h2><label>事件名稱<input name="title" maxlength="100" required value="${esc(event.title)}"></label><label>負責人／上傳隊長（可自訂）<input name="owner" maxlength="60" value="${esc(event.owner||'')}" placeholder="例如：隊長、學生姓名"></label><label>開始日期${event.allDay?'':'與時間'}<input name="start" type="${event.allDay?'date':'datetime-local'}" required value="${esc(event.allDay?event.start.slice(0,10):event.start)}"></label>${event.allDay?'':`<label>結束日期與時間<input name="end" type="datetime-local" required value="${esc(event.end)}"></label>`}<p>${event.allDay?'此事件只指定日期。':'時間以臺灣時間計算。'}</p><p id="eventStatus" role="status"></p><div class="row"><button class="btn" type="submit">確認儲存</button><button class="btn ghost" id="eventCancel" type="button">取消</button></div></form>`;
    dialog.querySelector('#eventCancel').onclick=()=>dialog.close();dialog.showModal();
    dialog.querySelector('form').onsubmit=async e=>{
      e.preventDefault();if(!teacherPw())return;
      const form=e.currentTarget,title=form.elements.title.value.trim(),owner=form.elements.owner.value.trim(),start=form.elements.start.value+(event.allDay?'T00:00':''),end=event.allDay?new Date(Date.parse(start+'Z')+86400000).toISOString().slice(0,16):form.elements.end.value;
      const status=dialog.querySelector('#eventStatus');if(!title||Date.parse(end+'+08:00')<=Date.parse(start+'+08:00')){status.textContent='結束時間必須晚於開始時間';return;}
      const url=new URL('https://cona0815.github.io/catcup-checklist/');url.searchParams.set('catcupEvent','1');url.searchParams.set('start',start);url.searchParams.set('end',end);
      url.searchParams.set('eventKey',event.key);url.searchParams.set('owner',owner);if(event.allDay)url.searchParams.set('allDay','1');
      const submit=form.querySelector('[type=submit]');submit.disabled=true;status.textContent='正在儲存…';
      try{const saved=await api.post('saveResource',{kind:'site',id:event.id||'',title,url:url.href},teacherPw());
        if(!saved?.ok){status.textContent='儲存失敗：'+(saved?.error||'請稍後重試');return;}
        event.id=saved.data.item.id;resourceItems=resourceItems.filter(item=>!eventResource(item)||resourceEventKey(item)!==event.key);resourceItems.push(saved.data.item);renderImportantEvent();status.textContent='已儲存到雲端，所有學生都能讀取';
      }catch{status.textContent='儲存失敗，請檢查連線';}finally{submit.disabled=false;}
    };
  };});
}
setInterval(()=>{if(typeof resourceItems!=='undefined')renderImportantEvent();},60000);
