// ============================================
// TPM MODULE - TURBINE LOGSHEET PRO
// ============================================

let tpmTasks = [];
let tpmDraft = {};

/**
 * Inisialisasi Layar TPM
 */
function initTPMScreen() {
    if (!requireAuth()) return;
    
    // Ambil data draft TPM dari localStorage
    const savedDraft = localStorage.getItem(DRAFT_KEYS.TPM_OFFLINE);
    tpmDraft = savedDraft ? JSON.parse(savedDraft) : {};
    
    navigateTo('tpmScreen');
    renderTPMSections();
}

/**
 * Merender Daftar Seksi TPM (Clean, Check, Tighten, Lub)
 */
function renderTPMSections() {
    const container = document.getElementById('tpmContainer');
    if (!container) return;

    // Struktur Tugas TPM (Bisa dipindahkan ke config.js jika ingin lebih dinamis)
    const sections = {
        "CLEANING": ["Body Turbine", "Baseplate", "Panel Control", "Lube Oil Console"],
        "CHECKING": ["Level Oil", "Leakage", "Vibration Local", "Pressure Gauge"],
        "LUBRICATING": ["Bearing Grease", "Linkage Governor"]
    };

    let html = '';
    Object.entries(sections).forEach(([sectionName, tasks]) => {
        const completedCount = tasks.filter(t => tpmDraft[t]?.status === 'done').length;
        
        html += `
            <div class="tpm-section-card glass">
                <div class="tpm-section-header">
                    <h3>${sectionName}</h3>
                    <span class="badge">${completedCount}/${tasks.length}</span>
                </div>
                <div class="tpm-task-list">
                    ${tasks.map(task => renderTaskItem(task)).join('')}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

/**
 * Merender Item Tugas Individu
 */
function renderTaskItem(taskName) {
    const data = tpmDraft[taskName] || { status: 'pending', photo: null };
    const isDone = data.status === 'done';

    return `
        <div class="tpm-task-item ${isDone ? 'completed' : ''}">
            <div class="task-info">
                <span class="task-name">${taskName}</span>
                ${data.photo ? '<span class="photo-tag">📸 Foto OK</span>' : ''}
            </div>
            <div class="task-actions">
                <button class="btn-icon btn-camera" onclick="openTPMCamera('${taskName}')">
                    ${data.photo ? '🔄' : '📷'}
                </button>
                <input type="checkbox" ${isDone ? 'checked' : ''} 
                       onchange="toggleTPMTask('${taskName}', this.checked)">
            </div>
        </div>
    `;
}

/**
 * Mengubah Status Tugas TPM
 */
function toggleTPMTask(taskName, isChecked) {
    if (!tpmDraft[taskName]) tpmDraft[taskName] = {};
    
    tpmDraft[taskName].status = isChecked ? 'done' : 'pending';
    saveTPMDraft();
    renderTPMSections();
}

/**
 * Manajemen Kamera & Kompresi Foto TPM
 */
function openTPMCamera(taskName) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Langsung buka kamera belakang di HP

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const progress = showUploadProgress('Memproses Foto TPM...');
        try {
            // Gunakan helper dari ui-utils.js untuk kompresi
            const compressedBase64 = await compressImage(file, { maxWidth: 800, quality: 0.7 });
            
            if (!tpmDraft[taskName]) tpmDraft[taskName] = {};
            tpmDraft[taskName].photo = compressedBase64;
            tpmDraft[taskName].status = 'done'; // Foto otomatis menandai tugas selesai
            
            saveTPMDraft();
            progress.complete();
            renderTPMSections();
            showCustomAlert('Foto berhasil disimpan ke draft', 'success');
        } catch (err) {
            progress.error();
            showCustomAlert('Gagal memproses foto', 'error');
        }
    };

    input.click();
}

/**
 * Simpan Draft ke LocalStorage
 */
function saveTPMDraft() {
    localStorage.setItem(DRAFT_KEYS.TPM_OFFLINE, JSON.stringify(tpmDraft));
}

/**
 * Kirim Data TPM ke Server
 */
async function sendTPMToSheet() {
    const tasks = Object.keys(tpmDraft);
    if (tasks.length === 0) {
        showCustomAlert('Belum ada tugas yang dikerjakan', 'warning');
        return;
    }

    const progress = showUploadProgress('Mengirim Laporan TPM...');
    
    const payload = {
        type: 'TPM_REPORT',
        operator: currentUser.name,
        unit: 'Utility 3B',
        timestamp: new Date().toISOString(),
        data: tpmDraft
    };

    try {
        await fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(payload)
        });

        progress.complete();
        showCustomAlert('✓ Laporan TPM Berhasil Terkirim!', 'success');
        
        // Bersihkan draft
        tpmDraft = {};
        localStorage.removeItem(DRAFT_KEYS.TPM_OFFLINE);
        
        setTimeout(() => navigateTo('homeScreen'), 1500);
    } catch (error) {
        progress.error();
        // Simpan ke antrean offline jika gagal kirim
        let queue = JSON.parse(localStorage.getItem(DRAFT_KEYS.TPM_HISTORY) || '[]');
        queue.push(payload);
        localStorage.setItem(DRAFT_KEYS.TPM_HISTORY, JSON.stringify(queue));
        
        showCustomAlert('Koneksi tidak stabil. Data TPM disimpan offline.', 'warning');
    }
}
