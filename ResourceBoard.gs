/* 教材資源：公開讀取；只有教師可新增、編輯、隱藏及上傳圖片。 */
var RESOURCE_HEAD_=['id','kind','title','url','imageUrl','imageFileId','active','updated'];
var RESOURCE_SEED_=[
  ['site','加入 Google Classroom','https://classroom.google.com/c/ODM5NjI1ODc2NDg3?cjc=2zq3psgj'],
  ['site','作業上傳','https://stuworkupload.netlify.app/'],
  ['site','Scratch 基礎教學','https://steam.oxxostudio.tw/category/scratch/index.html#google_vignette'],
  ['site','Scratch 官方教學','https://scratch.mit.edu/help/studio/tips/home/'],
  ['site','Scratch 官方入門作品','https://scratch.mit.edu/help/starter_projects/']
];
function resourceSheet_(){
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sh=ss.getSheetByName('resource_items');
  if(!sh){
    sh=ss.insertSheet('resource_items');sh.appendRow(RESOURCE_HEAD_);sh.setFrozenRows(1);
    var stamp=now_();
    RESOURCE_SEED_.forEach(function(item,index){
      sh.appendRow(['site-'+(index+1),item[0],item[1],item[2],'','',true,stamp]);
    });
  }
  return sh;
}
function resourceRows_(){
  var sh=resourceSheet_(),values=sh.getDataRange().getValues(),out=[];
  for(var i=1;i<values.length;i++){
    if(!values[i][0])continue;
    out.push({_row:i+1,id:String(values[i][0]),kind:String(values[i][1]),
      title:String(values[i][2]),url:String(values[i][3]),imageUrl:String(values[i][4]||''),
      imageFileId:String(values[i][5]||''),active:values[i][6]!==false&&String(values[i][6]).toLowerCase()!=='false'});
  }
  return out;
}
function resourcePublic_(row){
  return {id:row.id,kind:row.kind,title:row.title,url:row.url,imageUrl:row.imageUrl};
}
function getResourceData_(){
  return ok_({items:resourceRows_().filter(function(row){return row.active;}).map(resourcePublic_)});
}
function resourceUrl_(value){return /^https:\/\//i.test(String(value||'').trim());}
function saveResource_(payload,password){
  if(!isTeacher_(password))return err_('需要教師密碼');
  var kind=payload.kind==='code'?'code':payload.kind==='site'?'site':'',
    title=String(payload.title||'').trim(),url=String(payload.url||'').trim(),
    imageUrl=String(payload.imageUrl||'').trim(),imageFileId=String(payload.imageFileId||'').trim();
  if(!kind||!title||title.length>100||!resourceUrl_(url)||url.length>2000)return err_('請填寫標題與 HTTPS 連結');
  if(imageUrl&&(!resourceUrl_(imageUrl)||imageUrl.length>2000))return err_('圖片網址無效');
  if(imageFileId&&!/^[A-Za-z0-9_-]{10,100}$/.test(imageFileId))return err_('圖片代碼無效');
  var sh=resourceSheet_(),old=String(payload.id||'')?resourceRows_().filter(function(row){return row.id===String(payload.id);})[0]:null;
  if(payload.id&&!old)return err_('找不到要編輯的資源');
  var id=old?old.id:Utilities.getUuid();
  var values=[id,kind,title,url,imageUrl,imageFileId,true,now_()];
  if(old)sh.getRange(old._row,1,1,values.length).setValues([values]);else sh.appendRow(values);
  return ok_({item:resourcePublic_({id:id,kind:kind,title:title,url:url,imageUrl:imageUrl})});
}
function deleteResource_(payload,password){
  if(!isTeacher_(password))return err_('需要教師密碼');
  var row=resourceRows_().filter(function(item){return item.id===String(payload.id||'');})[0];
  if(!row)return err_('找不到要刪除的資源');
  resourceSheet_().getRange(row._row,7).setValue(false);
  return ok_({deleted:true,id:row.id});
}
function uploadResourceImage_(payload,password){
  if(!isTeacher_(password))return err_('需要教師密碼');
  var mime=String(payload.mime||''),data=String(payload.base64||'');
  if(['image/jpeg','image/png','image/webp'].indexOf(mime)<0||!data||data.length>1500000||!/^[A-Za-z0-9+/=]+$/.test(data))
    return err_('請選擇小於 1 MB 的 JPG、PNG 或 WebP 圖片');
  var bytes=Utilities.base64Decode(data);
  if(bytes.length>1100000)return err_('圖片超過 1 MB');
  var props=PropertiesService.getScriptProperties(),folderId=props.getProperty('CATCUP_RESOURCE_FOLDER_ID');
  var folder=folderId?DriveApp.getFolderById(folderId):DriveApp.createFolder('catcup-resource-images');
  if(!folderId)props.setProperty('CATCUP_RESOURCE_FOLDER_ID',folder.getId());
  var ext=mime==='image/png'?'.png':mime==='image/webp'?'.webp':'.jpg';
  var file=folder.createFile(Utilities.newBlob(bytes,mime,Utilities.getUuid()+ext));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);
  return ok_({imageFileId:file.getId(),imageUrl:'https://drive.google.com/thumbnail?id='+file.getId()+'&sz=w1200'});
}
function testResourceBoard(){
  Logger.log(getResourceData_().getContent());
  var props=PropertiesService.getScriptProperties();
  if(!props.getProperty('CATCUP_RESOURCE_FOLDER_ID')){
    var folder=DriveApp.createFolder('catcup-resource-images');
    props.setProperty('CATCUP_RESOURCE_FOLDER_ID',folder.getId());
  }
  Logger.log('Drive access ready');
}
