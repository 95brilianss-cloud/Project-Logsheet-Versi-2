// js/utils/ui.js
// ============================================
// UI HELPER FUNCTIONS
// Alert, Navigation, Toast, Progress, Update Elements, dll
// ============================================

import { navigateTo as routerNavigate } from './router.js'; // jika sudah ada router, atau langsung pakai fungsi di bawah

// ============================================
// Custom Alert System
// ============================================

let autoCloseTimer = null;

export function showCustomAlert(msg, type = 'success') {
  const customAlert = document.getElementById('customAlert');
  const alertContent = document.getElementById('alertContent');
  const alertTitle = document.getElementById('alertTitle');
  const alertMessage = document.getElementById('alertMessage');
  const alertIconWrapper = document.getElementById('alertIconWrapper');

  if (!customAlert || !alertContent || !alertTitle || !alertMessage || !alertIconWrapper) {
    console.warn('[UI] Custom alert elements tidak ditemukan, fallback ke alert biasa');
    alert(msg);
    return;
  }

  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer);
    autoCloseTimer = null;
  }

  const titleMap = {
    success: 'Berhasil',
    error: 'Error',
    warning: 'Peringatan',
    info: 'Informasi'
  };

  alertTitle.textContent = titleMap[type] || 'Informasi';
  alertMessage.innerText = msg;
  alertContent.className = 'alert-content ' + (type || 'info');

  // Icon berdasarkan tipe
  const icons = {
    success: `<div class="alert-icon-bg"></div><svg class="alert-icon-svg" viewBox="0 0 52 52"><circle cx="26" cy="26" r="25"/><path d="M14.1 27.2l7.1 7.2 16.7-16.8"/></svg>`,
    error: `<div class="alert-icon-bg" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"></div><svg class="alert-icon-svg" viewBox="0 0 52 52" style="stroke: #ef4444"><circle cx="26" cy="26" r="25"/><path d="M16 16 L36 36 M36 16 L16 36"/></svg>`,
    warning: `<div class="alert-icon-bg" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"></div><svg class="alert-icon-svg" viewBox="0 0 52 52" style="stroke: #f59e0b"><circle cx="26" cy="26" r="25"/><path d="M26 10 L26 30 M26 34 L26 38"/></svg>`,
    info: `<div class="alert-icon-bg" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"></div><svg class="alert-icon-svg" viewBox="0 0 52 52" style="stroke: #3b82f6"><circle cx="26" cy="26" r="25"/><path d="M26 10 L26 30 M26 34 L26 36"/></svg>`
  };

  alertIconWrapper.innerHTML = icons[type] || icons.info;

  customAlert.classList.remove('hidden');

  // Auto close untuk success & info
  if (type === 'success' || type === 'info') {
    autoCloseTimer = setTimeout(() => {
      if (!customAlert.classList.contains('hidden')) {
        closeAlert();
      }
    }, 3000);
  }
}

export function closeAlert() {
  const customAlert = document.getElementById('customAlert');
  if (customAlert) {
    customAlert.classList.add('hidden');
  }
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer);
    autoCloseTimer = null;
  }
}

// ============================================
// Navigation
// ============================================

const protectedScreens = [
  'homeScreen',
  'areaListScreen',
  'paramScreen',
  'tpmScreen',
  'tpmInputScreen',
  'balancingScreen',
  'ctAreaListScreen',
  'ctParamScreen'
];

export function navigateTo(screenId) {
  if (protectedScreens.includes(screenId)) {
    const { requireAuth } = window; // atau import dari auth.js
    if (!requireAuth()) {
      return;
    }
  }

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
    window.scrollTo(0, 0);

    // Screen-specific logic
    switch (screenId) {
      case 'homeScreen':
        loadUserStats?.();
        loadTodayJobs?.();
        setTimeout(addAdminButton, 100);
        break;

      case 'areaListScreen':
        fetchLastData?.();
        updateOverallProgress?.();
        break;

      case 'balancingScreen':
        initBalancingScreen?.();
        break;

      case 'ctAreaListScreen':
        fetchLastDataCT?.();
        updateCTOverallProgress?.();
        break;

      // Tambahkan case lain jika perlu
    }
  } else {
    console.warn(`[UI] Screen tidak ditemukan: ${screenId}`);
  }
}

// ============================================
// Toast Notification (sederhana)
// ============================================

