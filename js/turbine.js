// ============================================
// TURBINE MODULE - TURBINE LOGSHEET PRO
// ============================================

/**
 * Mengambil data terakhir dari server untuk referensi operator
 */
function fetchLastData() {
    updateStatusIndicator(false);
    const timeout = setTimeout(() => renderMenu(), 8000);
    const callbackName = 'jsonp_' + Date.now();
    
    window[callbackName] = (data) => {
        clearTimeout(timeout);
        lastData = data;
        updateStatusIndicator(true);
        cleanupJSONP(callbackName);
        renderMenu();
    };
    
    const script = document.createElement('script');
    script.src = `${GAS_URL}?action=getLastTurbine&callback=${callbackName}`;
    script.onerror = () => {
        clearTimeout(timeout);
        cleanupJSONP(callbackName);
        renderMenu();
    };
    document.body.appendChild(script);
}

/**
 * Merender daftar area turbin pada home logsheet
 */
function renderMenu() {
    const list = document.getElementById('areaList');
    if (!list) return;
    
    const totalAreas = Object.keys(AREAS).length;
    let completedAreas = 0;
    let html = '';
    
    Object.entries(AREAS).forEach(([areaName, params]) => {
        const areaData = currentInput[areaName] || {};
        const filled = Object.keys(areaData).length;
        const total = params.length;
        const percent = Math.round((filled / total) * 100);
        const isCompleted = filled === total && total > 0;
        
        // Cek jika ada status abnormal (ERROR/UPPER/NOT_INSTALLED)
        const hasAbnormal = params.some(paramName => {
            const val = areaData[paramName] || '';
            const firstLine = val.split('\n')[0];
            return ['ERROR', 'UPPER', 'NOT_INSTALLED'].includes(firstLine);
        });
        
        if (isCompleted) completedAreas++;
        
        const circumference = 2 * Math.PI * 18;
        const strokeDashoffset = circumference - (percent / 100) * circumference;
        
        html += `
            <div class="area-item ${isCompleted ? 'completed' : ''} ${hasAbnormal ? 'has-warning' : ''}" onclick="openArea('${areaName}')">
                <div class="area-progress-ring">
                    <svg width="40" height="40" viewBox="0 0 40 40">
                        <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="3"/>
                        <circle cx="20" cy="20" r="18" fill="none" stroke="${isCompleted ? '#10b981' : 'var(--primary)'}" 
                                stroke-width="3" stroke-linecap="round" stroke-dasharray="${circumference}" 
                                stroke-dashoffset="${strokeDashoffset}" transform="rotate(-90 20 20)"/>
                        <text x="20" y="24" text-anchor="middle" font-size="10" font-weight="bold" fill="${isCompleted ? '#10b981' : '#f8fafc'}">${filled}</text>
                    </svg>
                </div>
                <div class="area-info">
                    <div class="area-name">${areaName}</div>
                    <div class="area-meta ${hasAbnormal ? 'warning' : ''}">
                        ${hasAbnormal ? '⚠️ Masalah Terdeteksi • ' : ''}${filled}/${total} Parameter
                    </div>
                </div>
                <div class="area-status">${isCompleted ? '✓' : '❯'}</div>
            </div>`;
    });
    
    list.innerHTML = html;
    updateOverallProgressUI(completedAreas, totalAreas);
}

/**
 * Membuka area spesifik dan memulai input per parameter
 */
function openArea(areaName) {
    if (!requireAuth()) return;
    
    activeArea = areaName;
    activeIdx = 0;
    
    loadParamPhotosFromDraft(); // Load draft foto
    navigateTo('paramScreen');
    
    const el = document.getElementById('currentAreaName');
    if (el) el.textContent = areaName;
    
    showStep();
}

/**
 * Menampilkan form input untuk parameter aktif
 */
function showStep() {
    const params = AREAS[activeArea];
    const fullLabel = params[activeIdx];
    const total = params.length;
    
    // Update Header UI
    document.getElementById('stepInfo').textContent = `Step ${activeIdx + 1}/${total}`;
    document.getElementById('areaProgress').textContent = `${activeIdx + 1}/${total}`;
    document.getElementById('labelInput').textContent = fullLabel.split(' (')[0];
    document.getElementById('unitDisplay').textContent = fullLabel.match(/\(([^)]+)\)/)?.[1] || '--';
    
    // Load Nilai Terakhir & Draft
    const lastVal = lastData[fullLabel] || '--';
    document.getElementById('prevValDisplay').textContent = lastVal;
    
    const inputField = document.getElementById('valInput');
    const savedVal = currentInput[activeArea]?.[fullLabel] || '';
    inputField.value = savedVal.split('\n')[0]; // Ambil nilai numerik saja jika ada catatan
    
    loadAbnormalStatus(fullLabel);
    renderProgressDots();
    loadParamPhotoForCurrentStep(); // Tampilkan foto jika ada
    
    inputField.focus();
}

/**
 * Menyimpan data parameter ke draft lokal
 */
function saveCurrentStep() {
    const fullLabel = AREAS[activeArea][activeIdx];
    const val = document.getElementById('valInput').value.trim();
    const status = document.querySelector('input[name="paramStatus"]:checked')?.value;
    const note = document.getElementById('statusNote')?.value.trim();
    
    if (!currentInput[activeArea]) currentInput[activeArea] = {};
    
    let finalValue = val;
    if (status) {
        finalValue = status + (note ? `\n${note}` : '');
    }
    
    if (finalValue) {
        currentInput[activeArea][fullLabel] = finalValue;
    } else {
        delete currentInput[activeArea][fullLabel];
    }
    
    localStorage.setItem(DRAFT_KEYS.LOGSHEET, JSON.stringify(currentInput));
}

/**
 * Mengirim seluruh data logsheet turbin ke server
 */
async function sendToSheet() {
    if (!requireAuth()) return;
    
    const progress = showUploadProgress('Mengirim Data Turbin...');
    const allParams = {};
    
    // Flatten data dari kategori area
    Object.values(currentInput).forEach(area => {
        Object.assign(allParams, area);
    });
    
    const payload = {
        type: 'LOGSHEET_TURBINE',
        operator: currentUser.name,
        timestamp: new Date().toISOString(),
        data: allParams,
        photos: paramPhotos[activeArea] || {} // Sertakan foto validasi
    };
    
    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(payload)
        });
        
        progress.complete();
        showCustomAlert('✓ Logsheet Turbin berhasil terkirim!', 'success');
        
        // Bersihkan draft setelah sukses
        currentInput = {};
        localStorage.removeItem(DRAFT_KEYS.LOGSHEET);
        localStorage.removeItem(PHOTO_DRAFT_KEYS.TURBINE);
        
        setTimeout(() => navigateTo('homeScreen'), 1500);
    } catch (error) {
        progress.error();
        showCustomAlert('Gagal mengirim. Data disimpan di folder offline.', 'error');
        saveToOfflineQueue(payload);
    }
}
