/**
 * 搶紅包系統 - 後台管理邏輯
 */

// ==================== 全域變數 ====================
let apiUrl = '';
let prizes = [];
let allRecords = [];
let confirmCallback = null;

// ==================== 初始化 ====================

document.addEventListener('DOMContentLoaded', function () {
  apiUrl = localStorage.getItem('apiUrl') || '';
  createParticles();

  // 填入已儲存的 API URL
  document.getElementById('apiUrlInputLogin').value = apiUrl;

  // 檢查是否已登入
  const isLoggedIn = sessionStorage.getItem('adminLoggedIn');
  if (isLoggedIn && apiUrl) {
    showDashboard();
  }
});

// ==================== 背景粒子 ====================

function createParticles() {
  var container = document.getElementById('particles');
  var emojis = ['🧧', '💰', '🎉', '✨', '🎊', '🏮'];
  var count = 10;

  for (var i = 0; i < count; i++) {
    var particle = document.createElement('span');
    particle.className = 'particle';
    particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    particle.style.left = Math.random() * 100 + '%';
    particle.style.fontSize = (0.8 + Math.random() * 1.2) + 'rem';
    particle.style.animationDuration = (8 + Math.random() * 12) + 's';
    particle.style.animationDelay = (Math.random() * 10) + 's';
    container.appendChild(particle);
  }
}

// ==================== 密碼驗證 ====================

function saveApiUrlFromLogin() {
  var input = document.getElementById('apiUrlInputLogin');
  var url = input.value.trim();
  if (!url) {
    showToast('請輸入 API 網址', 'error');
    return;
  }
  localStorage.setItem('apiUrl', url);
  apiUrl = url;
  showToast('API 網址已儲存', 'success');
}

function verifyPassword() {
  var password = document.getElementById('passwordInput').value;

  if (!apiUrl) {
    apiUrl = document.getElementById('apiUrlInputLogin').value.trim();
    if (apiUrl) {
      localStorage.setItem('apiUrl', apiUrl);
    } else {
      showToast('請先填入並儲存 API 網址', 'error');
      return;
    }
  }

  if (!password) {
    showToast('請輸入密碼', 'error');
    return;
  }

  var url = apiUrl + '?action=verifyPassword&password=' + encodeURIComponent(password);

  fetch(url)
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.success) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        showDashboard();
      } else {
        showToast(data.error || '密碼錯誤', 'error');
      }
    })
    .catch(function (err) {
      showToast('網路錯誤，請確認 API 網址是否正確', 'error');
      console.error('verifyPassword error:', err);
    });
}

function showDashboard() {
  document.getElementById('passwordScreen').style.display = 'none';
  document.getElementById('adminDashboard').style.display = 'block';
  document.getElementById('apiUrlInput').value = apiUrl;
  loadConfig();
  loadRecords();
}

// ==================== API 設定 ====================

function saveApiUrl() {
  var input = document.getElementById('apiUrlInput');
  var url = input.value.trim();
  if (!url) {
    showToast('請輸入 API 網址', 'error');
    return;
  }
  localStorage.setItem('apiUrl', url);
  apiUrl = url;
  showToast('API 網址已儲存', 'success');
}

// ==================== 獎品管理 ====================

function loadConfig() {
  var url = apiUrl + '?action=getConfig';

  fetch(url)
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.success) {
        prizes = data.prizes;
        renderPrizeList();
        renderPreview();
      } else {
        showToast(data.error || '載入設定失敗', 'error');
      }
    })
    .catch(function (err) {
      showToast('載入設定失敗', 'error');
      console.error('loadConfig error:', err);
    });
}

function renderPrizeList() {
  var container = document.getElementById('prizeListAdmin');
  container.innerHTML = '';

  if (prizes.length === 0) {
    container.innerHTML = '<div class="no-records">尚無獎品，請新增</div>';
    return;
  }

  prizes.forEach(function (prize, index) {
    var item = document.createElement('div');
    item.className = 'prize-item-admin';
    item.innerHTML =
      '<span class="item-emoji">' + prize.emoji + '</span>' +
      '<div class="item-info">' +
        '<div class="item-name">' + escapeHtml(prize.name) + '</div>' +
        '<div class="item-detail">ID: ' + escapeHtml(prize.id) + ' · 數量: ' + prize.total + '</div>' +
      '</div>' +
      '<div class="item-actions">' +
        '<button class="btn-icon" onclick="openEditPrize(' + index + ')" title="編輯">✏️</button>' +
        '<button class="btn-icon delete" onclick="deletePrize(' + index + ')" title="刪除">🗑️</button>' +
      '</div>';
    container.appendChild(item);
  });
}

