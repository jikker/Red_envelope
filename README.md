# 搶紅包系統

一個部署在 GitHub Pages 上的搶紅包網頁系統，後端使用 Google Sheets + Google Apps Script。

## 功能

- **前台**：使用者輸入名字後搶紅包，每人限搶一次，搶到後有撒花動畫
- **後台**：管理獎品設定、查看搶取紀錄與統計、匯出 CSV、清除紀錄
- **後端**：Google Apps Script 處理 API 請求，Google Sheets 儲存資料

---

## 設定教學

### 第一步：建立 Google Sheets

1. 前往 [Google Sheets](https://sheets.google.com)，建立一個新的試算表
2. 記下試算表的網址（之後不需要手動編輯試算表，程式會自動建立工作表）

### 第二步：設定 Google Apps Script

1. 在 Google Sheets 中，點選上方選單 **「擴充功能」→「Apps Script」**
2. 刪除預設的程式碼，將 `google-apps-script/Code.gs` 的完整內容貼上
3. 點選上方的 **「儲存」** 按鈕（Ctrl+S）
4. 在函式下拉選單中選擇 **`initSheets`**，然後點選 **「執行」**
   - 第一次執行會要求授權，請點選「審查權限」→ 選擇你的 Google 帳號 → 「進階」→「前往（不安全）」→「允許」
   - 執行成功後，回到 Google Sheets 確認已自動建立 `Config` 和 `Records` 兩個工作表

### 第三步：部署 Google Apps Script

1. 在 Apps Script 編輯器中，點選右上角 **「部署」→「新增部署作業」**
2. 點選「齒輪」圖示，選擇 **「網頁應用程式」**
3. 設定：
   - **說明**：搶紅包 API（可自訂）
   - **執行身分**：**我**
   - **誰可以存取**：**所有人**
4. 點選 **「部署」**
5. 複製產生的 **網頁應用程式 URL**（格式為 `https://script.google.com/macros/s/xxxxx/exec`）

> **重要**：每次修改程式碼後，需要「管理部署作業」→「編輯」→ 版本選「新版本」→「部署」才會生效。

### 第四步：部署 GitHub Pages

1. 將此專案推送到 GitHub repository
2. 前往 repository 的 **Settings → Pages**
3. Source 選擇 **「Deploy from a branch」**
4. Branch 選擇 **`main`**（或你的主分支），資料夾選 **`/ (root)`**
5. 點選 **Save**，等待幾分鐘後即可透過 `https://<你的帳號>.github.io/<repo名稱>/` 存取

### 第五步：設定系統

1. 開啟 `https://<你的網址>/admin.html`
2. 在登入畫面下方的 **API 網址** 欄位，貼上第三步複製的 Apps Script URL，點選「儲存」
3. 輸入管理密碼（預設為 `admin123`），點選「登入」
4. 進入後台後可以：
   - 管理獎品（新增、編輯、刪除）
   - 查看即時預覽
   - 儲存設定到伺服器
5. 開啟前台 `index.html`，同樣需要在 localStorage 中有 API URL
   - 最簡單的方式：先在後台設定好 API URL（兩個頁面共用同一個 localStorage key）

---

## 預設管理密碼

```
admin123
```

請在 Google Sheets 的 `Config` 工作表 A2 欄位中修改 JSON 裡的 `adminPassword` 值來更改密碼。

---

## 專案結構

```
├── index.html              # 前台：搶紅包頁面
├── admin.html              # 後台：管理設定頁面
├── css/
│   └── style.css           # 共用樣式
├── js/
│   ├── app.js              # 前台邏輯
│   └── admin.js            # 後台邏輯
├── google-apps-script/
│   └── Code.gs             # Google Apps Script 後端程式
└── README.md               # 本文件
```

---

## 注意事項

- Google Apps Script 免費版有每日呼叫次數限制（一般足夠小型活動使用）
- 前端密碼驗證僅為簡易保護，如需更高安全性請搭配其他驗證機制
- 每人搶紅包次數以「名字」辨識，建議活動時提醒參與者使用真實姓名
- 併發控制使用 `LockService`，可防止同時搶紅包時超發
