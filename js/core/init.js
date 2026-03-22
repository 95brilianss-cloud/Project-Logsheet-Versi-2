// js/core/init.js
// ============================================
// CORE INITIALIZATION
// Mengatur urutan inisialisasi semua sistem aplikasi
// Dipanggil sekali dari main.js setelah DOM siap
// ============================================

import { APP_NAME, APP_VERSION } from '../config/constants.js';

import { initState } from './state.js';
import { initAuth } from '../utils/auth.js';
import { initRouter } from '../utils/router.js';
import { initStorage } from '../utils/storage.js';
import { startOnlineStatusMonitor } from '../utils/network.js';
import { showCustomAlert, showToast } from '../utils/ui.js';

import { initTurbineLogsheet } from '../turbine/logsheet.js';
import { initCTLogsheet } from '../ct/logsheet.js';
import { initBalancingScreen } from '../balancing/balancing.js';

// Jika ada modul lain nanti:
// import { initTPM } from '../tpm/tpm.js';

// ============================================
// Fungsi Utama Inisialisasi
// ============================================

export function initializeApp() {
  console.log(
    `%c${APP_NAME} v${APP_VERSION} — Initializing...`,
    'color: #10b981; font-weight: bold; font-size: 16px;'
  );

  // 1. Inisialisasi storage (draft, cache, session)
  initStorage();
  console.log('[INIT] Storage initialized');

  // 2. Inisialisasi state global
  initState();
  console.log('[INIT] Global state loaded');

  // 3. Inisialisasi autentikasi (cek session, load user cache)
  initAuth();
  console.log('[INIT] Authentication ready');

  // 4. Inisialisasi router (guard, screen hooks)
  initRouter();
  console.log('[INIT] Router initialized');

  // 5. Inisialisasi fitur-fitur utama
  initTurbineLogsheet();
  initCTLogsheet();
  // initBalancingScreen(); // tidak perlu di sini, dipanggil saat masuk halaman balancing

  // 6. Monitor status online/offline
  startOnlineStatusMonitor((isOnline) => {
    if (isOnline) {
      showToast('Koneksi internet kembali', 'success', 4000);
      // → bisa trigger sync queue offline di sini nanti
    } else {
      showToast('Mode offline diaktifkan', 'warning', 5000);
    }
  });

  // 7. Register Service Worker + deteksi update
  registerServiceWorker();

  // 8. PWA install prompt handler
  setupPWAInstallPrompt();

  console.log(
    `%c${APP_NAME} v${APP_VERSION} — Ready ✓`,
    'color: #10b981; font-weight: bold; font-size: 16px;'
  );

  // Jika sudah login → langsung ke home
  if (isAuthenticated) {
    navigateTo('homeScreen');
  } else {
    showLoginScreen();
  }
}

// ============================================
// Service Worker Registration + Update Detection
// ============================================

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(`./sw.js?v=${APP_VERSION}`)
        .then(registration => {
          console.log('[SW] Registered with scope:', registration.scope);

          // Deteksi ada update
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Tampilkan banner "Update tersedia"
                  const updateAlert = document.getElementById('updateAlert');
                  if (updateAlert) {
                    updateAlert.classList.remove('hidden');
                    showToast('Versi baru tersedia. Silakan refresh.', 'info');
                  }
                }
              });
            }
          });
        })
        .catch(err => {
          console.error('[SW] Registration failed:', err);
        });
    });
  }
}

// ============================================
// PWA Install Prompt
// ============================================

function setupPWAInstallPrompt() {
  let deferredPrompt;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Tampilkan tombol install di UI (jika ada)
    const installBtn = document.getElementById('installPwaBtn');
    if (installBtn) installBtn.classList.remove('hidden');

    // Bisa juga tampilkan banner setelah beberapa detik
    setTimeout(() => {
      if (deferredPrompt && !installBannerShown) {
        showCustomAlert('Aplikasi bisa diinstall untuk akses lebih cepat', 'info');
      }
    }, 8000);
  });

  // Event jika user install
  window.addEventListener('appinstalled', () => {
    showToast('Aplikasi berhasil diinstall!', 'success');
    deferredPrompt = null;
  });

  // Handler tombol install (harus ada di HTML)
  const installBtn = document.getElementById('installPwaBtn');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast('Install dimulai...', 'success');
      }
      deferredPrompt = null;
    });
  }
}

// ============================================
// Export
// ============================================

export default {
  initializeApp
};
