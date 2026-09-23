/**
 * 注意：這是儲存庫保留的 v1.0 舊版範例，缺少正式 GAS 的 students 帳號功能。
 * 絕對不要用本檔覆蓋目前試算表綁定的 GAS 專案。
 * 正式專案請從 index.html 的 GAS_URL 與 GAS_INTEGRATION.md 核對；新增功能見 WorkBoard.gs。
 *
 * 貓咪盃備賽檢核系統 — Google Apps Script 後端
 * 版本：v1.0   日期：2026-09-18
 * 作者：Cona 老師（大橋國小）
 *
 * 部署步驟（一次做完）：
 *  1. 新建 Google 試算表 → 擴充功能 → Apps Script → 貼上本檔（取代 Code.gs 全部內容）
 *  2. 執行 setup()（第一次會要求授權）→ 自動建立 progress / links / mock / config 四個分頁並寫入教師密碼
 *  3. 部署 → 新增部署作業 → 類型「網頁應用程式」→ 執行身分「我」→ 存取權「所有人」→ 部署
 *  4. 複製「網頁應用程式網址」（https://script.google.com/macros/s/……/exec）貼到前端 HTML 的 GAS_URL
 *  5. 之後每次改程式碼：部署 → 管理部署作業 → 編輯 → 版本「新版本」→ 部署（網址不變）
 *
 * 前端呼叫方式（GitHub Pages 跨網域）：
 *  GET  : fetch(GAS_URL + '?action=getAll&team=xxx')
 *  POST : fetch(GAS_URL, {method:'POST', headers:{'Content-Type':'text/plain'}, body: JSON.stringify({action, password, payload})})
 *         （Content-Type 一定用 text/plain，避免瀏覽器 preflight；GAS 會 302 轉址，fetch 會自動跟隨）
 */

var VERSION = 'v1.0 (2026-09-18)';
var DEFAULT_TEACHER_PASSWORD = 'dcsp';

var SHEETS = {
  progress: ['key', 'team', 'name', 'group', 'itemType', 'itemId', 'status', 'note', 'updated'],
  links:    ['id', 'itemId', 'title', 'url', 'addedBy', 'updated'],
  mock:     ['id', 'created', 'team', 'group', 'theme', 'text', 'createdBy'],
  config:   ['key', 'value']
};

/* ========== 初始化 ========== */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEETS).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.appendRow(SHEETS[name]);
      sh.setFrozenRows(1);
    }
  });
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('TEACHER_PASSWORD')) {
    props.setProperty('TEACHER_PASSWORD', DEFAULT_TEACHER_PASSWORD);
  }
  Logger.log('setup 完成，教師密碼：' + props.getProperty('TEACHER_PASSWORD'));
}

/* ========== 共用 ========== */
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
function ok_(data) { return json_({ ok: true, version: VERSION, data: data === undefined ? null : data }); }
function err_(msg) { return json_({ ok: false, version: VERSION, error: String(msg) }); }

function sheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) { setup(); sh = ss.getSheetByName(name); }
  return sh;
}
function rows_(name) {
  var sh = sheet_(name);
  var values = sh.getDataRange().getValues();
  var head = SHEETS[name];
  var out = [];
  for (var i = 1; i < values.length; i++) {
    if (values[i].join('') === '') continue;
    var o = {};
    head.forEach(function (h, j) { o[h] = values[i][j]; });
    o._row = i + 1;
    out.push(o);
  }
  return out;
}
function now_() { return Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss'); }
function uid_() { return Utilities.getUuid().slice(0, 8); }

function isTeacher_(password) {
  var real = PropertiesService.getScriptProperties().getProperty('TEACHER_PASSWORD') || DEFAULT_TEACHER_PASSWORD;
  return String(password || '') === String(real);
}

/* ========== GET ========== */
function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    var action = p.action || 'ping';
    var result;
    switch (action) {
      case 'ping':
        result = { message: '貓咪盃 GAS 運作中', time: now_() };
        break;
      case 'getAll':            // 某隊全部進度 + 連結 + 題目
        if (!p.team) return err_('缺少 team');
        result = {
          progress: rows_('progress').filter(function (r) { return r.team === p.team; }),
          links: rows_('links'),
          mocks: rows_('mock')
        };
        break;
      case 'getProgress':
        result = p.team ? rows_('progress').filter(function (r) { return r.team === p.team; }) : rows_('progress');
        break;
      case 'getLinks':
        result = rows_('links');
        break;
      case 'getMocks':
        result = rows_('mock');
        break;
      case 'getTeams':          // 老師儀表板：全班進度摘要
        if (!isTeacher_(p.password)) return err_('需要教師密碼');
        result = summarizeTeams_();
        break;
      default:
        return err_('未知 action: ' + action);
    }
    var out = ok_(result);
    if (p.callback) {           // JSONP 備援
      return ContentService.createTextOutput(p.callback + '(' + out.getContent() + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return out;
  } catch (ex) {
    return err_(ex.message);
  }
}

/* ========== POST ========== */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var body = {};
    try { body = JSON.parse(e.postData.contents || '{}'); } catch (pe) { return err_('body 不是 JSON'); }
    var action = body.action;
    var payload = body.payload || {};
    var teacher = isTeacher_(body.password);

    switch (action) {
      case 'verifyTeacher':
        return ok_({ teacher: teacher });

      case 'saveProgress':      // payload: {team, name, group, items:[{itemType,itemId,status,note}]}
        if (!payload.team || !payload.items) return err_('缺少 team 或 items');
        upsertProgress_(payload);
        return ok_({ saved: payload.items.length });

      case 'addLink':           // 教師：payload {itemId, title, url, addedBy}
        if (!teacher) return err_('需要教師密碼');
        if (!payload.itemId || !payload.url) return err_('缺少 itemId 或 url');
        var id = uid_();
        sheet_('links').appendRow([id, payload.itemId, payload.title || '', payload.url, payload.addedBy || '老師', now_()]);
        return ok_({ id: id });

      case 'deleteLink':        // 教師：payload {id}
        if (!teacher) return err_('需要教師密碼');
        return ok_({ deleted: deleteById_('links', payload.id) });

      case 'saveMock':          // 教師：payload {team, group, theme, text}
        if (!teacher) return err_('需要教師密碼（只有老師能生成／儲存模擬題）');
        var mid = uid_();
        sheet_('mock').appendRow([mid, now_(), payload.team || '', payload.group || '', payload.theme || '', payload.text || '', payload.createdBy || '老師']);
        return ok_({ id: mid });

      case 'deleteMock':        // 教師：payload {id}
        if (!teacher) return err_('需要教師密碼');
        return ok_({ deleted: deleteById_('mock', payload.id) });

      case 'setPassword':       // 教師：payload {newPassword}
        if (!teacher) return err_('需要教師密碼');
        if (!payload.newPassword || String(payload.newPassword).length < 3) return err_('新密碼至少 3 碼');
        PropertiesService.getScriptProperties().setProperty('TEACHER_PASSWORD', String(payload.newPassword));
        return ok_({ changed: true });

      case 'resetTeam':         // 教師：payload {team} 清除該隊進度
        if (!teacher) return err_('需要教師密碼');
        return ok_({ deleted: deleteWhere_('progress', function (r) { return r.team === payload.team; }) });

      default:
        return err_('未知 action: ' + action);
    }
  } catch (ex) {
    return err_(ex.message);
  } finally {
    lock.releaseLock();
  }
}

/* ========== 資料操作 ========== */
function upsertProgress_(payload) {
  var sh = sheet_('progress');
  var existing = rows_('progress');
  var index = {};
  existing.forEach(function (r) { index[r.key] = r._row; });
  var t = now_();
  payload.items.forEach(function (it) {
    var key = [payload.team, it.itemType, it.itemId].join('|');
    var row = [key, payload.team, payload.name || '', payload.group || '', it.itemType, it.itemId,
               it.status === undefined ? '' : it.status, it.note || '', t];
    if (index[key]) {
      sh.getRange(index[key], 1, 1, row.length).setValues([row]);
    } else {
      sh.appendRow(row);
      index[key] = sh.getLastRow();
    }
  });
}
function deleteById_(name, id) {
  return deleteWhere_(name, function (r) { return String(r.id) === String(id); });
}
function deleteWhere_(name, pred) {
  var sh = sheet_(name);
  var rows = rows_(name).filter(pred).map(function (r) { return r._row; }).sort(function (a, b) { return b - a; });
  rows.forEach(function (r) { sh.deleteRow(r); });
  return rows.length;
}
function summarizeTeams_() {
  var all = rows_('progress');
  var teams = {};
  all.forEach(function (r) {
    var t = teams[r.team] || (teams[r.team] = { team: r.team, group: r.group, names: {}, featureDone: 0, featureTotal: 0, skillLevels: { 0: 0, 1: 0, 2: 0 }, updated: '' });
    if (r.name) t.names[r.name] = 1;
    if (r.itemType === 'feature') { t.featureTotal++; if (String(r.status) === 'true' || r.status === true || r.status === 1) t.featureDone++; }
    if (r.itemType === 'skill') { t.skillLevels[Number(r.status) || 0]++; }
    if (r.updated > t.updated) t.updated = r.updated;
  });
  return Object.keys(teams).map(function (k) { var t = teams[k]; t.names = Object.keys(t.names); return t; });
}

/* ========== 測試用（在編輯器直接執行） ========== */
function test_() {
  Logger.log(doGet({ parameter: { action: 'ping' } }).getContent());
  Logger.log(doPost({ postData: { contents: JSON.stringify({ action: 'verifyTeacher', password: 'dcsp' }) } }).getContent());
  Logger.log(doPost({ postData: { contents: JSON.stringify({ action: 'saveProgress', payload: { team: '測試隊', name: '小明', group: 'game', items: [{ itemType: 'feature', itemId: 'G01', status: true, note: '' }] } }) } }).getContent());
  Logger.log(doGet({ parameter: { action: 'getAll', team: '測試隊' } }).getContent());
}
