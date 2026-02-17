/**
 * 搶紅包系統 - Google Apps Script 後端
 *
 * 使用方式：
 * 1. 在 Google Sheets 中開啟 Apps Script 編輯器
 * 2. 貼上此程式碼
 * 3. 執行 initSheets() 初始化工作表
 * 4. 部署為網路應用程式
 */

// ==================== 初始化 ====================

/**
 * 手動執行一次，建立工作表和預設資料
 */
function initSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 建立 Config 工作表
  var configSheet = ss.getSheetByName('Config');
  if (!configSheet) {
    configSheet = ss.insertSheet('Config');
  }
  configSheet.clear();
  configSheet.getRange('A1').setValue('設定（請勿手動修改此欄）');

  var defaultConfig = {
    adminPassword: "admin123",
    prizes: [
      { id: "prize_1", name: "紅包 666 元", emoji: "🧧", total: 2 },
      { id: "prize_2", name: "紅包 168 元", emoji: "🧧", total: 6 },
      { id: "prize_3", name: "紅包 88 元", emoji: "🧧", total: 5 },
      { id: "prize_4", name: "紅包 66 元", emoji: "🧧", total: 3 }
    ]
  };
  configSheet.getRange('A2').setValue(JSON.stringify(defaultConfig));

  // 建立 Records 工作表
  var recordsSheet = ss.getSheetByName('Records');
  if (!recordsSheet) {
    recordsSheet = ss.insertSheet('Records');
  }
  recordsSheet.clear();
  recordsSheet.getRange('A1:D1').setValues([['name', 'prizeId', 'prizeName', 'time']]);

  // 格式化標題列
  var headerRange = recordsSheet.getRange('A1:D1');
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#f0f0f0');

  Logger.log('工作表初始化完成！');
}

// ==================== API 路由 ====================

function doGet(e) {
  var action = e.parameter.action;
  var result;

  try {
    switch (action) {
      case 'getStatus':
        result = getStatus(e.parameter.name);
        break;
      case 'grab':
        result = grab(e.parameter.name);
        break;
      case 'getConfig':
        result = getConfig();
        break;
      case 'setConfig':
        result = setConfig(e.parameter.data);
        break;
      case 'getRecords':
        result = getRecords();
        break;
      case 'clearRecords':
        result = clearRecords();
        break;
      case 'verifyPassword':
        result = verifyPassword(e.parameter.password);
        break;
      default:
        result = { success: false, error: '未知的 action: ' + action };
    }
  } catch (err) {
    result = { success: false, error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== 輔助函式 ====================

function getConfigData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var configSheet = ss.getSheetByName('Config');
  var raw = configSheet.getRange('A2').getValue();
  return JSON.parse(raw);
}

function saveConfigData(config) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var configSheet = ss.getSheetByName('Config');
  configSheet.getRange('A2').setValue(JSON.stringify(config));
}

function getAllRecords() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var recordsSheet = ss.getSheetByName('Records');
  var lastRow = recordsSheet.getLastRow();

  if (lastRow <= 1) return [];

  var data = recordsSheet.getRange(2, 1, lastRow - 1, 4).getValues();
  return data.map(function(row) {
    return {
      name: row[0],
      prizeId: row[1],
      prizeName: row[2],
      time: row[3]
    };
  });
}

// ==================== API 處理函式 ====================

/**
 * 取得獎品清單 + 搶紅包紀錄 + 某人是否已搶過
 */
function getStatus(name) {
  var config = getConfigData();
  var records = getAllRecords();

  // 計算每個獎品的剩餘數量
  var grabbed = {};
  records.forEach(function(r) {
    grabbed[r.prizeId] = (grabbed[r.prizeId] || 0) + 1;
  });

  var prizes = config.prizes.map(function(p) {
    var used = grabbed[p.id] || 0;
    return {
      id: p.id,
      name: p.name,
      emoji: p.emoji,
      total: p.total,
      remaining: p.total - used
    };
  });

  // 檢查此人是否已搶過
  var hasGrabbed = false;
  var grabbedPrize = null;
  if (name) {
    for (var i = 0; i < records.length; i++) {
      if (records[i].name === name) {
        hasGrabbed = true;
        grabbedPrize = {
          prizeId: records[i].prizeId,
          prizeName: records[i].prizeName
        };
        break;
      }
    }
  }

  // 最新紀錄在前（最多回傳 50 筆）
  var recentRecords = records.reverse().slice(0, 50);

  return {
    success: true,
    prizes: prizes,
    records: recentRecords,
    hasGrabbed: hasGrabbed,
    grabbedPrize: grabbedPrize
  };
}

