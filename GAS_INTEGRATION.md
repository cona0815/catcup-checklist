# 貓咪盃 GAS 增量整合紀錄

- 正式資料表含 `students`、`progress`、`links`、`mock`、`config` 分頁；請從網站設定與 Google 試算表 UI 核對目前綁定的專案，不要在公開儲存庫記錄私有試算表或專案 ID。
- 前端 `index.html` 的 `GAS_URL` 指向既有正式部署；更新時應保留原部署網址。
- 儲存庫的 `Code.gs` 仍是 v1.0 舊版範例，**不可貼回正式 GAS**，否則會移除學生帳號 API。
- 正式 GAS 是學生帳號版；獨立 `WorkBoard.gs` 使用現有 `doPost` 的 `getWorkData`、`saveWorkBoard`、`saveFeatureConfig` 三個路由。伙伴清單必須驗證同隊同組學生或教師，**不可開放 GET 以隊名直接查詢**。
- v2.0 的 `feature_config` JSON 增加 `added`、`hidden` 與項目 `links`；刪除是可還原的隱藏，保留舊進度與分工。`work_boards` JSON 增加各項 `notes`。學生端只送分工／備註 patch，伺服器合併保存並忽略舊版提交的順序。
- 新資料分頁 `work_boards`（各隊各組的順序、分工）與 `feature_config`（教師設定）由新端點首次使用時建立。舊資料分頁不改欄位。
- 既有必做功能 ID（A01–A12、G01–G14）保持不變；新增項目使用同組後續兩位數 ID，已刪除 ID 不重用，避免既有進度對錯項目。程式說明文件 A12/G14 固定第一項。
- 教師密碼由 GAS「專案設定 → 指令碼屬性 → `TEACHER_PASSWORD`」管理。前端已取消離線固定密碼備援。

發布順序：先測試 GAS 新路由，更新現有 GAS 部署為新版本（保留 URL），再發布 GitHub Pages 前端並以正式帳號測試伙伴清單、分配、重新整理後保存、教師編輯。不要新增第二套學生資料庫。