function renderPreview() {
  var container = document.getElementById('previewGrid');
  container.innerHTML = '';

  prizes.forEach(function (prize) {
    var card = document.createElement('div');
    card.className = 'preview-card';
    card.innerHTML =
      '<span class="emoji">' + prize.emoji + '</span>' +
      '<div class="name">' + escapeHtml(prize.name) + '</div>' +
      '<div class="qty">數量: ' + prize.total + '</div>';
    container.appendChild(card);
  });
}

// ==================== 新增/編輯獎品 ====================

function openAddPrize() {
  document.getElementById('editModalTitle').textContent = '新增獎品';
  document.getElementById('editPrizeIndex').value = '-1';
  document.getElementById('editEmoji').value = '🧧';
  document.getElementById('editName').value = '';
  document.getElementById('editTotal').value = '1';
  document.getElementById('editModal').classList.add('active');
}

function openEditPrize(index) {
  var prize = prizes[index];
  document.getElementById('editModalTitle').textContent = '編輯獎品';
  document.getElementById('editPrizeIndex').value = index;
  document.getElementById('editEmoji').value = prize.emoji;
  document.getElementById('editName').value = prize.name;
  document.getElementById('editTotal').value = prize.total;
  document.getElementById('editModal').classList.add('active');
}

function closeEditModal() {
  document.getElementById('editModal').classList.remove('active');
}

function saveEditPrize() {
  var index = parseInt(document.getElementById('editPrizeIndex').value);
  var emoji = document.getElementById('editEmoji').value.trim();
  var name = document.getElementById('editName').value.trim();
  var total = parseInt(document.getElementById('editTotal').value);

  if (!emoji) {
    showToast('請輸入 Emoji', 'error');
    return;
  }
  if (!name) {
    showToast('請輸入獎品名稱', 'error');
    return;
  }
  if (!total || total < 1) {
    showToast('數量至少為 1', 'error');
    return;
  }

  if (index === -1) {
    // Add new
    var id = 'prize_' + Date.now();
    prizes.push({ id: id, name: name, emoji: emoji, total: total });
  } else {
    // Edit existing
    prizes[index].emoji = emoji;
    prizes[index].name = name;
    prizes[index].total = total;
  }

  closeEditModal();
  renderPrizeList();
  renderPreview();
  showToast(index === -1 ? '已新增獎品（尚未儲存到伺服器）' : '已編輯獎品（尚未儲存到伺服器）', 'success');
}

function deletePrize(index) {
  var prize = prizes[index];
  showConfirm('確定要刪除「' + prize.name + '」嗎？', function () {
    prizes.splice(index, 1);
    renderPrizeList();
    renderPreview();
    showToast('已刪除（尚未儲存到伺服器）', 'success');
  });
}

function savePrizesToServer() {
  if (prizes.length === 0) {
    showToast('至少要有一個獎品', 'error');
    return;
  }

  var data = JSON.stringify({ prizes: prizes });
  var url = apiUrl + '?action=setConfig&data=' + encodeURIComponent(data);

  fetch(url)
    .then(function (res) { return res.json(); })
    .then(function (result) {
      if (result.success) {
        showToast('獎品設定已儲存到伺服器！', 'success');
      } else {
        showToast(result.error || '儲存失敗', 'error');
      }
    })
    .catch(function (err) {
      showToast('儲存失敗，請檢查網路連線', 'error');
      console.error('savePrizes error:', err);
    });
}

// ==================== 紀錄管理 ====================

