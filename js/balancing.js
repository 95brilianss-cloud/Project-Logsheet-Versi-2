// ============================================
// BALANCING MODULE - TURBINE LOGSHEET PRO
// ============================================

let balancingDraft = {};

/**
 * Inisialisasi Form Balancing
 */
function initBalancing() {
    if (!requireAuth()) return;
    
    // Load draft jika ada
    const saved = localStorage.getItem(DRAFT_KEYS.BALANCING);
    balancingDraft = saved ? JSON.parse(saved) : {};
    
    navigateTo('balancingScreen');
    renderBalancingForm();
    
    // Set waktu otomatis jika draft kosong
    if (!balancingDraft.balancingDate) {
        const now = new Date();
        document.getElementById('balancingDate').value = now.toISOString().split('T')[0];
        document.getElementById('balancingTime').value = now.getHours().toString().padStart(2, '0') + ':00';
    }
}

/**
 * Merender Form Input berdasarkan BALANCING_FIELDS di config.js
 */
function renderBalancingForm() {
    const container = document.getElementById('balancingFormContainer');
    if (!container) return;

    // Load values ke elemen input yang sudah ada di HTML
    BALANCING_FIELDS.forEach(field => {
        const el = document.getElementById(field);
        if (el) {
            el.value = balancingDraft[field] || '';
            // Tambahkan event listener untuk auto-save & auto-calculate
            el.addEventListener('input', () => {
                balancingDraft[field] = el.value;
                saveBalancingDraft();
                calculateBalancingAuto();
            });
        }
    });
}

/**
 * Logika Perhitungan Otomatis (Total & Selisih)
 */
function calculateBalancingAuto() {
    // Contoh Perhitungan Total 3B MW
    const loadMW = parseFloat(document.getElementById('loadMW').value) || 0;
    const tg65 = parseFloat(document.getElementById('tg65MW').value) || 0;
    const tg66 = parseFloat(document.getElementById('tg66MW').value) || 0;
    
    const total3B = loadMW + tg65 + tg66;
    const total3BEl = document.getElementById('total3BMW');
    if (total3BEl) {
        total3BEl.value = total3B.toFixed(2);
        balancingDraft['total3BMW'] = total3BEl.value;
    }

    // Perhitungan Steam Balance (Simplifikasi)
    const stgSteam = parseFloat(document.getElementById('stgSteam').value) || 0;
    const pa2Steam = parseFloat(document.getElementById('pa2Steam').value) || 0;
    const totalSteamOut = stgSteam + pa2Steam;
    
    // Anda bisa menambahkan logika pewarnaan jika angka tidak balance
    const indicator = document.getElementById('balanceIndicator');
    if (indicator) {
        if (Math.abs(total3B - loadMW) > 5) { // Contoh ambang batas
            indicator.className = 'status-badge warning';
            indicator.textContent = 'Unbalanced';
        } else {
            indicator.className = 'status-badge success';
            indicator.textContent = 'Balanced';
        }
    }
}

/**
 * Simpan Draft ke LocalStorage
 */
function saveBalancingDraft() {
    localStorage.setItem(DRAFT_KEYS.BALANCING, JSON.stringify(balancingDraft));
}

/**
 * Kirim Data Balancing ke Server
 */
async function sendBalancingToSheet() {
    if (!requireAuth()) return;

    // Validasi sederhana
    if (!balancingDraft.loadMW || !balancingDraft.balancingDate) {
        showCustomAlert('Data Load MW dan Tanggal wajib diisi!', 'error');
        return;
    }

    const progress = showUploadProgress('Mengirim Data Balancing...');
    
    const payload = {
        type: 'BALANCING_DATA',
        operator: currentUser.name,
        timestamp: new Date().toISOString(),
        data: balancingDraft
    };

    try {
        // Gunakan metode POST via fetch (cors/no-cors tergantung setup GAS)
        await fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(payload)
        });

        progress.complete();
        showCustomAlert('✓ Data Balancing Berhasil Terkirim!', 'success');
        
        // Bersihkan draft
        balancingDraft = {};
        localStorage.removeItem(DRAFT_KEYS.BALANCING);
        
        setTimeout(() => navigateTo('homeScreen'), 1500);
    } catch (error) {
        progress.error();
        console.error('Error sending balancing:', error);
        
        // Simpan ke antrean offline jika gagal
        saveToOfflineQueue(payload);
        showCustomAlert('Koneksi Gagal. Data disimpan di memori offline.', 'warning');
    }
}

/**
 * Simpan data ke antrean offline (untuk disinkronkan nanti)
 */
function saveToOfflineQueue(payload) {
    let queue = JSON.parse(localStorage.getItem(DRAFT_KEYS.BALANCING_OFFLINE) || '[]');
    queue.push(payload);
    localStorage.setItem(DRAFT_KEYS.BALANCING_OFFLINE, JSON.stringify(queue));
}

/**
 * Reset Form
 */
function resetBalancingForm() {
    if (confirm('Bersihkan semua data input balancing?')) {
        balancingDraft = {};
        localStorage.removeItem(DRAFT_KEYS.BALANCING);
        renderBalancingForm();
        showCustomAlert('Form telah direset', 'info');
    }
}