/**
 * 搶紅包（含併發鎖）
 */
function grab(name) {
  if (!name || name.trim() === '') {
    return { success: false, error: '請輸入你的名字' };
  }

  name = name.trim();

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // 等待最多 10 秒
  } catch (e) {
    return { success: false, error: '系統忙碌中，請稍後再試' };
  }

  try {
    var config = getConfigData();
    var records = getAllRecords();

    // 檢查是否已搶過
    for (var i = 0; i < records.length; i++) {
      if (records[i].name === name) {
        lock.releaseLock();
        return { success: false, error: '你已經搶過紅包了！', alreadyGrabbed: true };
      }
    }

    // 計算各獎品已搶數量
    var grabbed = {};
    records.forEach(function(r) {
      grabbed[r.prizeId] = (grabbed[r.prizeId] || 0) + 1;
    });

    // 建立可搶獎品清單（加權隨機）
    var available = [];
    config.prizes.forEach(function(p) {
      var used = grabbed[p.id] || 0;
      var remaining = p.total - used;
      if (remaining > 0) {
        for (var j = 0; j < remaining; j++) {
          available.push(p);
        }
      }
    });

    if (available.length === 0) {
      lock.releaseLock();
      return { success: false, error: '紅包已經搶完了！' };
    }

    // 隨機抽一個
    var idx = Math.floor(Math.random() * available.length);
    var prize = available[idx];
    var now = new Date();
    var timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

    // 寫入紀錄
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var recordsSheet = ss.getSheetByName('Records');
    recordsSheet.appendRow([name, prize.id, prize.name, timeStr]);

    lock.releaseLock();

    return {
      success: true,
      prize: {
        id: prize.id,
        name: prize.name,
        emoji: prize.emoji
      }
    };
  } catch (e) {
    lock.releaseLock();
    return { success: false, error: '搶紅包時發生錯誤：' + e.message };
  }
}

/**
 * 取得獎品設定
 */
function getConfig() {
  var config = getConfigData();
  return {
    success: true,
    prizes: config.prizes
  };
}

/**
 * 儲存獎品設定
 */
function setConfig(dataStr) {
  try {
    var data = JSON.parse(dataStr);
    var config = getConfigData();
    config.prizes = data.prizes;
    saveConfigData(config);
    return { success: true };
  } catch (e) {
    return { success: false, error: '儲存設定失敗：' + e.message };
  }
}

/**
 * 取得完整紀錄
 */
function getRecords() {
  var records = getAllRecords();
  var config = getConfigData();

  // 計算統計
  var grabbed = {};
  records.forEach(function(r) {
    grabbed[r.prizeId] = (grabbed[r.prizeId] || 0) + 1;
  });

  var stats = config.prizes.map(function(p) {
    return {
      id: p.id,
      name: p.name,
      emoji: p.emoji,
      total: p.total,
      grabbed: grabbed[p.id] || 0
    };
  });

  return {
    success: true,
    records: records.reverse(),
    stats: stats
  };
}

/**
 * 清除所有紀錄
 */
function clearRecords() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var recordsSheet = ss.getSheetByName('Records');
  var lastRow = recordsSheet.getLastRow();

  if (lastRow > 1) {
    recordsSheet.deleteRows(2, lastRow - 1);
  }

  return { success: true };
}

/**
 * 驗證管理密碼
 */
function verifyPassword(password) {
  var config = getConfigData();
  if (password === config.adminPassword) {
    return { success: true };
  } else {
    return { success: false, error: '密碼錯誤' };
  }
}
