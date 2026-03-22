/* ============================================
   TURBINE LOGSHEET PRO - UTILITIES & HELPERS
   ============================================ */

// ============================================
// 1. CUSTOM ALERTS & TOASTS
// ============================================

function showCustomAlert(msg, type = 'success') {
    const customAlert = document.getElementById('customAlert');
    const alertContent = document.getElementById('alertContent');
    const alertTitle = document.getElementById('alertTitle');
    const alertMessage = document.getElementById('alertMessage');
    const alertIconWrapper = document.getElementById('alertIconWrapper');
    
    if (!customAlert || !alertContent || !alertTitle || !alertMessage || !alertIconWrapper) {
        console.error('Alert elements not found');
        alert(msg);
        return;
    }
    
    // Clear existing timer if any
    if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
        autoCloseTimer = null;
    }
    
    const titleMap = {
        'success': 'Berhasil',
        'error': 'Error',
        'warning': 'Peringatan',
        'info': 'Informasi'
    };
    
    alertTitle.textContent = titleMap[type] || 'Informasi';
    alertMessage.innerText = msg;
    alertContent.className = 'alert-content ' + type;
    
    // Set icon berdasarkan tipe
    const icons = {
        success: `<div class="alert-icon-bg"></div><svg class="alert-icon-svg" viewBox="0 0 52 52"><circle cx="26" cy="26" r="25"/><path d="M14.1 27.2l7.1 7.2 16.7-16.8"/></svg>`,
        error: `<div class="alert-icon-bg" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"></div><svg class="alert-icon-svg" viewBox="0 0 52 52" style="stroke: #ef4444"><circle cx="26" cy="26" r="25"/><path d="M16 16 L36 36 M36 16 L16 36"/></svg>`,
        warning: `<div class="alert-icon-bg" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"></div><svg class="alert-icon-svg" viewBox="0 0 52 52" style="stroke: #f59e0b"><circle cx="26" cy="26" r="25"/><path d="M26 10 L26 30 M26 34 L26 38"/></svg>`,
        info: `<div class="alert-icon-bg" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"></div><svg class="alert-icon-svg" viewBox="0 0 52 52" style="stroke: #3b82f6"><circle cx="26" cy="26" r="25"/><path d="M26 10 L26 30 M26 34 L26 36"/></svg>`
    };
    
    alertIconWrapper.innerHTML = icons[type] || icons.info;
    customAlert.classList.remove('hidden');
    
    // Auto close untuk sukses dan info
    if (type === 'success' || type === 'info') {
        autoCloseTimer = setTimeout(() => {
            if (!customAlert.classList.contains('hidden')) closeAlert();
        }, 3000);
    }
}

function closeAlert() {
    const customAlert = document.getElementById('customAlert');
    if (customAlert) customAlert.classList.add('hidden');
    if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
        autoCloseTimer = null;
    }
}

function showToast(msg, type = 'info') {
    // Digunakan secara umum untuk PWA & System Logging
    console.log(`[${type.toUpperCase()}] ${msg}`);
}

// ============================================
// 2. SCREEN NAVIGATION (ROUTER)
// ============================================

function navigateTo(screenId) {
    // Daftar screen yang wajib login
    const protectedScreens = [
        'homeScreen', 'areaListScreen', 'paramScreen', 
        'tpmScreen', 'tpmInputScreen', 'balancingScreen', 
        'ctAreaListScreen', 'ctParamScreen'
    ];
    
    // Pengecekan sesi (fungsi requireAuth ada di auth.js)
    if (protectedScreens.includes(screenId) && typeof requireAuth === 'function' && !requireAuth()) {
        return;
    }
    
    // Sembunyikan semua screen
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    
    // Tampilkan screen target
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        window.scrollTo(0, 0);
        
        // Trigger Inisialisasi Spesifik Layar (Fungsi-fungsinya ada di modul lain)
        if (screenId === 'homeScreen') {
            if(typeof loadUserStats === 'function') loadUserStats();
            if(typeof loadTodayJobs === 'function') loadTodayJobs(); 
            setTimeout(() => {
                if(typeof updateAdminBranchVisibility === 'function') updateAdminBranchVisibility();           
            }, 100);
        } else if (screenId === 'areaListScreen') {
            if(typeof fetchLastData === 'function') fetchLastData();
            if(typeof updateOverallProgress === 'function') updateOverallProgress();
        } else if (screenId === 'balancingScreen') {
            if(typeof initBalancingScreen === 'function') initBalancingScreen();
        } else if (screenId === 'ctAreaListScreen') {
            if(typeof fetchLastDataCT === 'function') fetchLastDataCT();
            if(typeof updateCTOverallProgress === 'function') updateCTOverallProgress();
        }
    }
}

// ============================================
// 3. IMAGE COMPRESSION UTILITY
// ============================================

async function compressImage(base64Image, options = {}) {
    const {
        maxWidth = 1920,
        maxHeight = 1920,
        quality = 0.8,
        type = 'image/jpeg'
    } = options;

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            let width = img.width;
            let height = img.height;
            
            // Kalkulasi rasio aspek
            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }

            // Gambar ke canvas dengan ukuran baru
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            
            // Konversi kembali ke Base64
            const compressedBase64 = canvas.toDataURL(type, quality);
            const originalSize = Math.round((base64Image.length * 3) / 4 / 1024);
            const compressedSize = Math.round((compressedBase64.length * 3) / 4 / 1024);
            const reduction = Math.round(((originalSize - compressedSize) / originalSize) * 100);
            
            console.log(`[COMPRESSION] ${originalSize}KB → ${compressedSize}KB (-${reduction}%)`);
            
            resolve({
                dataUrl: compressedBase64,
                originalSize,
                compressedSize,
                reduction,
                width,
                height
            });
        };
        img.onerror = reject;
        img.src = base64Image;
    });
}

// ============================================
// 4. BRANCH MENU POPUP (GLOBAL UI)
// ============================================

function toggleBranchMenuPopup() {
    const overlay = document.getElementById('branchMenuPopupOverlay');
    
    if (overlay && overlay.classList.contains('hidden')) {
        // Show popup
        overlay.classList.remove('hidden');
        updateAdminBranchVisibility();
    } else {
        closeBranchMenuPopup();
    }
}

function closeBranchMenuPopup() {
    const overlay = document.getElementById('branchMenuPopupOverlay');
    if (overlay) overlay.classList.add('hidden');
}

function updateAdminBranchVisibility() {
    const adminBranchItem = document.getElementById('adminBranchItem');
    // isAdmin() akan dideklarasikan di auth.js
    if (adminBranchItem && typeof isAdmin === 'function') {
        adminBranchItem.style.display = isAdmin() ? 'flex' : 'none';
    }
}

// ============================================
// 5. SYSTEM UPDATES & CLEANUP
// ============================================

function showUpdateAlert() {
    const updateAlert = document.getElementById('updateAlert');
    if (updateAlert) updateAlert.classList.remove('hidden');
}

function applyUpdate() {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
}

/**
 * Helper untuk cleanup JSONP callback dan script tags 
 * (menghindari memory leak saat fetching data dari Google Apps Script)
 */
function cleanupJSONP(callbackName) {
    // Hapus global callback
    if (window[callbackName]) {
        try {
            delete window[callbackName];
        } catch (e) {
            window[callbackName] = undefined;
        }
    }
    
    // Hapus script tag yang terkait
    const scripts = document.querySelectorAll('script');
    scripts.forEach(script => {
        if (script.src && script.src.includes('callback=' + callbackName)) {
            if (script.parentNode) script.remove();
        }
    });
}