export function showToast(message, type = 'info', duration = 3000) {
  const toastContainer = document.getElementById('toastContainer') || createToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${getToastIcon(type)}</div>
    <div class="toast-message">${message}</div>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;';
  document.body.appendChild(container);
  return container;
}

function getToastIcon(type) {
  const icons = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ'
  };
  return icons[type] || 'ℹ';
}

// ============================================
// Upload Progress Modal
// ============================================

export function showUploadProgress(initialMessage = 'Memproses...') {
  const modal = document.createElement('div');
  modal.id = 'uploadProgressModal';
  modal.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 10000;
    display: flex; align-items: center; justify-content: center;
  `;

  modal.innerHTML = `
    <div style="background: #1e293b; border-radius: 16px; padding: 32px; width: 90%; max-width: 400px; text-align: center; color: white;">
      <div class="spinner" style="margin: 0 auto 20px;"></div>
      <h3 id="progressTitle" style="margin: 0 0 16px; font-size: 1.25rem;">Sedang mengunggah</h3>
      <p id="progressText">${initialMessage}</p>
      <div id="progressBar" style="height: 6px; background: #334155; border-radius: 3px; margin: 16px 0; overflow: hidden;">
        <div id="progressFill" style="height: 100%; width: 0%; background: #3b82f6; transition: width 0.3s;"></div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  return {
    updateText: (text) => {
      document.getElementById('progressText').textContent = text;
    },
    updateProgress: (percent) => {
      document.getElementById('progressFill').style.width = `${percent}%`;
    },
    complete: () => {
      document.getElementById('progressText').textContent = 'Selesai!';
      document.getElementById('progressFill').style.width = '100%';
      setTimeout(() => modal.remove(), 1200);
    },
    error: () => {
      document.getElementById('progressTitle').textContent = 'Gagal';
      document.getElementById('progressText').textContent = 'Terjadi kesalahan';
      document.getElementById('progressFill').style.background = '#ef4444';
      setTimeout(() => modal.remove(), 2500);
    }
  };
}

// ============================================
// Update Alert (Service Worker / App Update)
// ============================================

export function showUpdateAlert() {
  const updateAlert = document.getElementById('updateAlert');
  if (updateAlert) {
    updateAlert.classList.remove('hidden');
  }
}

export function applyUpdate() {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
  }
  window.location.reload();
}

// ============================================
// Helper UI Update
// ============================================

export function updateOverallProgressUI(completed, total) {
  const percent = Math.round((completed / total) * 100);
  const progressText = document.getElementById('progressText');
  const overallPercent = document.getElementById('overallPercent');
  const progressBar = document.getElementById('overallProgressBar');

  if (progressText) progressText.textContent = `${percent}% Complete`;
  if (overallPercent) overallPercent.textContent = `${percent}%`;
  if (progressBar) progressBar.style.width = `${percent}%`;
}

export function updateCTOverallProgressUI(completed, total) {
  const percent = Math.round((completed / total) * 100);
  const progressText = document.getElementById('ctProgressText');
  const overallPercent = document.getElementById('ctOverallPercent');
  const progressBar = document.getElementById('ctOverallProgressBar');

  if (progressText) progressText.textContent = `${percent}% Complete`;
  if (overallPercent) overallPercent.textContent = `${percent}%`;
  if (progressBar) progressBar.style.width = `${percent}%`;
}

// ============================================
// Login Screen Helpers (khusus login)
// ============================================

export function showLoginScreen() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const loginScreen = document.getElementById('loginScreen');
  if (loginScreen) loginScreen.classList.add('active');
}

export function showLoginError(message) {
  const errorMsg = document.getElementById('loginError');
  if (errorMsg) {
    errorMsg.textContent = message;
    errorMsg.style.display = 'block';
  }
}

export function hideLoginError() {
  const errorMsg = document.getElementById('loginError');
  if (errorMsg) {
    errorMsg.style.display = 'none';
    errorMsg.textContent = '';
  }
}

// ============================================
// Export semua fungsi utama
// ============================================

export {
  showCustomAlert,
  closeAlert,
  navigateTo,
  showToast,
  showUploadProgress,
  showUpdateAlert,
  applyUpdate,
  updateOverallProgressUI,
  updateCTOverallProgressUI,
  showLoginScreen,
  showLoginError,
  hideLoginError
};
