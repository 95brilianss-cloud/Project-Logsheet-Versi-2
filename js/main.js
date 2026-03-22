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
    
    // Set today's date
    const today = new Date();
    if (jobDateEl) {
        jobDateEl.textContent = today.toLocaleDateString('id-ID', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
    }
    
    // Show loading state
    if (jobListContainer) {
        jobListContainer.innerHTML = `
            <div class="job-loading">
                <div class="spinner"></div>
                <span>Memuat data...</span>
            </div>
        `;
    }
    
    // Fetch jobs from spreadsheet
    fetchJobsFromSheet();
}

async function fetchJobsFromSheet() {
    try {
        const response = await fetch(`${JOB_SHEET_URL}?action=getJobs&date=today`, {
            method: 'GET',
            mode: 'cors'
        });
        
        if (!response.ok) throw new Error('Network error');
        
        const data = await response.json();
        
        if (data.success && data.jobs && data.jobs.length > 0) {
            renderJobList(data.jobs);
        } else {
            renderEmptyJobList();
        }
    } catch (error) {
        console.log('Error fetching jobs:', error);
        // Fallback: show sample jobs or empty state
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
    
    // Sample jobs for demo (will be replaced with actual data)
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
// 3. UI & EVENT LISTENERS SETUP
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

function loadUserStats() {
    const totalAreas = Object.keys(AREAS).length;
    let completedAreas = 0;
    
    Object.entries(AREAS).forEach(([areaName, params]) => {
        const filled = currentInput[areaName] ? Object.keys(currentInput[areaName]).length : 0;
        if (filled === params.length && filled > 0) completedAreas++;
    });
    
    const statProgress = document.getElementById('statProgress');
    const statAreas = document.getElementById('statAreas');
    
    if (statProgress) {
        const percent = Math.round((completedAreas / totalAreas) * 100);
        statProgress.textContent = `${percent}%`;
    }
    
    if (statAreas) {
        statAreas.textContent = `${completedAreas}/${totalAreas}`;
    }
}

// ============================================
// 4. PWA INSTALL HANDLER
// ============================================

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Tampilkan tombol install di header
    const installBtn = document.getElementById('installPwaBtn');
    if (installBtn) installBtn.classList.remove('hidden');
    
    if (!isAppInstalled() && !installBannerShown) {
        setTimeout(() => showCustomInstallBanner(), 3000);
    }
});

window.addEventListener('appinstalled', () => {
    hideCustomInstallBanner();
    deferredPrompt = null;
    installBannerShown = true;
    
    // Sembunyikan tombol install di header
    const installBtn = document.getElementById('installPwaBtn');
    if (installBtn) installBtn.classList.add('hidden');
    
    showToast('✓ Aplikasi berhasil diinstall!', 'success');
});

function showCustomInstallBanner() {
    const popup = document.getElementById('pwaInstallPopup');
    if (!popup) return;
    
    popup.classList.remove('hidden');
    installBannerShown = true;
}

function hideCustomInstallBanner() {
    const popup = document.getElementById('pwaInstallPopup');
    if (popup) {
        popup.classList.add('hidden');
    }
}

function dismissPWAInstall() {
    hideCustomInstallBanner();
}

async function installPWA() {
    if (!deferredPrompt) {
        showToast('Aplikasi sudah terinstall atau browser tidak mendukung', 'info');
        return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
        hideCustomInstallBanner();
        showToast('✓ Menginstall aplikasi...', 'success');
    } else {
        hideCustomInstallBanner();
    }
    
    deferredPrompt = null;
}

function isAppInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches || 
           window.navigator.standalone === true ||
           document.referrer.includes('android-app://');
}

// ============================================
// 5. KEYBOARD SHORTCUTS
// ============================================

document.addEventListener('keydown', (e) => {
    const paramScreen = document.getElementById('paramScreen');
    const ctParamScreen = document.getElementById('ctParamScreen');
    
    if (paramScreen && paramScreen.classList.contains('active')) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (currentInputType !== 'select' && typeof saveStep === 'function') saveStep();
        } else if (e.key === 'Escape') {
            if (typeof goBack === 'function') goBack();
        }
    }
    
    if (ctParamScreen && ctParamScreen.classList.contains('active')) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (currentInputTypeCT !== 'select' && typeof saveCTStep === 'function') saveCTStep();
        } else if (e.key === 'Escape') {
            if (typeof goBackCT === 'function') goBackCT();
        }
    }
});

// ============================================
// 6. DOM READY INITIALIZATION
// ============================================

window.addEventListener('DOMContentLoaded', () => {
    // 1. Inisiasi State (Local Storage & Variables)
    initState();
    
    // 2. Set Versi UI
    const versionDisplay = document.getElementById('versionDisplay');
    if (versionDisplay) versionDisplay.textContent = APP_VERSION;
    
    // 3. Cek Sesi Auth
    if (typeof initAuth === 'function') initAuth();
    
    // 4. Setup Event Listeners
    setupLoginListeners();
    setupTPMListeners();
    setupParamPhotoListeners();
    
    // 5. Hilangkan Loading Screen
    simulateLoading();
    
    console.log(`${APP_NAME} v${APP_VERSION} initialized successfully`);
});
