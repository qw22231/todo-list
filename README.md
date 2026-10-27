# 我的任務 · Todo List

使用 Next.js、React、TypeScript 與 Tauri 2 製作的待辦清單，支援網頁版和 Windows 桌面版，不需要 SQL 資料庫或獨立 API 後端。

## 功能

- 新增、編輯、刪除與完成任務。
- 搜尋、完成狀態篩選，以及新舊排序。
- 可設定或清除截止日期與時間；未完成且已逾期的日期顯示紅色。
- 畫面開啟時約每秒更新逾期狀態，重新取得焦點時也會更新；背景執行可能受系統節流影響。
- 新增淡入、刪除淡出，支援系統的減少動態效果設定。
- Windows 視窗預設置頂，大小為 300 × 600，可調整大小但禁止最大化。
- 右上角按鈕啟用右側貼邊自動隱藏：滑鼠離開約 600 毫秒後收起，移到邊條時展開。
- 新增或編輯任務期間暫停自動收起。

## 開發環境

網頁版需要 Node.js 與 npm。桌面版另外需要：

- Rust 與 Cargo，使用 Windows MSVC 工具鏈。
- Microsoft C++ Build Tools，安裝「使用 C++ 的桌面開發」及 Windows SDK。
- Microsoft Edge WebView2 Runtime。

詳見 [Tauri 前置要求](https://v2.tauri.app/start/prerequisites/)。

以下指令均在包含 `package.json` 與 `src-tauri` 的專案根目錄執行。

```powershell
npm ci
```

## 開發與檢查

啟動網頁版：

```powershell
npm run dev
```

開啟 http://localhost:3000。瀏覽器版不顯示桌面貼邊按鈕。

啟動桌面版：

```powershell
npx tauri dev
```

Tauri 會自動執行前端開發指令，不用另開 `npm run dev`；請先確保 3000 連接埠沒有被其他程式占用。第一次執行會下載及編譯 Rust 套件。

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

前端採用靜態輸出，建置結果位於 `out/`。目前 `package.json` 的 `npm start` 使用 `next start`，不適用靜態輸出；正式網頁版應使用靜態網站伺服器託管 `out/`。

## Windows 安裝檔

```powershell
npx tauri build
```

此指令自動建置前端並產生 NSIS 安裝檔，預設輸出位置：

```text
src-tauri/target/release/bundle/nsis/*-setup.exe
```

安裝後可獨立開啟，不需要持續執行開發伺服器。修改程式碼後，已安裝版本需要重新建置及更新安裝。

更新應用程式圖示：

```powershell
npx tauri icon ./app-icon.png
npx tauri build
```

## 資料與私隱

- 任務使用 `localStorage`，儲存鍵為 `todo-tasks`；目前沒有任務雲端同步或上傳功能。
- 資料沒有加密，請勿儲存密碼等機密；清除瀏覽器或應用程式資料可能造成任務遺失。
- 瀏覽器版、桌面開發版及正式桌面版可能使用不同儲存空間，不會自動搬移任務；目前未提供匯入／匯出。
- 啟用貼邊時會讀取全域滑鼠座標，只用於判斷展開／收起，目前不記錄或傳送座標。
- 建置會下載 npm、Rust 套件；現有 `next/font/google` 設定也可能在建置時下載字型。
- Tauri 的 CSP 目前為 `null`，尚未啟用這層防護。正式發行前應依前端需求設定並驗證。

## 已知限制

- 貼邊是按鈕啟用的右側模式，尚未支援拖曳到任意邊緣自動吸附。
- 以啟用當下的螢幕為準；多螢幕相鄰邊界、螢幕拔除與側邊工作列尚需改善。啟用後要自由移動視窗，請先取消貼邊。
- 截止時間只提供畫面提示，沒有系統通知或鬧鐘。
- 多個視窗同時編輯資料可能互相覆蓋。

## 專案結構

```text
app/                       頁面、全域樣式與版面設定
components/TaskCard.tsx     任務顯示、編輯與逾期狀態
components/EdgeDock.tsx     桌面貼邊控制
lib/task-storage.ts        本機資料讀寫
type/task.ts               任務型別
src-tauri/src/             Rust 桌面程式入口
src-tauri/capabilities/    桌面功能權限
src-tauri/tauri.conf.json  視窗與打包設定
src-tauri/icons/           應用程式圖示
```

## Git 與發布

提交原始碼、圖示、`package-lock.json` 及 `src-tauri/Cargo.lock`。既有忽略規則會排除 `.env*`、`node_modules/`、`.next/`、`out/`、`src-tauri/target/` 與產生的 schema。

不要強制加入環境檔、憑證或個人資料。安裝檔可另行上傳至 GitHub Releases，不必把整個 `target/` 加入版本控制。
