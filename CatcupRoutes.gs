/* CatcupRoutes.gs v1.0（2026-10-16）
   擴充路由表：程式碼.gs 的 doPost 只要在 default 前加一行，之後新增功能不用再改 程式碼.gs。
     default:
       var ext = catcupRoute_(action, payload, body.password); if (ext) return ext;
       return err_('未知 action: ' + action);
   已在 doPost 寫好的 case（例如 uploadWork）照常優先，這裡只處理沒寫到的。 */
function catcupRoute_(action,payload,password){
  var routes={
    uploadWork:uploadWork_,listWorks:listWorks_,
    uploadFeedback:uploadFeedback_,getFeedback:getFeedback_,
    listTeacherFiles:listTeacherFiles_,getTeacherFile:getTeacherFile_,teacherFileOp:teacherFileOp_
  };
  var fn=routes[String(action||'')];
  return fn?fn(payload||{},password):null;
}
