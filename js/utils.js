/* ============================================
   TURBINE LOGSHEET PRO - FRONTEND UTILITIES
   FILE: js/utils.js (UI Helpers & Modifiers)
   ============================================ */

// ============================================
// 1. CUSTOM ALERTS & TOASTS
// ============================================

function showCustomAlert(message, type = 'info') {
    const alertBox = document.getElementById('customAlert');
    const alertTitle = document.getElementById('alertTitle');
    const alertMessage = document.getElementById('alertMessage');
    const iconWrapper = document.getElementById('alertIconWrapper');

    if (!alertBox || !alertMessage) {
        alert(message); // Fallback bawaan browser jika UI belum siap
        return;
    }

    alertMessage.textContent = message;
    
    // Ganti warna & icon berdasarkan tipe notifikasi
    if (type === 'success') {
        alertTitle.textContent = 'Berhasil';
        alertTitle.style.color = '#f8fafc';
        if (iconWrapper) {
            iconWrapper.innerHTML = `
                <svg viewBox="0 0 52 52" style="stroke: #10b981; stroke-width: 3; fill: none; width: 100%; height: 100%;">
                    <circle cx="26" cy="26" r="25"/>
                    <path d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                </svg>`;
        }
    } else if (type === 'error') {
        alertTitle.textContent = 'Gagal';
        alertTitle.style.color = '#ef4444';
        if (iconWrapper) {
            iconWrapper.innerHTML = `<div style="color: #ef4444; font-size: 40px; line-height: 1.2;">⚠️</div>`;
        }
    } else if (type === 'warning') {
        alertTitle.textContent = 'Perhatian';
        alertTitle.style.color = '#f59e0b';
        if (iconWrapper) {
            iconWrapper.innerHTML = `<div style="color: #f59e0b; font-size: 40px; line-height: 1.2;">⚠️</div>`;
        }
    } else {
        alertTitle.textContent = 'Informasi';
        alertTitle.style.color = '#3b82f6';
        if (iconWrapper) {
            iconWrapper.innerHTML = `<div style="color: #3b82f6; font-size: 40px; line-height: 1.2;">ℹ️</div>`;
        }
    }

    alertBox.classList.remove('hidden');
}

function closeAlert() {
    const alertBox = document.getElementById('customAlert');
    if (alertBox) alertBox.classList.add('hidden');
}

// Alias untuk showCustomAlert
function showToast(message, type) {
    showCustomAlert(message, type); 
}

// ============================================
// 2. UPLOAD PROGRESS OVERLAY (LOADING SCREEN)
// ============================================

