// js/utils/router.js
// ============================================
// ROUTER / NAVIGATION MANAGER
// Mengelola perpindahan antar screen dengan guard dan lifecycle hooks
// ============================================

import { requireAuth } from './auth.js';
import { showCustomAlert } from './ui.js';

// Daftar semua screen yang ada di aplikasi
const SCREENS = {
  // Public
  loginScreen: 'loginScreen',

  // Protected
  homeScreen: 'homeScreen',
  areaListScreen: 'areaListScreen',
  paramScreen: 'paramScreen',
  tpmScreen: 'tpmScreen',
  tpmInputScreen: 'tpmInputScreen',
  balancingScreen: 'balancingScreen',
  ctAreaListScreen: 'ctAreaListScreen',
  ctParamScreen: 'ctParamScreen',

  // Bisa ditambahkan nanti: settings, profile, reports, dll
};

// Daftar screen yang memerlukan autentikasi
const PROTECTED_SCREENS = new Set([
  'homeScreen',
  'areaListScreen',
  'paramScreen',
  'tpmScreen',
  'tpmInputScreen',
  'balancingScreen',
  'ctAreaListScreen',
  'ctParamScreen'
]);

// Screen-specific initialization hooks (opsional)
const SCREEN_HOOKS = {
  homeScreen: () => {
    // Panggil fungsi yang ada di kode asli
    if (typeof loadUserStats === 'function') loadUserStats();
    if (typeof loadTodayJobs === 'function') loadTodayJobs();
    setTimeout(() => {
      if (typeof addAdminButton === 'function') addAdminButton();
    }, 100);
  },

  areaListScreen: () => {
    if (typeof fetchLastData === 'function') fetchLastData();
    if (typeof updateOverallProgress === 'function') updateOverallProgress();
  },

  balancingScreen: () => {
    if (typeof initBalancingScreen === 'function') initBalancingScreen();
  },

  ctAreaListScreen: () => {
    if (typeof fetchLastDataCT === 'function') fetchLastDataCT();
    if (typeof updateCTOverallProgress === 'function') updateCTOverallProgress();
  },

  // Tambahkan hook lain sesuai kebutuhan
  // paramScreen: () => { ... },
  // ctParamScreen: () => { ... },
};

/**
 * Navigasi ke screen tertentu
 * @param {string} screenId - ID dari elemen screen (harus ada di SCREENS)
 * @param {object} options - opsi tambahan (opsional)
 * @param {boolean} options.force - bypass auth check (hanya untuk kasus khusus)
 * @param {object} options.data - data yang ingin dikirim ke screen (bisa di-extend nanti)
 */
export function navigateTo(screenId, options = {}) {
  const { force = false } = options;

  // Validasi screenId
  if (!Object.prototype.hasOwnProperty.call(SCREENS, screenId)) {
    console.error(`[ROUTER] Screen tidak ditemukan: ${screenId}`);
    showCustomAlert(`Halaman tidak ditemukan: ${screenId}`, 'error');
    return;
  }

  // Guard: proteksi screen yang memerlukan login
  if (PROTECTED_SCREENS.has(screenId) && !force) {
    if (!requireAuth()) {
      // requireAuth() sudah menampilkan login screen & alert
      return;
    }
  }

  // Sembunyikan semua screen
  document.querySelectorAll('.screen').forEach(el => {
    el.classList.remove('active');
    // Optional: tambahkan class 'hidden' atau animasi keluar jika ada CSS transition
  });

  // Tampilkan screen target
  const targetScreen = document.getElementById(screenId);
  if (targetScreen) {
    targetScreen.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Jalankan hook inisialisasi khusus screen (jika ada)
    if (typeof SCREEN_HOOKS[screenId] === 'function') {
      try {
        SCREEN_HOOKS[screenId]();
      } catch (err) {
        console.error(`[ROUTER] Error saat inisialisasi ${screenId}:`, err);
      }
    }

    // Optional: simpan history jika ingin back button browser berfungsi
    // window.history.pushState({ screen: screenId }, '', `#${screenId}`);

    console.log(`[ROUTER] Navigasi berhasil → ${screenId}`);
  } else {
    console.warn(`[ROUTER] Elemen #${screenId} tidak ditemukan di DOM`);
    showCustomAlert('Terjadi kesalahan navigasi. Silakan coba lagi.', 'error');
  }
}

/**
 * Kembali ke screen sebelumnya (sederhana, bisa ditingkatkan dengan history stack)
 */
export function goBack() {
  // Versi sederhana: kembali ke home jika memungkinkan
  // Nanti bisa diganti dengan window.history.back() + handling state
  if (document.getElementById('paramScreen')?.classList.contains('active') ||
      document.getElementById('ctParamScreen')?.classList.contains('active')) {
    navigateTo('areaListScreen'); // atau ctAreaListScreen tergantung konteks
  } else if (document.getElementById('areaListScreen')?.classList.contains('active') ||
             document.getElementById('ctAreaListScreen')?.classList.contains('active')) {
    navigateTo('homeScreen');
  } else {
    navigateTo('homeScreen');
  }
}

/**
 * Inisialisasi router (dipanggil sekali saat app start)
 * Bisa digunakan untuk handle deep link atau hash change di masa depan
 */
export function initRouter() {
  // Optional: handle browser back/forward
  // window.addEventListener('popstate', (event) => {
  //   const screen = event.state?.screen || 'homeScreen';
  //   navigateTo(screen, { force: true });
  // });

  // Optional: handle initial hash jika ada
  const initialHash = window.location.hash.replace('#', '');
  if (initialHash && Object.prototype.hasOwnProperty.call(SCREENS, initialHash)) {
    navigateTo(initialHash);
  }

  console.log('[ROUTER] Router diinisialisasi');
}

// Export fungsi utama
export default {
  navigateTo,
  goBack,
  initRouter,
  SCREENS,
  PROTECTED_SCREENS
};
