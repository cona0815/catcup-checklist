# 貓咪盃 GAS 增量整合紀錄

- 正式資料表含 `students`、`progress`、`links`、`mock`、`config` 分頁；請從網站設定與 Google 試算表 UI 核對目前綁定的專案，不要在公開儲存庫記錄私有試算表或專案 ID。
- 前端 `index.html` 的 `GAS_URL` 指向既有正式部署；更新時應保留原部署網址。
- 儲存庫的 `Code.gs` 仍是 v1.0 舊版範例，**不可貼回正式 GAS**，否則會移除學生帳號 API。
- 正式 GAS 是學生帳號版；獨立 `WorkBoard.gs` 使用現有 `doPost` 的 `getWorkData`、`saveWorkBoard`、`saveFeatureConfig` 三個路由。伙伴清單必須驗證同隊同組學生或教師，**不可開放 GET 以隊名直接查詢**。
- v2.0 的 `feature_config` JSON 增加 `added`、`hidden` 與項目 `links`；刪除是可還原的隱藏，保留舊進度與分工。`work_boards` JSON 增加各項 `notes`。學生端只送分工／備註 patch，伺服器合併保存並忽略舊版提交的順序。
- 新資料分頁 `work_boards`（各隊各組的順序、分工）與 `feature_config`（教師設定）由新端點首次使用時建立。舊資料分頁不改欄位。
- 既有必做功能 ID（A01–A12、G01–G14）保持不變；新增項目使用同組後續兩位數 ID，已刪除 ID 不重用，避免既有進度對錯項目。程式說明文件 A12/G14 固定第一項。
- 教師密碼由 GAS「專案設定 → 指令碼屬性 → `TEACHER_PASSWORD`」管理。前端已取消離線固定密碼備援。
- v2.2 新增 `ResourceBoard.gs`：`resource_items` 分頁保存常用網頁與常用程式碼，公開讀取、教師驗證後編輯／隱藏。圖片由教師上傳至本 GAS 專用的 Drive 資料夾，檔案設為「知道連結的任何人可檢視」，供公開網站顯示。首次讀取時會把原先五個常用網頁寫入新分頁；正式 `程式碼.gs` 須新增 `getResourceData`、`saveResource`、`deleteResource`、`uploadResourceImage` 四個 POST 路由，保留其他路由。

發布順序：先測試 GAS 新路由，更新現有 GAS 部署為新版本（保留 URL），再發布 GitHub Pages 前端並以正式帳號測試伙伴清單、分配、重新整理後保存、教師編輯。不要新增第二套學生資料庫。

2026-10-05：重要事件沿用 `resource_items` 與既有 `saveResource/getResourceData` 路由。事件是 `kind=site` 的專用資源，標題存事件名稱，網址為本站根網址，query 中的 `catcupEvent=1` 標示事件，`start/end` 保存臺灣時區的日期時間。前端不把這類紀錄列為常用網頁，改在頁首顯示倒數；教師按「確認儲存」後才寫入，學生唯讀。未設定時所有裝置顯示內建的 2026-11-04 13:00–16:10 國小組預賽；教師的自訂值優先。此次不新增 GAS 路由，也不替換正式程式。

重要日期支援預賽與上傳測試各自儲存：`eventKey=exam/upload`，舊紀錄沒有 key 視為 exam。上傳測試預設 2026-10-26，`allDay=1` 表示僅指定日期；`owner` 保存教師自訂的上傳隊長文字。修改某事件只更新對應紀錄。

2026-10-15（網站 v3.14）：新增 `WorkUpload.gs` v1.3「作品上傳」。正式 `程式碼.gs` 的 doPost 須新增 `uploadWork`、`listWorks` 兩個 POST 路由（保留其他路由），依賴既有 `ok_/err_/now_/isTeacher_/rows_` 與 `WorkBoard.gs` 的 `wbSheet_/wbRows_/wbAuthorized_`。學生只能上傳到自己的隊伍與組別；檔案存到 Drive「貓咪盃作品上傳／隊名（遊戲組|動畫組）／yyyy-MM-dd／HHmmss_隊名_姓名_原檔名.sb3」，同名自動加 `_2`，不覆蓋；新分頁 `work_uploads` 記錄每次上傳。網站不做自動檢查、GAS 不呼叫 AI：老師在網站按「開 Drive 檔案」與「複製給 Claude」，把 .sb3 和說明交給 Claude 找 bug。學生看不到 Drive 連結與其他隊。檔案不公開分享。部署後在編輯器執行一次 `testWorkUpload` 完成 Drive 授權，再以「管理部署作業 → 編輯 → 新版本」更新（保留原網址）。

2026-10-15（網站 v3.15）：`WorkUpload.gs` v1.4 新增「老師建議 PDF」。doPost 再加 `uploadFeedback`（僅教師）與 `getFeedback`（教師或同隊學生）兩個路由。PDF 存在該作品同一天資料夾，命名 `建議_原上傳檔名.pdf`，重傳加 `_2` 保留舊檔；`work_uploads` 新增 `feedbackFileId/feedbackName/feedbackTime/feedbackSeen` 欄，v1.3 舊表第一次讀取時自動補標題。PDF 不公開分享，學生登入後由 GAS 回傳內容在瀏覽器開啟，第一次開啟記錄已讀時間；老師開啟不算已讀。

2026-10-16（網站 v3.16）：新增 `TeacherFolder.gs` v1.0「老師資料夾」。doPost 須新增 `listTeacherFiles`、`getTeacherFile`（教師或任一啟用中的學生帳號）與 `teacherFileOp`（僅教師；op=mkdir/upload/rename/move/delete）三個路由，依賴既有 `ok_/err_/isTeacher_/rows_`。根資料夾由指令碼屬性 `CATCUP_TEACHER_FOLDER_ID` 指定，未設定時自動建立「貓咪盃老師資料夾」。每個動作都檢查目標位於根資料夾之內（含祖先未被丟進垃圾桶）；資料夾不能移進自己或子資料夾；根資料夾不能改名、移動或刪除；刪除＝移到 Drive 垃圾桶；同名自動加「 (2)」不覆蓋；單檔上限 20 MB；Google 文件下載時轉 PDF。檔案不公開分享，學生由 GAS 讀出內容下載。安裝後執行一次 `testTeacherFolder` 完成授權。

2026-10-16：`WorkUpload.gs` v1.5 建議 PDF 檔名自動加回覆日期：`建議_yyyy-MM-dd_原上傳檔名.pdf`；學生的「看老師建議」按鈕顯示回覆日期（月/日）。路由不變。
