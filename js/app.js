// ============================================
// MAIN APPLICATION ENTRY POINT - APP.js
// ============================================

/**
 * 1. Global State Management
 */
let lastData = {};
let lastDataCT = {};
let currentInput = {};
let currentInputCT = {};
let activeArea = "";
let activeIdx = 0;
let activeAreaCT = "";
let activeIdxCT = 0;
let paramPhotos = {};
let ctParamPhotos = {};

/**
 * 2. Inisialisasi Saat DOM Ready
 */
window.addEventListener('DOMContentLoaded', () => {
    console.log(`${APP_NAME} v${APP_VERSION} memulai inisialisasi...`);
    
    // Tampilkan versi di UI
    const versionDisplay = document.getElementById('versionDisplay');
    if (versionDisplay) versionDisplay.textContent = APP_VERSION;
    
    // Jalankan urutan inisialisasi
    initState();        // Memulihkan data dari LocalStorage
    initAuth();         // Mengecek sesi login (dari auth.js)
    registerServiceWorker(); // Mendaftarkan PWA Offline (sw.js)
    setupEventListeners();   // Mengaktifkan klik tombol & shortcut
    
    // Simulasi loading screen selesai
    hideLoadingScreen();
});

/**
 * 3. Memulihkan State dari LocalStorage
 */
function initState() {
    // Ambil draft Turbin
    const savedTurbine = localStorage.getItem(DRAFT_KEYS.LOGSHEET);
    if (savedTurbine) currentInput = JSON.parse(savedTurbine);
    
    // Ambil draft CT
    const savedCT = localStorage.getItem(DRAFT_KEYS_CT.LOGSHEET);
    if (savedCT) currentInputCT = JSON.parse(savedCT);
    
    // Ambil draft Foto
    const savedPhotos = localStorage.getItem(PHOTO_DRAFT_KEYS.TURBINE);
    if (savedPhotos) paramPhotos = JSON.parse(savedPhotos);
    
    const savedCTPhotos = localStorage.getItem(PHOTO_DRAFT_KEYS.CT);
    if (savedCTPhotos) ctParamPhotos = JSON.parse(savedCTPhotos);

    console.log("State berhasil dipulihkan dari storage.");
}

/**
 * 4. Pendaftaran PWA Service Worker
 */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register(`./sw.js?v=${APP_VERSION}`)
            .then(reg => {
                console.log('[PWA] Service Worker terdaftar:', reg.scope);
                
                // Cek update aplikasi
                reg.onupdatefound = () => {
                    const installingWorker = reg.installing;
                    installingWorker.onstatechange = () => {
                        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showCustomAlert("Update tersedia! Segarkan halaman.", "info");
                        }
                    };
                };
            })
            .catch(err => console.error('[PWA] Gagal daftar SW:', err));
    }
}

/**
 * 5. Global Event Listeners & Shortcuts
 */
function setupEventListeners() {
    // Shortcut Keyboard (Enter untuk simpan, Esc untuk balik)
    document.addEventListener('keydown', (e) => {
        const activeScreen = document.querySelector('.screen.active')?.id;
        
        if (activeScreen === 'paramScreen') {
            if (e.key === 'Enter') saveCurrentStep();
            if (e.key === 'Escape') navigateTo('areaListScreen');
        } else if (activeScreen === 'ctParamScreen') {
            if (e.key === 'Enter') saveCTStep();
            if (e.key === 'Escape') navigateTo('ctAreaListScreen');
        }
    });

    // Deteksi Status Koneksi
    window.addEventListener('online', () => updateStatusIndicator(true));
    window.addEventListener('offline', () => updateStatusIndicator(false));
}

/**
 * 6. UI Helpers (Loading Management)
 */
function hideLoadingScreen() {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.classList.add('hidden'), 500);
    }
}

function simulateLoading() {
    const progress = document.getElementById('loaderProgress');
    let width = 0;
    const interval = setInterval(() => {
        if (width >= 100) {
            clearInterval(interval);
        } else {
            width += 5;
            if (progress) progress.style.width = width + '%';
        }
    }, 50);
}

/*** 7. PWA Install Trigger*/
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('installPwaBtn');
    if (installBtn) installBtn.classList.remove('hidden');
});

async function installPWA() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
        document.getElementById('installPwaBtn').classList.add('hidden');
    }
    deferredPrompt = null;
}
