// ============================================
// COOLING TOWER MODULE - TURBINE LOGSHEET PRO
// ============================================

/**
 * Mengambil data terakhir operasional Cooling Tower dari server
 */
function fetchLastDataCT() {
    updateStatusIndicator(false); // Indikator loading dimulai
    const timeout = setTimeout(() => renderCTMenu(), 8000);
    const callbackName = 'jsonp_ct_' + Date.now();
    
    window[callbackName] = (data) => {
        clearTimeout(timeout);
        lastDataCT = data; // Data referensi CT disimpan
        updateStatusIndicator(true);
        cleanupJSONP(callbackName);
        renderCTMenu();
    };
    
    const script = document.createElement('script');
    script.src = `${GAS_URL}?action=getLastCT&callback=${callbackName}`;
    script.onerror = () => {
        clearTimeout(timeout);
        cleanupJSONP(callbackName);
        renderCTMenu();
    };
    document.body.appendChild(script);
}

/**
 * Merender daftar area Cooling Tower (Basin SA & SU)
 */
function renderCTMenu() {
    const list = document.getElementById('ctAreaList');
    if (!list) return;
    
    const totalAreas = Object.keys(AREAS_CT).length;
    let completedAreas = 0;
    let html = '';
    
    Object.entries(AREAS_CT).forEach(([areaName, params]) => {
        const areaData = currentInputCT[areaName] || {};
        const filled = Object.keys(areaData).length;
        const total = params.length;
        const percent = Math.round((filled / total) * 100);
        const isCompleted = filled === total && total > 0;
        
        // Identifikasi parameter abnormal khusus CT (MAINTENANCE/ERROR)
        const hasAbnormal = params.some(paramName => {
            const val = areaData[paramName] || '';
            const firstLine = val.split('\n')[0];
            return ['ERROR', 'MAINTENANCE', 'NOT_INSTALLED'].includes(firstLine);
        });
        
        if (isCompleted) completedAreas++;
        
        const circumference = 2 * Math.PI * 18;
        const strokeDashoffset = circumference - (percent / 100) * circumference;
        
        html += `
            <div class="area-item ${isCompleted ? 'completed' : ''} ${hasAbnormal ? 'has-warning' : ''}" onclick="openCTArea('${areaName}')">
                <div class="area-progress-ring">
                    <svg width="40" height="40" viewBox="0 0 40 40">
                        <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="3"/>
                        <circle cx="20" cy="20" r="18" fill="none" stroke="${isCompleted ? '#10b981' : '#06b6d4'}" 
                                stroke-width="3" stroke-linecap="round" stroke-dasharray="${circumference}" 
                                stroke-dashoffset="${strokeDashoffset}" transform="rotate(-90 20 20)"/>
                        <text x="20" y="24" text-anchor="middle" font-size="10" font-weight="bold" fill="${isCompleted ? '#10b981' : '#f8fafc'}">${filled}</text>
                    </svg>
                </div>
                <div class="area-info">
                    <div class="area-name">${areaName}</div>
                    <div class="area-meta ${hasAbnormal ? 'warning' : ''}">
                        ${hasAbnormal ? '🔧 Maintenance/Issue • ' : ''}${filled}/${total} Parameter
                    </div>
                </div>
                <div class="area-status">${isCompleted ? '✓' : '❯'}</div>
            </div>`;
    });
    
    list.innerHTML = html;
    
    // Tampilkan tombol submit jika sudah ada data yang diisi
    const submitBtn = document.getElementById('ctSubmitBtn');
    if (submitBtn) submitBtn.style.display = Object.keys(currentInputCT).length > 0 ? 'flex' : 'none';
    
    updateCTOverallProgressUI(completedAreas, totalAreas);
}

/**
 * Inisialisasi input parameter untuk area CT yang dipilih
 */
