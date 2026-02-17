/**
 * 搶紅包系統 - 前台邏輯
 */

// ==================== 全域變數 ====================
let currentUser = '';
let apiUrl = '';
let hasGrabbed = false;

// ==================== 初始化 ====================

document.addEventListener('DOMContentLoaded', function () {
  apiUrl = localStorage.getItem('apiUrl') || '';
  createParticles();

  // 如果之前已輸入過名字，自動進入
  const savedName = sessionStorage.getItem('userName');
  if (savedName) {
    document.getElementById('nameInput').value = savedName;
    enterGame();
  }
});

// ==================== 背景粒子 ====================

function createParticles() {
  const container = document.getElementById('particles');
  const emojis = ['🧧', '💰', '🎉', '✨', '🎊', '🏮', '🎆', '💫'];
  const count = 15;

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('span');
    particle.className = 'particle';
    particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    particle.style.left = Math.random() * 100 + '%';
    particle.style.fontSize = (0.8 + Math.random() * 1.2) + 'rem';
    particle.style.animationDuration = (8 + Math.random() * 12) + 's';
    particle.style.animationDelay = (Math.random() * 10) + 's';
    container.appendChild(particle);
  }
}

// ==================== 進入遊戲 ====================

function enterGame() {
  const nameInput = document.getElementById('nameInput');
  const name = nameInput.value.trim();

  if (!name) {
    showToast('請輸入你的名字！', 'error');
    nameInput.focus();
    return;
  }

  if (!apiUrl) {
    apiUrl = localStorage.getItem('apiUrl') || '';
    if (!apiUrl) {
      showToast('尚未設定 API 網址，請先到管理後台設定', 'error');
      return;
    }
  }

  currentUser = name;
  sessionStorage.setItem('userName', name);

  document.getElementById('nameScreen').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'block';

  loadStatus();
}

// ==================== 載入狀態 ====================

function loadStatus() {
  const loadingScreen = document.getElementById('loadingScreen');
  const prizesSection = document.getElementById('prizesSection');
  const recordsSection = document.getElementById('recordsSection');

  loadingScreen.style.display = 'flex';
  prizesSection.style.display = 'none';
  recordsSection.style.display = 'none';

  const url = apiUrl + '?action=getStatus&name=' + encodeURIComponent(currentUser);

  fetch(url)
    .then(function (res) { return res.json(); })
    .then(function (data) {
      loadingScreen.style.display = 'none';

      if (!data.success) {
        showToast(data.error || '載入失敗', 'error');
        return;
      }

      hasGrabbed = data.hasGrabbed;

      // Show grabbed banner
      if (data.hasGrabbed && data.grabbedPrize) {
        document.getElementById('grabbedBanner').style.display = 'block';
        document.getElementById('grabbedPrizeName').textContent = data.grabbedPrize.prizeName;
      } else {
        document.getElementById('grabbedBanner').style.display = 'none';
      }

      renderPrizes(data.prizes);
      renderRecords(data.records);

      prizesSection.style.display = 'block';
      recordsSection.style.display = 'block';
    })
    .catch(function (err) {
      loadingScreen.style.display = 'none';
      showToast('網路錯誤，請稍後再試', 'error');
      console.error('loadStatus error:', err);
    });
}

// ==================== 渲染獎品 ====================

function renderPrizes(prizes) {
  const grid = document.getElementById('prizesGrid');
  grid.innerHTML = '';

  prizes.forEach(function (prize) {
    const card = document.createElement('div');
    const isEmpty = prize.remaining <= 0;
    const isDisabled = isEmpty || hasGrabbed;

    card.className = 'prize-card' + (isDisabled ? ' disabled' : '');

    card.innerHTML =
      '<span class="emoji">' + prize.emoji + '</span>' +
      '<div class="name">' + escapeHtml(prize.name) + '</div>' +
      '<div class="remaining ' + (isEmpty ? 'empty' : '') + '">' +
        (isEmpty ? '已搶完' : '剩餘 ' + prize.remaining + ' 個') +
      '</div>';

    if (!isDisabled) {
      card.onclick = function () { grabPrize(prize.id); };
    }

    grid.appendChild(card);
  });
}

// ==================== 渲染紀錄 ====================

function renderRecords(records) {
  const list = document.getElementById('recordsList');
  list.innerHTML = '';

  if (!records || records.length === 0) {
    list.innerHTML = '<div class="no-records">還沒有人搶紅包</div>';
    return;
  }

  records.forEach(function (record) {
    var timeStr = record.time;
    // Only show time portion if it looks like a datetime
    if (timeStr && timeStr.length > 10) {
      timeStr = timeStr.substring(11);
    }

    const item = document.createElement('div');
    item.className = 'record-item';
    item.innerHTML =
      '<span class="record-emoji">🧧</span>' +
      '<div class="record-info">' +
        '<div class="record-name">' + escapeHtml(record.name) + '</div>' +
        '<div class="record-prize">' + escapeHtml(record.prizeName) + '</div>' +
      '</div>' +
      '<span class="record-time">' + escapeHtml(timeStr) + '</span>';

    list.appendChild(item);
  });
}

// ==================== 搶紅包 ====================

function grabPrize(prizeId) {
  if (hasGrabbed) {
    showToast('你已經搶過紅包了！', 'error');
    return;
  }

  // Disable all cards
  document.querySelectorAll('.prize-card').forEach(function (c) {
    c.classList.add('disabled');
  });

  const url = apiUrl + '?action=grab&name=' + encodeURIComponent(currentUser);

  fetch(url)
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (!data.success) {
        showToast(data.error || '搶紅包失敗', 'error');
        if (data.alreadyGrabbed) {
          hasGrabbed = true;
        }
        loadStatus();
        return;
      }

      hasGrabbed = true;
      showResultModal(data.prize);
      launchConfetti();

      // Reload after a short delay
      setTimeout(function () { loadStatus(); }, 500);
    })
    .catch(function (err) {
      showToast('網路錯誤，請稍後再試', 'error');
      console.error('grab error:', err);
      loadStatus();
    });
}

// ==================== 結果彈窗 ====================

function showResultModal(prize) {
  document.getElementById('modalEmoji').textContent = prize.emoji;
  document.getElementById('modalTitle').textContent = '恭喜！';
  document.getElementById('modalPrize').textContent = prize.name;
  document.getElementById('resultModal').classList.add('active');
}

function closeModal() {
  document.getElementById('resultModal').classList.remove('active');
}

// ==================== 撒花效果 ====================

function launchConfetti() {
  const container = document.getElementById('confettiContainer');
  const colors = ['#f1c40f', '#e74c3c', '#e67e22', '#2ecc71', '#3498db', '#9b59b6', '#ff6b6b'];
  const shapes = ['square', 'circle'];
  const count = 80;

  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';

    const color = colors[Math.floor(Math.random() * colors.length)];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const size = 6 + Math.random() * 8;
    const left = Math.random() * 100;
    const duration = 1.5 + Math.random() * 2;
    const delay = Math.random() * 0.5;

    piece.style.left = left + '%';
    piece.style.width = size + 'px';
    piece.style.height = size + 'px';
    piece.style.backgroundColor = color;
    piece.style.borderRadius = shape === 'circle' ? '50%' : '2px';
    piece.style.animationDuration = duration + 's';
    piece.style.animationDelay = delay + 's';

    container.appendChild(piece);

    // Clean up after animation
    setTimeout(function () {
      if (piece.parentNode) piece.parentNode.removeChild(piece);
    }, (duration + delay) * 1000 + 100);
  }
}

// ==================== Toast 通知 ====================

function showToast(message, type) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
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
