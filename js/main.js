/* ============================================
   TURBINE LOGSHEET PRO - MAIN ENTRY & SYSTEM
   ============================================ */

// ============================================
// 1. INITIALIZATION & SERVICE WORKER
// ============================================

function initState() {
    try {
        // DRAFT_KEYS dan DRAFT_KEYS_CT berasal dari config.js
        // currentInput dan currentInputCT berasal dari state.js
        const savedDraft = localStorage.getItem(DRAFT_KEYS.LOGSHEET);
        if (savedDraft) currentInput = JSON.parse(savedDraft);
        
        const savedCTDraft = localStorage.getItem(DRAFT_KEYS_CT.LOGSHEET);
        if (savedCTDraft) currentInputCT = JSON.parse(savedCTDraft);
        
        // Load foto draft (Fungsi ada di logsheet.js)
        if (typeof loadParamPhotosFromDraft === 'function') loadParamPhotosFromDraft();
        if (typeof loadCTParamPhotosFromDraft === 'function') loadCTParamPhotosFromDraft();
        
        totalParams = Object.values(AREAS).reduce((acc, arr) => acc + arr.length, 0);
        totalParamsCT = Object.values(AREAS_CT).reduce((acc, arr) => acc + arr.length, 0);
    } catch (e) {
        console.error('Error loading state:', e);
    }
}

// Register Service Worker untuk PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register(`./sw.js?v=${APP_VERSION}`)
            .then(registration => {
                console.log('SW registered:', registration.scope);
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showUpdateAlert();
                        }
                    });
                });
            })
            .catch(err => console.error('SW registration failed:', err));
            
        navigator.serviceWorker.addEventListener('message', event => {
            if (event.data?.type === 'VERSION_CHECK' && event.data.version !== APP_VERSION) {
                showUpdateAlert();
            }
        });
    });
}

// ============================================
// 2. JOB LIST FROM SPREADSHEET
// ============================================

const JOB_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzkh6ZViJMh8MJWFnunALO3QIrjqBv1ePXJ8ObW3C_HCGKl4FHX19XGvuUFc9-Fzvwz/exec';

function loadTodayJobs() {
    const jobDateEl = document.getElementById('jobDate');
    const jobListContainer = document.getElementById('jobListContainer');
    
    // Set tanggal hari ini
    const today = new Date();
    if (jobDateEl) {
        jobDateEl.textContent = today.toLocaleDateString('id-ID', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
    }
    
    // Tampilkan animasi loading
    if (jobListContainer) {
        jobListContainer.innerHTML = `
            <div class="job-loading">
                <div class="spinner"></div>
                <span>Memuat data...</span>
            </div>
        `;
    }
    
    fetchJobsFromSheet();
}

async function fetchJobsFromSheet() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // Batas waktu 5 detik

    try {
        const targetSheet = encodeURIComponent("joblist hari ini");
        const response = await fetch(`${JOB_SHEET_URL}?action=getJobs&date=today&sheetName=${targetSheet}`, {
            method: 'GET',
            mode: 'cors',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error('Network error');
        
        const data = await response.json();
        
        if (data.success && data.jobs && data.jobs.length > 0) {
            renderJobList(data.jobs);
        } else {
            renderEmptyJobList();
        }
    } catch (error) {
        console.log('Fetch jobs error/timeout, memuat sample:', error);
        clearTimeout(timeoutId);
        renderSampleJobs();
    }
}

function renderJobList(jobs) {
    const jobListContainer = document.getElementById('jobListContainer');
    if (!jobListContainer) return;
    
    let html = '';
    jobs.forEach(job => {
        const statusClass = job.status === 'completed' ? 'completed' : 'pending';
        html += `
            <div class="job-item">
                <div class="job-item-status ${statusClass}"></div>
                <span class="job-item-text">${job.description || job.name}</span>
            </div>
        `;
    });
    
    jobListContainer.innerHTML = html;
}

function renderEmptyJobList() {
    const jobListContainer = document.getElementById('jobListContainer');
    if (!jobListContainer) return;
    
    jobListContainer.innerHTML = `
        <div class="job-empty">
            <div class="job-empty-icon">📋</div>
            <p>Tidak ada job untuk hari ini</p>
        </div>
    `;
}

function renderSampleJobs() {
    const jobListContainer = document.getElementById('jobListContainer');
    if (!jobListContainer) return;
    
    const sampleJobs = [
        { description: 'Input Logsheet Shift 3', status: 'pending' },
        { description: 'TPM Area Turbin', status: 'completed' },
        { description: 'Update Balancing Power', status: 'pending' }
    ];
    
    let html = '';
    sampleJobs.forEach(job => {
        const statusClass = job.status === 'completed' ? 'completed' : 'pending';
        html += `
            <div class="job-item">
                <div class="job-item-status ${statusClass}"></div>
                <span class="job-item-text">${job.description}</span>
            </div>
        `;
    });
    
    jobListContainer.innerHTML = html;
}

// ============================================
// 3. UI & NAVIGATION HELPERS (GLOBAL SCOPE)
// ============================================

function goToLogsheetTurbin() {
    navigateTo('areaListScreen');
    if (typeof renderMenu === 'function') {
        renderMenu(); // Memanggil fungsi dari logsheet.js
    }
}

function goToLogsheetCT() {
    navigateTo('ctAreaListScreen');
    if (typeof renderCTMenu === 'function') {
        renderCTMenu();
    }
}

function toggleBranchMenuPopup() {
    const overlay = document.getElementById('branchMenuPopupOverlay');
    if (overlay) overlay.classList.toggle('hidden');
}

function closeBranchMenuPopup() {
    const overlay = document.getElementById('branchMenuPopupOverlay');
    if (overlay) overlay.classList.add('hidden');
}

/**
 * Menampilkan overlay notifikasi update versi
 */
function showUpdateAlert() {
    const updateAlert = document.getElementById('updateAlert');
    if (updateAlert) {
        updateAlert.classList.remove('hidden');
    }
}

/**
 * Menjalankan proses update dengan memberitahu Service Worker 
 * untuk segera mengaktifkan versi baru (Skip Waiting)
 */
function applyUpdate() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(reg => {
            if (reg && reg.waiting) {
                // Kirim pesan ke sw.js agar skipWaiting
                reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            } else {
                // Fallback jika reg.waiting hilang, langsung reload
                window.location.reload();
            }
        });
    }

    // Listener otomatis: saat SW baru mengambil alih kendali, reload halaman
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
    });
}