function showUploadProgress(initialText = 'Mengirim...') {
    const overlay = document.getElementById('uploadProgressOverlay');
    const textEl = document.getElementById('uploadProgressText');
    const percentEl = document.getElementById('uploadProgressPercent');
    
    // Support dua kemungkinan ID dari versi HTML lama/baru
    const ringFill = document.getElementById('progressRingFill') || document.getElementById('uploadProgressRing');
    const cancelBtn = document.getElementById('cancelUploadBtn');
    
    if (overlay) overlay.classList.remove('hidden');
    if (textEl) textEl.textContent = initialText;
    if (percentEl) percentEl.textContent = '0%';
    if (ringFill) ringFill.style.strokeDashoffset = '339.292'; // Reset animasi ring
    if (cancelBtn) cancelBtn.style.display = 'block';

    // Reset status steps (1. Menyiapkan, 2. Mengirim, 3. Selesai)
    document.querySelectorAll('.step').forEach(el => {
        el.classList.remove('active');
        el.style.opacity = '0.4';
    });
    
    const step1 = document.getElementById('step1');
    if (step1) {
        step1.classList.add('active');
        step1.style.opacity = '1';
    }

    // Animasi Progress Bar Palsu (untuk UX visual agar tidak kaku saat nunggu respon Google)
    let fakeProgress = 0;
    const progressInterval = setInterval(() => {
        fakeProgress += Math.random() * 15;
        if (fakeProgress > 90) fakeProgress = 90; // Mentok di 90% sampai server benar-benar merespon
        
        if (percentEl) percentEl.textContent = Math.round(fakeProgress) + '%';
        if (ringFill) {
            const offset = 339.292 - (fakeProgress / 100) * 339.292;
            ringFill.style.strokeDashoffset = offset;
        }
    }, 500);

    // Kembalikan objek fungsi agar tpm.js dan logsheet.js bisa mengontrol animasi ini
    return {
        updateText: (text) => {
            if (textEl) textEl.textContent = text;
            const step2 = document.getElementById('step2');
            if (step2) {
                step2.classList.add('active');
                step2.style.opacity = '1';
            }
        },
        complete: () => {
            clearInterval(progressInterval);
            if (percentEl) percentEl.textContent = '100%';
            if (ringFill) ringFill.style.strokeDashoffset = '0';
            if (cancelBtn) cancelBtn.style.display = 'none';
            
            const step3 = document.getElementById('step3');
            if (step3) {
                step3.classList.add('active');
                step3.style.opacity = '1';
            }
            
            // Tutup overlay otomatis setelah 1 detik
            setTimeout(() => {
                if (overlay) overlay.classList.add('hidden');
            }, 1000);
        },
        error: () => {
            clearInterval(progressInterval);
            if (cancelBtn) cancelBtn.style.display = 'none';
            if (overlay) overlay.classList.add('hidden');
        }
    };
}

function cancelUpload() {
    // Fungsi untuk membatalkan proses fetch (request ke server)
    if (typeof currentUploadController !== 'undefined' && currentUploadController) {
        currentUploadController.abort();
        showCustomAlert('Proses pengiriman dibatalkan oleh operator.', 'warning');
    }
    const overlay = document.getElementById('uploadProgressOverlay');
    if (overlay) overlay.classList.add('hidden');
}

// ============================================
// 3. IMAGE COMPRESSION (CLIENT-SIDE)
// ============================================

function compressImage(dataUrl, options = {}) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const maxWidth = options.maxWidth || 1600;
            const maxHeight = options.maxHeight || 1600;
            let width = img.width;
            let height = img.height;

            // Hitung rasio aspek baru
            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height *= maxWidth / width));
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width *= maxHeight / height));
                    height = maxHeight;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const quality = options.quality || 0.8; // Kualitas standar 80%
            const type = options.type || 'image/jpeg';
            const compressedDataUrl = canvas.toDataURL(type, quality);

            // Hitung persentase reduksi ukuran file
            const originalSize = Math.round((dataUrl.length * 3) / 4 / 1024);
            const compressedSize = Math.round((compressedDataUrl.length * 3) / 4 / 1024);
            const reduction = Math.round(((originalSize - compressedSize) / originalSize) * 100);

            resolve({
                dataUrl: compressedDataUrl,
                originalSize,
                compressedSize,
                reduction
            });
        };
        img.onerror = reject;
        img.src = dataUrl;
    });
}

// ============================================
// 4. JSONP CLEANUP HELPER
// ============================================

function cleanupJSONP(callbackName) {
    if (window[callbackName]) {
        delete window[callbackName];
    }
    // Hapus tag <script> sisa request agar DOM tidak kotor
    const scripts = document.querySelectorAll(`script[src*="${callbackName}"]`);
    scripts.forEach(script => script.remove());
}
// ============================================
// 5. MENU NAVIGATION HELPERS
// ============================================

/**
 * Membuka atau menutup popup menu utama
 */
function toggleBranchMenuPopup() {
    const overlay = document.getElementById('branchMenuPopupOverlay');
    if (overlay) {
        overlay.classList.toggle('hidden');
    }
}

/**
 * Menutup popup menu utama
 */
function closeBranchMenuPopup() {
    const overlay = document.getElementById('branchMenuPopupOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}