function openCTArea(areaName) {
    if (!requireAuth()) return;
    
    activeAreaCT = areaName;
    activeIdxCT = 0;
    
    loadCTParamPhotosFromDraft(); // Ambil draft foto CT
    navigateTo('ctParamScreen');
    
    const el = document.getElementById('ctCurrentAreaName');
    if (el) el.textContent = areaName;
    
    showCTStep();
}

/**
 * Menampilkan UI input untuk parameter CT aktif
 */
function showCTStep() {
    const params = AREAS_CT[activeAreaCT];
    const fullLabel = params[activeIdxCT];
    const total = params.length;
    
    // Sinkronisasi info step
    document.getElementById('ctStepInfo').textContent = `Step ${activeIdxCT + 1}/${total}`;
    document.getElementById('ctAreaProgress').textContent = `${activeIdxCT + 1}/${total}`;
    document.getElementById('ctLabelInput').textContent = fullLabel.split(' (')[0];
    document.getElementById('ctUnitDisplay').textContent = fullLabel.match(/\(([^)]+)\)/)?.[1] || '--';
    
    // Load referensi dan draft
    const lastVal = lastDataCT[fullLabel] || '--';
    document.getElementById('ctPrevValDisplay').textContent = lastVal;
    
    const inputField = document.getElementById('ctValInput');
    const savedVal = currentInputCT[activeAreaCT]?.[fullLabel] || '';
    inputField.value = savedVal.split('\n')[0];
    
    loadCTAbnormalStatus(fullLabel); // Cek status error/maintenance
    renderCTProgressDots();
    loadCTParamPhotoForCurrentStep(); // Tampilkan preview foto CT
    
    inputField.focus();
}

/**
 * Menyimpan step CT aktif ke draft lokal
 */
function saveCTStep() {
    const fullLabel = AREAS_CT[activeAreaCT][activeIdxCT];
    const val = document.getElementById('ctValInput').value.trim();
    const status = document.querySelector('input[name="ctParamStatus"]:checked')?.value;
    const note = document.getElementById('ctStatusNote')?.value.trim();
    
    if (!currentInputCT[activeAreaCT]) currentInputCT[activeAreaCT] = {};
    
    let finalValue = val;
    if (status) {
        finalValue = status + (note ? `\n${note}` : '');
    }
    
    if (finalValue) {
        currentInputCT[activeAreaCT][fullLabel] = finalValue;
    } else {
        delete currentInputCT[activeAreaCT][fullLabel];
    }
    
    localStorage.setItem(DRAFT_KEYS_CT.LOGSHEET, JSON.stringify(currentInputCT));
    
    // Navigasi ke parameter berikutnya atau kembali ke list
    if (activeIdxCT < AREAS_CT[activeAreaCT].length - 1) {
        activeIdxCT++;
        showCTStep();
    } else {
        showCustomAlert(`Data ${activeAreaCT} Tersimpan!`, 'success');
        setTimeout(() => navigateTo('ctAreaListScreen'), 1500);
    }
}

/**
 * Mengirim data Cooling Tower ke server Google Sheets
 */
async function sendCTToSheet() {
    if (!requireAuth()) return;
    
    const progress = showUploadProgress('Mengirim Logsheet CT...');
    const allParams = {};
    
    Object.values(currentInputCT).forEach(area => {
        Object.assign(allParams, area);
    });
    
    const payload = {
        type: 'LOGSHEET_CT',
        operator: currentUser.name,
        timestamp: new Date().toISOString(),
        data: allParams,
        photos: ctParamPhotos[activeAreaCT] || {}
    };
    
    try {
        await fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(payload)
        });
        
        progress.complete();
        showCustomAlert('✓ Logsheet CT Berhasil Terkirim!', 'success');
        
        // Reset draft setelah sukses
        currentInputCT = {};
        localStorage.removeItem(DRAFT_KEYS_CT.LOGSHEET);
        localStorage.removeItem(PHOTO_DRAFT_KEYS.CT);
        
        setTimeout(() => navigateTo('homeScreen'), 1500);
    } catch (error) {
        progress.error();
        showCustomAlert('Koneksi Gagal. Data CT disimpan offline.', 'error');
    }
}