function loadRecords() {
  var container = document.getElementById('recordsContainer');
  var statsContainer = document.getElementById('statsContainer');

  container.innerHTML = '<div class="loading-overlay" style="padding:20px;"><div class="loading-spinner"></div><span>載入中...</span></div>';
  statsContainer.innerHTML = '<div class="loading-overlay" style="padding:20px;"><div class="loading-spinner"></div><span>載入中...</span></div>';

  var url = apiUrl + '?action=getRecords';

  fetch(url)
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.success) {
        allRecords = data.records;
        renderStats(data.stats);
        renderRecordsTable(data.records);
      } else {
        container.innerHTML = '<div class="no-records">載入失敗：' + escapeHtml(data.error) + '</div>';
        statsContainer.innerHTML = '';
      }
    })
    .catch(function (err) {
      container.innerHTML = '<div class="no-records">載入失敗，請檢查網路連線</div>';
      statsContainer.innerHTML = '';
      console.error('loadRecords error:', err);
    });
}

function renderStats(stats) {
  var container = document.getElementById('statsContainer');

  if (!stats || stats.length === 0) {
    container.innerHTML = '<div class="no-records">無統計資料</div>';
    return;
  }

  var html = '<table class="stats-table">';
  html += '<tr><th>獎品</th><th>進度</th><th>數量</th></tr>';

  stats.forEach(function (s) {
    var pct = s.total > 0 ? Math.round((s.grabbed / s.total) * 100) : 0;
    html += '<tr>';
    html += '<td>' + s.emoji + ' ' + escapeHtml(s.name) + '</td>';
    html += '<td><div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div></td>';
    html += '<td>' + s.grabbed + '/' + s.total + '</td>';
    html += '</tr>';
  });

  html += '</table>';
  container.innerHTML = html;
}

function renderRecordsTable(records) {
  var container = document.getElementById('recordsContainer');

  if (!records || records.length === 0) {
    container.innerHTML = '<div class="no-records">尚無紀錄</div>';
    return;
  }

  var html = '<div class="records-table-wrapper"><table class="records-table">';
  html += '<thead><tr><th>姓名</th><th>獎品</th><th>時間</th></tr></thead>';
  html += '<tbody>';

  records.forEach(function (r) {
    html += '<tr>';
    html += '<td>' + escapeHtml(r.name) + '</td>';
    html += '<td>' + escapeHtml(r.prizeName) + '</td>';
    html += '<td>' + escapeHtml(r.time) + '</td>';
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  container.innerHTML = html;
}

// ==================== 清除紀錄 ====================

function confirmClearRecords() {
  showConfirm('確定要清除所有搶紅包紀錄嗎？此操作無法復原！', function () {
    var url = apiUrl + '?action=clearRecords';

    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.success) {
          showToast('紀錄已清除', 'success');
          loadRecords();
        } else {
          showToast(data.error || '清除失敗', 'error');
        }
      })
      .catch(function (err) {
        showToast('清除失敗', 'error');
        console.error('clearRecords error:', err);
      });
  });
}

// ==================== 匯出 CSV ====================

function exportCSV() {
  if (!allRecords || allRecords.length === 0) {
    showToast('沒有紀錄可匯出', 'error');
    return;
  }

  var csvContent = '\uFEFF'; // BOM for Excel UTF-8
  csvContent += '姓名,獎品ID,獎品名稱,時間\n';

  allRecords.forEach(function (r) {
    csvContent +=
      '"' + (r.name || '').replace(/"/g, '""') + '",' +
      '"' + (r.prizeId || '').replace(/"/g, '""') + '",' +
      '"' + (r.prizeName || '').replace(/"/g, '""') + '",' +
      '"' + (r.time || '').replace(/"/g, '""') + '"\n';
  });

  var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = '搶紅包紀錄_' + new Date().toISOString().slice(0, 10) + '.csv';
  link.click();

  showToast('CSV 已匯出', 'success');
}

// ==================== 確認對話框 ====================

function showConfirm(message, callback) {
  document.getElementById('confirmMessage').textContent = message;
  confirmCallback = callback;
  document.getElementById('confirmDialog').classList.add('active');
}

function closeConfirm() {
  document.getElementById('confirmDialog').classList.remove('active');
  confirmCallback = null;
}

function confirmAction() {
  if (confirmCallback) {
    confirmCallback();
  }
  closeConfirm();
}

// ==================== Toast 通知 ====================

function showToast(message, type) {
  var container = document.getElementById('toastContainer');
  var toast = document.createElement('div');
  toast.className = 'toast ' + (type || '');
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(function () {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    toast.style.transition = 'all 0.3s';
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 3000);
}

// ==================== 工具函式 ====================

function escapeHtml(str) {
  if (!str) return '';
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
