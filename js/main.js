// js/main.js
// ============================================
// ENTRY POINT APLIKASI - TURBINE LOGSHEET PRO
// Menginisialisasi semua modul, router, auth, storage, PWA, dll.
// ============================================

// ============================================
// Import Semua Modul Utama
// ============================================

// Config & Konstanta
import { 
  APP_VERSION, 
  APP_NAME, 
  AUTH_CONFIG, 
  GAS_URL 
} from './config/constants.js';

// Utils
import { initStorage } from './utils/storage.js';
import { initAuth, requireAuth, loginOperator, logoutOperator } from './utils/auth.js';
import { initRouter, navigateTo, goBack } from './utils/router.js';
import { 
  showCustomAlert, 
  closeAlert, 
  showToast, 
  showUploadProgress,
  showLoginScreen,
  showLoginError,
  hideLoginError
} from './utils/ui.js';

// Turbine Logsheet
import { 
  initTurbineLogsheet,
  fetchLastData,
  renderAreaList,
  openTurbineArea,
  saveCurrentTurbineStep,
  jumpToTurbineStep,
  submitTurbineLogsheet,
  handleParamPhoto
} from './turbine/logsheet.js';

// CT Logsheet
import { 
  initCTLogsheet,
  fetchLastDataCT,
  renderCTAreaList,
  openCTArea,
  saveCurrentCTStep,
  jumpToCTStep,
  sendCTToSheet,
  handleCTParamPhoto
} from './ct/logsheet.js';

// Balancing
import { 
  initBalancingScreen,
  submitBalancingData,
  resetBalancingForm
} from './balancing/balancing.js';

// ============================================
// Variabel Global (jika masih dibutuhkan oleh HTML onclick)
// ============================================

window.navigateTo = navigateTo;
window.goBack = goBack;
window.requireAuth = requireAuth;
window.loginOperator = loginOperator;
window.logoutOperator = logoutOperator;
window.showCustomAlert = showCustomAlert;
window.closeAlert = closeAlert;

// Khusus turbine
window.openTurbineArea = openTurbineArea;
window.saveCurrentTurbineStep = saveCurrentTurbineStep;
window.jumpToTurbineStep = jumpToTurbineStep;
window.submitTurbineLogsheet = submitTurbineLogsheet;

// Khusus CT
window.openCTArea = openCTArea;
window.jumpToCTStep = jumpToCTStep;
window.sendCTToSheet = sendCTToSheet;

// Khusus balancing
window.submitBalancingData = submitBalancingData;
window.resetBalancingForm = resetBalancingForm;

// ============================================
// Inisialisasi Aplikasi
// ============================================

function initializeApp() {
  console.log(`%c${APP_NAME} v${APP_VERSION} starting...`, 'color: #10b981; font-weight: bold;');

  // 1. Inisialisasi storage & draft
  initStorage();

  // 2. Inisialisasi autentikasi (cek session, load cache, dll)
  initAuth();

  // 3. Inisialisasi router (guard, hooks, dll)
  initRouter();

  // 4. Inisialisasi modul-modul fitur
  initTurbineLogsheet();
  initCTLogsheet();
  // initTPM(); // jika ada modul TPM nanti

  // 5. Register Service Worker untuk PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(`./sw.js?v=${APP_VERSION}`)
        .then(registration => {
          console.log('Service Worker registered:', registration.scope);

          // Deteksi update
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Tampilkan banner update
                const updateAlert = document.getElementById('updateAlert');
                if (updateAlert) updateAlert.classList.remove('hidden');
              }
            });
          });
        })
        .catch(err => console.error('Service Worker registration failed:', err));
    });
  }

  // 6. Setup event listener global (jika belum diatur di modul lain)
  setupGlobalListeners();

  console.log(`%c${APP_NAME} v${APP_VERSION} initialized successfully`, 'color: #10b981; font-weight: bold;');
}

// ============================================
// Global Event Listeners
// ============================================

function setupGlobalListeners() {
  // Login form
  const loginBtn = document.querySelector('#loginScreen .btn-primary');
  if (loginBtn) {
    loginBtn.addEventListener('click', loginOperator);
  }

  const usernameInput = document.getElementById('operatorUsername');
  const passwordInput = document.getElementById('operatorPassword');

  if (usernameInput && passwordInput) {
    usernameInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') passwordInput.focus();
    });
    passwordInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') loginOperator();
    });
  }

  // Foto parameter turbine
  const paramCamera = document.getElementById('paramCamera');
  if (paramCamera) {
    paramCamera.addEventListener('change', handleParamPhoto);
  }

  // Foto parameter CT
  const ctParamCamera = document.getElementById('ctParamCamera');
  if (ctParamCamera) {
    ctParamCamera.addEventListener('change', handleCTParamPhoto);
  }

  // PWA install prompt (opsional)
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('installPwaBtn');
    if (installBtn) installBtn.classList.remove('hidden');
  });

  // Contoh tombol install PWA (jika ada di HTML)
  const installBtn = document.getElementById('installPwaBtn');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast('Aplikasi berhasil diinstall!', 'success');
        }
        deferredPrompt = null;
      }
    });
  }
}

// ============================================
// Jalankan saat DOM siap
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Tampilkan loading awal (jika ada elemen loader)
  const loader = document.getElementById('loader');
  if (loader) {
    setTimeout(() => {
      loader.style.display = 'none';
    }, 1500);
  }

  initializeApp();

  // Jika belum login → tampilkan login screen
  if (!requireAuth()) {
    showLoginScreen();
  } else {
    // Jika sudah login → langsung ke home
    navigateTo('homeScreen');
  }
});

// Optional: Handle error global
window.addEventListener('error', (event) => {
  console.error('[GLOBAL ERROR]', event.error);
  showCustomAlert('Terjadi kesalahan tak terduga. Silakan refresh halaman.', 'error');
});

// Export (jika dibutuhkan oleh modul lain)
export { initializeApp };
