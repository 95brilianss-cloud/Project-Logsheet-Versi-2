// ============================================
// UI UTILS MODULE - TURBINE LOGSHEET PRO
// ============================================

/**
 * Navigasi antar layar (Screen Management)
 */
function navigateTo(screenId) {
    const screens = document.querySelectorAll('.screen');
    const targetScreen = document.getElementById(screenId);

    if (!targetScreen) {
        console.error(`Screen ID ${screenId} tidak ditemukan.`);
        return;
    }

    // Update UI User di screen tertentu (seperti logsheet selection)
    if (screenId === 'logsheetSelectScreen' && typeof currentUser !== 'undefined' && currentUser) {
        const userEl = document.getElementById('logsheetSelectUser');
        if (userEl) userEl.textContent = currentUser.name || currentUser.username;
    }

    // Transisi layar
    screens.forEach(s => {
        s.classList.remove('active');
        s.style.opacity = '0';
    });

    targetScreen.classList.add('active');
    setTimeout(() => {
        targetScreen.style.opacity = '1';
    }, 50);

    // Auto-scroll ke atas setiap ganti layar
    window.scrollTo(0, 0);
}

/**
 * Sistem Alert Kustom (Pengganti window.alert)
 */
function showCustomAlert(message, type = 'info') {
    const alertEl = document.getElementById('customAlert');
    if (!alertEl) return;

    // Set warna berdasarkan tipe
    const colors = {
        success: 'var(--success)',
        error: 'var(--danger)',
        warning: 'var(--warning)',
        info: 'var(--primary)'
    };

    alertEl.textContent = message;
    alertEl.style.backgroundColor = colors[type] || colors.info;
    alertEl.classList.remove('hidden');
    alertEl.classList.add('show');

    // Sembunyikan otomatis setelah 3 detik
    setTimeout(() => {
        alertEl.classList.remove('show');
        setTimeout(() => alertEl.classList.add('hidden'), 300);
    }, 3000);
}

/**
 * Kompresi Gambar (Penting agar LocalStorage tidak penuh)
 * Mengubah file gambar menjadi Base64 yang lebih kecil
 */
function compressImage(file, options = { maxWidth: 800, quality: 0.7 }) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Hitung aspek rasio
                if (width > options.maxWidth) {
                    height = (options.maxWidth / width) * height;
                    width = options.maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Export ke base64
                resolve(canvas.toDataURL('image/jpeg', options.quality));
            };
        };
        reader.onerror = (error) => reject(error);
    });
}

/**
 * Manajemen Overlay Progres Unggah
 */
function showUploadProgress(title) {
    const overlay = document.getElementById('uploadProgressOverlay');
    if (!overlay) return { complete: () => {}, error: () => {} };

    overlay.innerHTML = `
        <div class="upload-card glass">
            <div class="spinner"></div>
            <h3>${title}</h3>
            <p>Jangan tutup aplikasi...</p>
        </div>
    `;
    overlay.classList.remove('hidden');

    return {
        complete: () => {
            overlay.innerHTML = `
                <div class="upload-card glass">
                    <div class="success-icon">✓</div>
                    <h3>Berhasil!</h3>
                </div>
            `;
            setTimeout(() => overlay.classList.add('hidden'), 1500);
        },
        error: () => {
            overlay.innerHTML = `
                <div class="upload-card glass">
                    <div class="error-icon">✕</div>
                    <h3>Gagal Terkirim</h3>
                    <button class="btn btn-primary" onclick="this.parentElement.parentElement.classList.add('hidden')">Tutup</button>
                </div>
            `;
        }
    };
}

/**
 * Helper untuk membersihkan JSONP script
 */
function cleanupJSONP(callbackName) {
    const scripts = document.querySelectorAll(`script[src*="callback=${callbackName}"]`);
    scripts.forEach(s => s.remove());
    delete window[callbackName];
}

/**
 * Indikator Status Koneksi/Sync (Titik hijau/merah di pojok)
 */
function updateStatusIndicator(isOnline) {
    const indicator = document.getElementById('connectionStatus');
    if (indicator) {
        indicator.style.backgroundColor = isOnline ? 'var(--success)' : 'var(--danger)';
        indicator.title = isOnline ? 'Tersambung ke Server' : 'Mode Offline';
    }
}

/**
 * Validasi Autentikasi sebelum akses fitur
 */
function requireAuth() {
    if (typeof isAuthenticated !== 'undefined' && !isAuthenticated) {
        showCustomAlert('Silakan login terlebih dahulu', 'warning');
        navigateTo('loginScreen');
        return false;
    }
    return true;
}