// ============================================
// 4. UI SETUP & LISTENERS
// ============================================

function setupLoginListeners() {
    const usernameInput = document.getElementById('operatorUsername');
    const passwordInput = document.getElementById('operatorPassword');
    
    if (usernameInput) {
        usernameInput.addEventListener('input', hideLoginError);
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') passwordInput?.focus();
        });
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('input', hideLoginError);
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') loginOperator();
        });
    }
}

function setupTPMListeners() {
    const tpmCamera = document.getElementById('tpmCamera');
    if (tpmCamera && typeof handleTPMPhoto === 'function') {
        tpmCamera.addEventListener('change', handleTPMPhoto);
    }
}

function setupParamPhotoListeners() {
    const paramCamera = document.getElementById('paramCamera');
    const ctParamCamera = document.getElementById('ctParamCamera');
    
    if (paramCamera && typeof handleParamPhoto === 'function') {
        paramCamera.addEventListener('change', handleParamPhoto);
    }
    if (ctParamCamera && typeof handleCTParamPhoto === 'function') {
        ctParamCamera.addEventListener('change', handleCTParamPhoto);
    }
}

function simulateLoading() {
    let progress = 0;
    const loaderProgress = document.getElementById('loaderProgress');
    const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setTimeout(() => {
                const loader = document.getElementById('loader');
                if (loader) loader.style.display = 'none';
            }, 500);
        }
        if (loaderProgress) loaderProgress.style.width = progress + '%';
    }, 300);
}

// ============================================
// 4.1 PWA INSTALLATION LOGIC
// ============================================
// 1. Tangkap event instalasi dari browser
window.addEventListener('beforeinstallprompt', (e) => {
    // Cegah browser menampilkan prompt bawaan otomatis
    e.preventDefault();
    // Simpan event agar bisa dipicu nanti via tombol
    deferredPrompt = e;
    
    // Tampilkan tombol instalasi jika sebelumnya disembunyikan
    const installBtn = document.getElementById('installBtnId'); // Sesuaikan ID tombol Anda
    if (installBtn) installBtn.style.display = 'block';
});

// 2. Definisi fungsi installPWA yang dipanggil tombol HTML
function installPWA() {
    if (!deferredPrompt) {
        showCustomAlert('Aplikasi sudah terinstal atau tidak mendukung instalasi saat ini.', 'info');
        return;
    }
    
    // Munculkan prompt instalasi browser
    deferredPrompt.prompt();
    
    // Cek pilihan user
    deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('User menerima instalasi PWA');
        } else {
            console.log('User menolak instalasi PWA');
        }
        // Reset prompt karena hanya bisa digunakan sekali
        deferredPrompt = null;
    });
}

// 3. Event listener jika PWA berhasil terinstal
window.addEventListener('appinstalled', (evt) => {
    console.log('PWA berhasil diinstal!');
    showCustomAlert('Aplikasi berhasil ditambahkan ke layar utama.', 'success');
});

// ============================================
// 5. DOM READY INITIALIZATION
// ============================================

window.addEventListener('DOMContentLoaded', () => {
    initState();
    
    const versionDisplay = document.getElementById('versionDisplay');
    if (versionDisplay) versionDisplay.textContent = APP_VERSION;
    
    if (typeof initAuth === 'function') initAuth();
    
    setupLoginListeners();
    setupTPMListeners();
    setupParamPhotoListeners();
    simulateLoading();
    
    console.log(`${APP_NAME} v${APP_VERSION} initialized successfully`);
});
