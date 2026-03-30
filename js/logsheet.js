/* ============================================
   TURBINE LOGSHEET PRO - LOGSHEET & CT MODULE
   ============================================ */

// ============================================
// 1. TURBINE LOGSHEET FUNCTIONS
// ============================================

function fetchLastData() {
    updateStatusIndicator(false);
    const timeout = setTimeout(() => renderMenu(), 8000);
    const callbackName = 'jsonp_' + Date.now();
    
    window[callbackName] = (data) => {
    clearTimeout(timeout);
    // Tambahkan .data agar variabel berisi data logsheet aslinya
    lastData = data.success ? data.data : {}; 
    updateStatusIndicator(true);
    cleanupJSONP(callbackName);
    renderMenu();
};
    
    const script = document.createElement('script');
    script.src = `${GAS_URL}?callback=${callbackName}`;
    script.onerror = () => {
        clearTimeout(timeout);
        cleanupJSONP(callbackName);
        renderMenu();
    };
    document.body.appendChild(script);
}

function updateStatusIndicator(isOnline) {
    console.log('System Status:', isOnline ? 'Online' : 'Offline');
}

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
                        <text x="20" y="24" text-anchor="middle" font-size="10" font-weight="bold" fill="${isCompleted ? '#10b981' : 'var(--text-primary)'}">${filled}</text>
                    </svg>
                </div>
                <div class="area-info">
                    <div class="area-name">${areaName}</div>
                    <div class="area-meta ${hasAbnormal ? 'warning' : ''}">
                        ${hasAbnormal ? '⚠️ Ada parameter bermasalah • ' : ''}${filled} dari ${total} parameter
                    </div>
                </div>
                <div class="area-status">
                    ${hasAbnormal ? '<span style="color: #ef4444; margin-right: 4px;">!</span>' : ''}
                    ${isCompleted ? '✓' : '❯'}
                </div>
            </div>
        `;
    });
    
    list.innerHTML = html;
    
    const hasData = Object.keys(currentInput).length > 0;
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) submitBtn.style.display = hasData ? 'flex' : 'none';
    
    updateOverallProgressUI(completedAreas, totalAreas);
}

function updateOverallProgress() {
    const totalAreas = Object.keys(AREAS).length;
    let completedAreas = 0;
    Object.entries(AREAS).forEach(([areaName, params]) => {
        const filled = currentInput[areaName] ? Object.keys(currentInput[areaName]).length : 0;
        if (filled === params.length && filled > 0) completedAreas++;
    });
    updateOverallProgressUI(completedAreas, totalAreas);
}

function updateOverallProgressUI(completedAreas, totalAreas) {
    const percent = Math.round((completedAreas / totalAreas) * 100);
    const progressText = document.getElementById('progressText');
    const overallPercent = document.getElementById('overallPercent');
    const overallProgressBar = document.getElementById('overallProgressBar');
    
    if (progressText) progressText.textContent = `${percent}% Complete`;
    if (overallPercent) overallPercent.textContent = `${percent}%`;
    if (overallProgressBar) overallProgressBar.style.width = `${percent}%`;
}

function openArea(areaName) {
    if (!requireAuth()) return;
    
    activeArea = areaName;
    activeIdx = 0;
    
    loadParamPhotosFromDraft();
    navigateTo('paramScreen');
    
    const currentAreaName = document.getElementById('currentAreaName');
    if (currentAreaName) currentAreaName.textContent = areaName;
    renderProgressDots();
    showStep();
}

function renderProgressDots() {
    const container = document.getElementById('progressDots');
    if (!container) return;
    const total = AREAS[activeArea].length;
    let html = '';
    
    for (let i = 0; i < total; i++) {
        const fullLabel = AREAS[activeArea][i];
        const savedValue = currentInput[activeArea]?.[fullLabel] || '';
        const lines = savedValue.split('\n');
        const firstLine = lines[0];
        
        const isFilled = savedValue !== '';
        const hasIssue = ['ERROR', 'UPPER', 'NOT_INSTALLED'].includes(firstLine);
        const isActive = i === activeIdx;
        
        let className = '';
        if (isActive) className = 'active';
        else if (hasIssue) className = 'has-issue';
        else if (isFilled) className = 'filled';
        
        html += `<div class="progress-dot ${className}" onclick="jumpToStep(${i})" title="${hasIssue ? firstLine : ''}"></div>`;
    }
    container.innerHTML = html;
}

function jumpToStep(index) {
    saveCurrentStep();
    activeIdx = index;
    showStep();
    renderProgressDots();
}

function detectInputType(label) {
    for (const [type, config] of Object.entries(INPUT_TYPES)) {
        for (const pattern of config.patterns) {
            if (label.includes(pattern)) {
                return {
                    type: 'select',
                    options: config.options[pattern],
                    pattern: pattern
                };
            }
        }
    }
    return { type: 'text', options: null, pattern: null };
}

function getUnit(label) {
    const match = label.match(/\(([^)]+)\)/);
    return match ? match[1] : "";
}

function getParamName(label) {
    return label.split(' (')[0];
}

function showStep() {
    const fullLabel = AREAS[activeArea][activeIdx];
    const total = AREAS[activeArea].length;
    const inputType = detectInputType(fullLabel);
    currentInputType = inputType.type;
    
    const stepInfo = document.getElementById('stepInfo');
    const areaProgress = document.getElementById('areaProgress');
    const labelInput = document.getElementById('labelInput');
    const lastTimeLabel = document.getElementById('lastTimeLabel');
    const prevValDisplay = document.getElementById('prevValDisplay');
    const inputFieldContainer = document.getElementById('inputFieldContainer');
    const unitDisplay = document.getElementById('unitDisplay');
    const mainInputWrapper = document.getElementById('mainInputWrapper');
    
    if (stepInfo) stepInfo.textContent = `Step ${activeIdx + 1}/${total}`;
    if (areaProgress) areaProgress.textContent = `${activeIdx + 1}/${total}`;
    if (labelInput) labelInput.textContent = getParamName(fullLabel);
    if (lastTimeLabel) lastTimeLabel.textContent = lastData._lastTime || '--:--';
    
    let prevVal = lastData[fullLabel] || '--';
    if (prevVal !== '--') {
        const lines = prevVal.toString().split('\n');
        const firstLine = lines[0];
        if (['ERROR', 'UPPER', 'NOT_INSTALLED'].includes(firstLine)) {
            prevVal = firstLine + (lines[1] ? ' - ' + lines[1] : '');
        }
    }
    if (prevValDisplay) prevValDisplay.textContent = prevVal;
    
    if (inputType.type === 'select') {
        let currentValue = (currentInput[activeArea] && currentInput[activeArea][fullLabel]) || '';
        if (currentValue) {
            const lines = currentValue.split('\n');
            const firstLine = lines[0];
            if (!['ERROR', 'UPPER', 'NOT_INSTALLED'].includes(firstLine)) {
                currentValue = firstLine;
            } else {
                currentValue = '';
            }
        }
        
        let optionsHtml = `<option value="" disabled ${!currentValue ? 'selected' : ''}>Pilih Status...</option>`;
        inputType.options.forEach(opt => {
            const selected = currentValue === opt ? 'selected' : '';
            optionsHtml += `<option value="${opt}" ${selected}>${opt}</option>`;
        });
        
        if (inputFieldContainer) {
            inputFieldContainer.innerHTML = `
                <div class="select-wrapper">
                    <select id="valInput" class="status-select">${optionsHtml}</select>
                    <div class="select-arrow">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M6 9l6 6 6-6"/>
                        </svg>
                    </div>
                </div>
            `;
        }
        if (unitDisplay) unitDisplay.style.display = 'none';
        if (mainInputWrapper) mainInputWrapper.classList.add('has-select');
    } else {
        let currentValue = (currentInput[activeArea] && currentInput[activeArea][fullLabel]) || '';
        
        if (currentValue) {
            const lines = currentValue.split('\n');
            const firstLine = lines[0];
            if (!['ERROR', 'UPPER', 'NOT_INSTALLED'].includes(firstLine)) {
                currentValue = firstLine;
            } else {
                currentValue = '';
            }
        }
        
        if (inputFieldContainer) {
            inputFieldContainer.innerHTML = `<input type="text" id="valInput" inputmode="decimal" placeholder="0.00" value="${currentValue}" autocomplete="off">`;
        }
        if (unitDisplay) {
            unitDisplay.textContent = getUnit(fullLabel) || '--';
            unitDisplay.style.display = 'flex';
        }
        if (mainInputWrapper) mainInputWrapper.classList.remove('has-select');
    }
    
    loadAbnormalStatus(fullLabel);
    renderProgressDots();
    loadParamPhotoForCurrentStep();
    
    setTimeout(() => {
        const input = document.getElementById('valInput');
        if (input && inputType.type === 'text' && !input.disabled) {
            input.focus();
            input.select();
        }
    }, 100);
}

function handleStatusChange(checkbox) {
    const chip = checkbox.closest('.status-chip');
    const noteContainer = document.getElementById('statusNoteContainer');
    const valInput = document.getElementById('valInput');
    
    document.querySelectorAll('input[name="paramStatus"]').forEach(cb => {
        if (cb !== checkbox) {
            cb.checked = false;
            cb.closest('.status-chip').classList.remove('active');
        }
    });
    
    if (checkbox.checked) {
        chip.classList.add('active');
        if (noteContainer) noteContainer.style.display = 'block';
        
        setTimeout(() => {
            document.getElementById('statusNote')?.focus();
        }, 100);
        
        if (checkbox.value === 'NOT_INSTALLED') {
            if (valInput) {
                valInput.value = '-';
                valInput.disabled = true;
                valInput.style.opacity = '0.5';
                valInput.style.background = 'rgba(100, 116, 139, 0.2)';
            }
        }
    } else {
        chip.classList.remove('active');
        if (noteContainer) noteContainer.style.display = 'none';
        const noteInput = document.getElementById('statusNote');
        if (noteInput) noteInput.value = '';
        
        if (valInput) {
            valInput.value = '';
            valInput.disabled = false;
            valInput.style.opacity = '1';
            valInput.style.background = '';
            valInput.focus();
        }
    }
    
    saveCurrentStatusToDraft();
}

function saveCurrentStatusToDraft() {
    const fullLabel = AREAS[activeArea][activeIdx];
    const input = document.getElementById('valInput');
    const checkedStatus = document.querySelector('input[name="paramStatus"]:checked');
    const note = document.getElementById('statusNote')?.value || '';
    
    if (!currentInput[activeArea]) currentInput[activeArea] = {};
    
    let valueToSave = '';
    if (input && input.value.trim()) {
        valueToSave = input.value.trim();
    }
    
    if (checkedStatus) {
        if (note) {
            valueToSave = `${checkedStatus.value}\n${note}`;
        } else {
            valueToSave = checkedStatus.value;
        }
    }
    
    if (valueToSave) {
        currentInput[activeArea][fullLabel] = valueToSave;
    } else {
        delete currentInput[activeArea][fullLabel];
    }
    
    localStorage.setItem(DRAFT_KEYS.LOGSHEET, JSON.stringify(currentInput));
    renderProgressDots();
}

function loadAbnormalStatus(fullLabel) {
    document.querySelectorAll('input[name="paramStatus"]').forEach(cb => {
        cb.checked = false;
        cb.closest('.status-chip').classList.remove('active');
    });
    
    const noteContainer = document.getElementById('statusNoteContainer');
    const noteInput = document.getElementById('statusNote');
    const valInput = document.getElementById('valInput');
    
    if (noteContainer) noteContainer.style.display = 'none';
    if (noteInput) noteInput.value = '';
    
    if (valInput) {
        valInput.disabled = false;
        valInput.style.opacity = '1';
        valInput.style.background = '';
        valInput.value = '';
    }
    
    if (currentInput[activeArea] && currentInput[activeArea][fullLabel]) {
        const savedValue = currentInput[activeArea][fullLabel];
        const lines = savedValue.split('\n');
        const firstLine = lines[0];
        const secondLine = lines[1] || '';
        
        const isStatus = ['ERROR', 'UPPER', 'NOT_INSTALLED'].includes(firstLine);
        
        if (isStatus) {
            const checkbox = document.querySelector(`input[value="${firstLine}"]`);
            if (checkbox) {
                checkbox.checked = true;
                checkbox.closest('.status-chip').classList.add('active');
                if (noteContainer) noteContainer.style.display = 'block';
                if (noteInput) noteInput.value = secondLine;
                
                if (firstLine === 'NOT_INSTALLED' && valInput) {
                    valInput.value = '-';
                    valInput.disabled = true;
                    valInput.style.opacity = '0.5';
                    valInput.style.background = 'rgba(100, 116, 139, 0.2)';
                }
            }
        } else {
            if (valInput) valInput.value = savedValue;
        }
    }
}

function saveCurrentStep() {
    const input = document.getElementById('valInput');
    const fullLabel = AREAS[activeArea][activeIdx];
    
    if (!currentInput[activeArea]) currentInput[activeArea] = {};
    
    let valueToSave = '';
    if (input && input.value.trim()) {
        valueToSave = input.value.trim();
    }
    
    const checkedStatus = document.querySelector('input[name="paramStatus"]:checked');
    const note = document.getElementById('statusNote')?.value || '';
    
    if (checkedStatus) {
        if (checkedStatus.value === 'NOT_INSTALLED') {
            valueToSave = 'NOT_INSTALLED';
            if (note) valueToSave += '\n' + note;
        } else {
            if (note) {
                valueToSave = `${checkedStatus.value}\n${note}`;
            } else {
                valueToSave = checkedStatus.value;
            }
        }
    }
    
    if (valueToSave) {
        currentInput[activeArea][fullLabel] = valueToSave;
    } else {
        delete currentInput[activeArea][fullLabel];
    }
    
    localStorage.setItem(DRAFT_KEYS.LOGSHEET, JSON.stringify(currentInput));
}

function saveStep() {
    saveCurrentStep();
    
    if (activeIdx < AREAS[activeArea].length - 1) {
        activeIdx++;
        showStep();
    } else {
        showCustomAlert(`Area ${activeArea} selesai diisi!`, 'success');
        setTimeout(() => navigateTo('areaListScreen'), 1500);
    }
}

function goBack() {
    saveCurrentStep();
    
    if (activeIdx > 0) {
        activeIdx--;
        showStep();
    } else {
        navigateTo('areaListScreen');
    }
}

async function sendToSheet() {
    if (!requireAuth()) return;
    
    // showUploadProgress asalnya dari main.js / utils.js
    const progress = showUploadProgress('Mengirim Logsheet & Foto...');
    progress.updateText('Mengompresi data...');
    currentUploadController = new AbortController();
    
    let allParameters = {};
    Object.entries(currentInput).forEach(([areaName, params]) => {
        Object.entries(params).forEach(([paramName, value]) => {
            allParameters[paramName] = value;
        });
    });
    
    let allPhotos = {};
    Object.entries(paramPhotos).forEach(([areaName, areaPhotos]) => {
        Object.entries(areaPhotos).forEach(([paramName, photoData]) => {
            if (photoData) {
                allPhotos[`${areaName}__${paramName}`] = photoData;
            }
        });
    });
    
    const finalData = {
        type: 'LOGSHEET',
        Operator: currentUser ? currentUser.name : 'Unknown',
        OperatorId: currentUser ? currentUser.id : 'Unknown',
        photoCount: Object.keys(allPhotos).length,
        ...allParameters
    };
    
    if (Object.keys(allPhotos).length > 0) {
        progress.updateText(`Mengirim ${Object.keys(allPhotos).length} foto...`);
        
        for (const [key, photoData] of Object.entries(allPhotos)) {
            try {
                const photoPayload = {
                    type: 'LOGSHEET_PHOTO',
                    parentType: 'LOGSHEET',
                    Operator: currentUser ? currentUser.name : 'Unknown',
                    photoKey: key,
                    photo: photoData,
                    timestamp: new Date().toISOString()
                };
                
                await fetch(GAS_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(photoPayload),
                    signal: currentUploadController.signal
                });
                
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (photoError) {
                console.warn('Error sending photo:', key, photoError);
            }
        }
    }
    
    progress.updateText('Mengirim data parameter...');
    
    try {
        await fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalData),
            signal: currentUploadController.signal
        });
        
        progress.complete();
        showCustomAlert('✓ Data dan foto berhasil dikirim ke sistem!', 'success');
        
        currentInput = {};
        paramPhotos = {};
        currentParamPhoto = null;
        localStorage.removeItem(DRAFT_KEYS.LOGSHEET);
        localStorage.removeItem(PHOTO_DRAFT_KEYS.TURBINE);
        
        setTimeout(() => navigateTo('homeScreen'), 1500);
        
    } catch (error) {
        console.error('Error sending data:', error);
        progress.error();
        
        let offlineData = JSON.parse(localStorage.getItem(DRAFT_KEYS.LOGSHEET_OFFLINE) || '[]');
        offlineData.push({...finalData, photos: allPhotos});
        localStorage.setItem(DRAFT_KEYS.LOGSHEET_OFFLINE, JSON.stringify(offlineData));
        
        setTimeout(() => {
            showCustomAlert('Gagal mengirim. Data dan foto disimpan lokal.', 'error');
        }, 500);
    }
}


// ============================================
// 2. CT LOGSHEET FUNCTIONS
// ============================================

function fetchLastDataCT() {
    updateStatusIndicator(false);
    const timeout = setTimeout(() => renderCTMenu(), 8000);
    const callbackName = 'jsonp_ct_' + Date.now();
    
    window[callbackName] = (data) => {
    clearTimeout(timeout);
    // Tambahkan .data
    lastDataCT = data.success ? data.data : {}; 
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
                        <circle cx="20" cy="20" r="18" fill="none" stroke="${isCompleted ? '#10b981' : '#3b82f6'}" 
                                stroke-width="3" stroke-linecap="round" stroke-dasharray="${circumference}" 
                                stroke-dashoffset="${strokeDashoffset}" transform="rotate(-90 20 20)"/>
                        <text x="20" y="24" text-anchor="middle" font-size="10" font-weight="bold" fill="${isCompleted ? '#10b981' : '#f8fafc'}">${filled}</text>
                    </svg>
                </div>
                <div class="area-info">
                    <div class="area-name">${areaName}</div>
                    <div class="area-meta ${hasAbnormal ? 'warning' : ''}">
                        ${hasAbnormal ? '⚠️ Ada parameter bermasalah • ' : ''}${filled} dari ${total} parameter
                    </div>
                </div>
                <div class="area-status">
                    ${hasAbnormal ? '<span style="color: #ef4444; margin-right: 4px;">!</span>' : ''}
                    ${isCompleted ? '✓' : '❯'}
                </div>
            </div>
        `;
    });
    
    list.innerHTML = html;
    
    const hasData = Object.keys(currentInputCT).length > 0;
    const submitBtn = document.getElementById('ctSubmitBtn');
    if (submitBtn) submitBtn.style.display = hasData ? 'flex' : 'none';
    
    updateCTOverallProgressUI(completedAreas, totalAreas);
}

function updateCTOverallProgress() {
    const totalAreas = Object.keys(AREAS_CT).length;
    let completedAreas = 0;
    Object.entries(AREAS_CT).forEach(([areaName, params]) => {
        const filled = currentInputCT[areaName] ? Object.keys(currentInputCT[areaName]).length : 0;
        if (filled === params.length && filled > 0) completedAreas++;
    });
    updateCTOverallProgressUI(completedAreas, totalAreas);
}

function updateCTOverallProgressUI(completedAreas, totalAreas) {
    const percent = Math.round((completedAreas / totalAreas) * 100);
    const progressText = document.getElementById('ctProgressText');
    const overallPercent = document.getElementById('ctOverallPercent');
    const overallProgressBar = document.getElementById('ctOverallProgressBar');
    
    if (progressText) progressText.textContent = `${percent}% Complete`;
    if (overallPercent) overallPercent.textContent = `${percent}%`;
    if (overallProgressBar) overallProgressBar.style.width = `${percent}%`;
}

function openCTArea(areaName) {
    if (!requireAuth()) return;
    
    activeAreaCT = areaName;
    activeIdxCT = 0;
    
    loadCTParamPhotosFromDraft();
    navigateTo('ctParamScreen');
    
    const currentAreaName = document.getElementById('ctCurrentAreaName');
    if (currentAreaName) currentAreaName.textContent = areaName;
    renderCTProgressDots();
    showCTStep();
}

function renderCTProgressDots() {
    const container = document.getElementById('ctProgressDots');
    if (!container) return;
    const total = AREAS_CT[activeAreaCT].length;
    let html = '';
    
    for (let i = 0; i < total; i++) {
        const fullLabel = AREAS_CT[activeAreaCT][i];
        const savedValue = currentInputCT[activeAreaCT]?.[fullLabel] || '';
        const lines = savedValue.split('\n');
        const firstLine = lines[0];
        
        const isFilled = savedValue !== '';
        const hasIssue = ['ERROR', 'MAINTENANCE', 'NOT_INSTALLED'].includes(firstLine);
        const isActive = i === activeIdxCT;
        
        let className = '';
        if (isActive) className = 'active';
        else if (hasIssue) className = 'has-issue';
        else if (isFilled) className = 'filled';
        
        html += `<div class="progress-dot ${className}" onclick="jumpToCTStep(${i})" title="${hasIssue ? firstLine : ''}"></div>`;
    }
    container.innerHTML = html;
}

function jumpToCTStep(index) {
    const fullLabel = AREAS_CT[activeAreaCT][activeIdxCT];
    const input = document.getElementById('ctValInput');
    
    if (input && input.value.trim()) {
        if (!currentInputCT[activeAreaCT]) currentInputCT[activeAreaCT] = {};
        
        const checkedStatus = document.querySelector('input[name="ctParamStatus"]:checked');
        const note = document.getElementById('ctStatusNote')?.value || '';
        let valueToSave = input.value.trim();
        
        if (checkedStatus) {
            if (note) {
                valueToSave = `${checkedStatus.value}\n${note}`;
            } else {
                valueToSave = checkedStatus.value;
            }
        }
        
        currentInputCT[activeAreaCT][fullLabel] = valueToSave;
        localStorage.setItem(DRAFT_KEYS_CT.LOGSHEET, JSON.stringify(currentInputCT));
    }
    
    activeIdxCT = index;
    showCTStep();
    renderCTProgressDots();
}

function detectCTInputType(label) {
    if (label.includes('(A/M)') || label.includes('(A/B)')) {
        return {
            type: 'select',
            options: label.includes('(A/M)') ? ['Auto', 'Manual'] : ['A', 'B', 'AB'],
            pattern: label.includes('(A/M)') ? '(A/M)' : '(A/B)'
        };
    }
    if (label.includes('STATUS') || label.includes('Running') || label.includes('ON/OFF')) {
        return {
            type: 'select',
            options: ['Running', 'Stop', 'Standby'],
            pattern: 'STATUS'
        };
    }
    return { type: 'text', options: null, pattern: null };
}

function getCTUnit(label) {
    const match = label.match(/\(([^)]+)\)/);
    return match ? match[1] : "";
}

function getCTParamName(label) {
    return label.split(' (')[0];
}

function handleCTStatusChange(checkbox) {
    const chip = checkbox.closest('.status-chip');
    const noteContainer = document.getElementById('ctStatusNoteContainer');
    const valInput = document.getElementById('ctValInput');
    
    document.querySelectorAll('input[name="ctParamStatus"]').forEach(cb => {
        if (cb !== checkbox) {
            cb.checked = false;
            cb.closest('.status-chip').classList.remove('active');
        }
    });
    
    if (checkbox.checked) {
        chip.classList.add('active');
        if (noteContainer) noteContainer.style.display = 'block';
        
        setTimeout(() => {
            document.getElementById('ctStatusNote')?.focus();
        }, 100);
        
        if (checkbox.value === 'NOT_INSTALLED' && valInput) {
            valInput.value = '-';
            valInput.disabled = true;
            valInput.style.opacity = '0.5';
            valInput.style.background = 'rgba(100, 116, 139, 0.2)';
        }
    } else {
        chip.classList.remove('active');
        if (noteContainer) noteContainer.style.display = 'none';
        const noteInput = document.getElementById('ctStatusNote');
        if (noteInput) noteInput.value = '';
        
        if (valInput) {
            valInput.value = '';
            valInput.disabled = false;
            valInput.style.opacity = '1';
            valInput.style.background = '';
            valInput.focus();
        }
    }
    
    saveCurrentCTStatusToDraft();
}

function saveCurrentCTStatusToDraft() {
    const fullLabel = AREAS_CT[activeAreaCT][activeIdxCT];
    const input = document.getElementById('ctValInput');
    const checkedStatus = document.querySelector('input[name="ctParamStatus"]:checked');
    const note = document.getElementById('ctStatusNote')?.value || '';
    
    if (!currentInputCT[activeAreaCT]) currentInputCT[activeAreaCT] = {};
    
    let valueToSave = '';
    if (input && input.value.trim()) {
        valueToSave = input.value.trim();
    }
    
    if (checkedStatus) {
        if (note) {
            valueToSave = `${checkedStatus.value}\n${note}`;
        } else {
            valueToSave = checkedStatus.value;
        }
    }
    
    if (valueToSave) {
        currentInputCT[activeAreaCT][fullLabel] = valueToSave;
    } else {
        delete currentInputCT[activeAreaCT][fullLabel];
    }
    
    localStorage.setItem(DRAFT_KEYS_CT.LOGSHEET, JSON.stringify(currentInputCT));
    renderCTProgressDots();
}

function loadCTAbnormalStatus(fullLabel) {
    document.querySelectorAll('input[name="ctParamStatus"]').forEach(cb => {
        cb.checked = false;
        cb.closest('.status-chip').classList.remove('active');
    });
    
    const noteContainer = document.getElementById('ctStatusNoteContainer');
    const noteInput = document.getElementById('ctStatusNote');
    const valInput = document.getElementById('ctValInput');
    
    if (noteContainer) noteContainer.style.display = 'none';
    if (noteInput) noteInput.value = '';
    
    if (valInput) {
        valInput.disabled = false;
        valInput.style.opacity = '1';
        valInput.style.background = '';
        valInput.value = '';
    }
    
    if (currentInputCT[activeAreaCT] && currentInputCT[activeAreaCT][fullLabel]) {
        const savedValue = currentInputCT[activeAreaCT][fullLabel];
        const lines = savedValue.split('\n');
        const firstLine = lines[0];
        const secondLine = lines[1] || '';
        
        const isStatus = ['ERROR', 'MAINTENANCE', 'NOT_INSTALLED'].includes(firstLine);
        
        if (isStatus) {
            const checkbox = document.querySelector(`input[value="${firstLine}"]`);
            if (checkbox) {
                checkbox.checked = true;
                checkbox.closest('.status-chip').classList.add('active');
                if (noteContainer) noteContainer.style.display = 'block';
                if (noteInput) noteInput.value = secondLine;
                
                if (firstLine === 'NOT_INSTALLED' && valInput) {
                    valInput.value = '-';
                    valInput.disabled = true;
                    valInput.style.opacity = '0.5';
                    valInput.style.background = 'rgba(100, 116, 139, 0.2)';
                }
            }
        } else {
            if (valInput) valInput.value = savedValue;
        }
    }
}

function showCTStep() {
    const fullLabel = AREAS_CT[activeAreaCT][activeIdxCT];
    const total = AREAS_CT[activeAreaCT].length;
    const inputType = detectCTInputType(fullLabel);
    currentInputTypeCT = inputType.type;
    
    const stepInfo = document.getElementById('ctStepInfo');
    const areaProgress = document.getElementById('ctAreaProgress');
    const labelInput = document.getElementById('ctLabelInput');
    const lastTimeLabel = document.getElementById('ctLastTimeLabel');
    const prevValDisplay = document.getElementById('ctPrevValDisplay');
    const inputFieldContainer = document.getElementById('ctInputFieldContainer');
    const unitDisplay = document.getElementById('ctUnitDisplay');
    const mainInputWrapper = document.getElementById('ctMainInputWrapper');
    
    if (stepInfo) stepInfo.textContent = `Step ${activeIdxCT + 1}/${total}`;
    if (areaProgress) areaProgress.textContent = `${activeIdxCT + 1}/${total}`;
    if (labelInput) labelInput.textContent = getCTParamName(fullLabel);
    if (lastTimeLabel) lastTimeLabel.textContent = lastDataCT._lastTime || '--:--';
    
    let prevVal = lastDataCT[fullLabel] || '--';
    if (prevVal !== '--') {
        const lines = prevVal.toString().split('\n');
        const firstLine = lines[0];
        if (['ERROR', 'MAINTENANCE', 'NOT_INSTALLED'].includes(firstLine)) {
            prevVal = firstLine + (lines[1] ? ' - ' + lines[1] : '');
        }
    }
    if (prevValDisplay) prevValDisplay.textContent = prevVal;
    
    if (inputType.type === 'select') {
        let currentValue = (currentInputCT[activeAreaCT] && currentInputCT[activeAreaCT][fullLabel]) || '';
        if (currentValue) {
            const lines = currentValue.split('\n');
            const firstLine = lines[0];
            if (!['ERROR', 'MAINTENANCE', 'NOT_INSTALLED'].includes(firstLine)) {
                currentValue = firstLine;
            } else {
                currentValue = '';
            }
        }
        
        let optionsHtml = `<option value="" disabled ${!currentValue ? 'selected' : ''}>Pilih Status...</option>`;
        inputType.options.forEach(opt => {
            const selected = currentValue === opt ? 'selected' : '';
            optionsHtml += `<option value="${opt}" ${selected}>${opt}</option>`;
        });
        
        if (inputFieldContainer) {
            inputFieldContainer.innerHTML = `
                <div class="select-wrapper">
                    <select id="ctValInput" class="status-select">${optionsHtml}</select>
                    <div class="select-arrow">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M6 9l6 6 6-6"/>
                        </svg>
                    </div>
                </div>
            `;
        }
        if (unitDisplay) unitDisplay.style.display = 'none';
        if (mainInputWrapper) mainInputWrapper.classList.add('has-select');
    } else {
        let currentValue = (currentInputCT[activeAreaCT] && currentInputCT[activeAreaCT][fullLabel]) || '';
        
        if (currentValue) {
            const lines = currentValue.split('\n');
            const firstLine = lines[0];
            if (!['ERROR', 'MAINTENANCE', 'NOT_INSTALLED'].includes(firstLine)) {
                currentValue = firstLine;
            } else {
                currentValue = '';
            }
        }
        
        if (inputFieldContainer) {
            inputFieldContainer.innerHTML = `<input type="text" id="ctValInput" inputmode="decimal" placeholder="0.00" value="${currentValue}" autocomplete="off">`;
        }
        if (unitDisplay) {
            unitDisplay.textContent = getCTUnit(fullLabel) || '--';
            unitDisplay.style.display = 'flex';
        }
        if (mainInputWrapper) mainInputWrapper.classList.remove('has-select');
    }
    
    loadCTAbnormalStatus(fullLabel);
    renderCTProgressDots();
    loadCTParamPhotoForCurrentStep();
    
    setTimeout(() => {
        const input = document.getElementById('ctValInput');
        if (input && inputType.type === 'text' && !input.disabled) {
            input.focus();
            input.select();
        }
    }, 100);
}

function saveCTStep() {
    const input = document.getElementById('ctValInput');
    const fullLabel = AREAS_CT[activeAreaCT][activeIdxCT];
    
    if (!currentInputCT[activeAreaCT]) currentInputCT[activeAreaCT] = {};
    
    let valueToSave = '';
    if (input && input.value.trim()) {
        valueToSave = input.value.trim();
    }
    
    const checkedStatus = document.querySelector('input[name="ctParamStatus"]:checked');
    const note = document.getElementById('ctStatusNote')?.value || '';
    
    if (checkedStatus) {
        if (checkedStatus.value === 'NOT_INSTALLED') {
            valueToSave = 'NOT_INSTALLED';
            if (note) valueToSave += '\n' + note;
        } else {
            if (note) {
                valueToSave = `${checkedStatus.value}\n${note}`;
            } else {
                valueToSave = checkedStatus.value;
            }
        }
    }
    
    if (valueToSave) {
        currentInputCT[activeAreaCT][fullLabel] = valueToSave;
    } else {
        delete currentInputCT[activeAreaCT][fullLabel];
    }
    
    localStorage.setItem(DRAFT_KEYS_CT.LOGSHEET, JSON.stringify(currentInputCT));
    
    if (activeIdxCT < AREAS_CT[activeAreaCT].length - 1) {
        activeIdxCT++;
        showCTStep();
    } else {
        showCustomAlert(`Area ${activeAreaCT} selesai diisi!`, 'success');
        setTimeout(() => navigateTo('ctAreaListScreen'), 1500);
    }
}

function goBackCT() {
    const fullLabel = AREAS_CT[activeAreaCT][activeIdxCT];
    const input = document.getElementById('ctValInput');
    
    if (!currentInputCT[activeAreaCT]) currentInputCT[activeAreaCT] = {};
    
    let valueToSave = '';
    if (input && input.value.trim()) {
        valueToSave = input.value.trim();
    }
    
    const checkedStatus = document.querySelector('input[name="ctParamStatus"]:checked');
    const note = document.getElementById('ctStatusNote')?.value || '';
    
    if (checkedStatus) {
        if (checkedStatus.value === 'NOT_INSTALLED') {
            valueToSave = 'NOT_INSTALLED';
            if (note) valueToSave += '\n' + note;
        } else {
            if (note) {
                valueToSave = `${checkedStatus.value}\n${note}`;
            } else {
                valueToSave = checkedStatus.value;
            }
        }
    }
    
    if (valueToSave) {
        currentInputCT[activeAreaCT][fullLabel] = valueToSave;
    } else {
        delete currentInputCT[activeAreaCT][fullLabel];
    }
    
    localStorage.setItem(DRAFT_KEYS_CT.LOGSHEET, JSON.stringify(currentInputCT));
    
    if (activeIdxCT > 0) {
        activeIdxCT--;
        showCTStep();
    } else {
        navigateTo('ctAreaListScreen');
    }
}

async function sendCTToSheet() {
    if (!requireAuth()) return;
    
    const progress = showUploadProgress('Mengirim Logsheet CT & Foto...');
    progress.updateText('Mengompresi data...');
    currentUploadController = new AbortController();
    
    let allParameters = {};
    Object.entries(currentInputCT).forEach(([areaName, params]) => {
        Object.entries(params).forEach(([paramName, value]) => {
            allParameters[paramName] = value;
        });
    });
    
    let allPhotos = {};
    Object.entries(ctParamPhotos).forEach(([areaName, areaPhotos]) => {
        Object.entries(areaPhotos).forEach(([paramName, photoData]) => {
            if (photoData) {
                allPhotos[`${areaName}__${paramName}`] = photoData;
            }
        });
    });
    
    const finalData = {
        type: 'LOGSHEET_CT',
        Operator: currentUser ? currentUser.name : 'Unknown',
        OperatorId: currentUser ? currentUser.id : 'Unknown',
        photoCount: Object.keys(allPhotos).length,
        ...allParameters
    };
    
    if (Object.keys(allPhotos).length > 0) {
        progress.updateText(`Mengirim ${Object.keys(allPhotos).length} foto...`);
        
        for (const [key, photoData] of Object.entries(allPhotos)) {
            try {
                const photoPayload = {
                    type: 'LOGSHEET_PHOTO',
                    parentType: 'LOGSHEET_CT',
                    Operator: currentUser ? currentUser.name : 'Unknown',
                    photoKey: key,
                    photo: photoData,
                    timestamp: new Date().toISOString()
                };
                
                await fetch(GAS_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(photoPayload),
                    signal: currentUploadController.signal
                });
                
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (photoError) {
                console.warn('Error sending CT photo:', key, photoError);
            }
        }
    }
    
    progress.updateText('Mengirim data parameter CT...');
    
    try {
        await fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalData),
            signal: currentUploadController.signal
        });
        
        progress.complete();
        showCustomAlert('✓ Data CT dan foto berhasil dikirim ke sistem!', 'success');
        
        currentInputCT = {};
        ctParamPhotos = {};
        currentCTParamPhoto = null;
        localStorage.removeItem(DRAFT_KEYS_CT.LOGSHEET);
        localStorage.removeItem(PHOTO_DRAFT_KEYS.CT);
        
        setTimeout(() => navigateTo('homeScreen'), 1500);
        
    } catch (error) {
        console.error('Error sending CT data:', error);
        progress.error();
        
        let offlineData = JSON.parse(localStorage.getItem(DRAFT_KEYS_CT.OFFLINE) || '[]');
        offlineData.push({...finalData, photos: allPhotos});
        localStorage.setItem(DRAFT_KEYS_CT.OFFLINE, JSON.stringify(offlineData));
        
        setTimeout(() => {
            showCustomAlert('Gagal mengirim. Data dan foto disimpan lokal.', 'error');
        }, 500);
    }
}


// ============================================
// 3. PHOTO VALIDATION (TURBINE & CT)
// ============================================

function handleParamPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
        showCustomAlert('Ukuran file terlalu besar (>10MB).', 'error');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
        const originalDataUrl = e.target.result;
        showCustomAlert('🔄 Mengkompresi foto...', 'info');
        
        try {
            const result = await compressImage(originalDataUrl, {
                maxWidth: 1920,
                maxHeight: 1920,
                quality: 0.8,
                type: 'image/jpeg'
            });
            
            currentParamPhoto = result.dataUrl;
            if (!paramPhotos[activeArea]) paramPhotos[activeArea] = {};
            const fullLabel = AREAS[activeArea][activeIdx];
            paramPhotos[activeArea][fullLabel] = currentParamPhoto;
            saveParamPhotosToDraft();
            
            updateParamPhotoPreviewWithInfo(result);
            showCustomAlert(`✓ Dikompresi: ${result.originalSize}KB → ${result.compressedSize}KB`, 'success');
            
        } catch (error) {
            console.error('Kompresi gagal:', error);
            currentParamPhoto = originalDataUrl;
            if (!paramPhotos[activeArea]) paramPhotos[activeArea] = {};
            const fullLabel = AREAS[activeArea][activeIdx];
            paramPhotos[activeArea][fullLabel] = currentParamPhoto;
            saveParamPhotosToDraft();
            updateParamPhotoPreview();
        }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

function updateParamPhotoPreview() {
    const preview = document.getElementById('paramPhotoPreview');
    const photoSection = document.getElementById('paramPhotoSection');
    const badge = document.getElementById('paramPhotoBadge');
    
    if (!preview || !photoSection) return;
    
    if (currentParamPhoto) {
        preview.innerHTML = `<img src="${currentParamPhoto}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;" alt="Parameter Photo">`;
        photoSection.classList.add('has-photo');
        if (badge) {
            badge.textContent = '✓ ADA';
            badge.classList.add('has-photo');
        }
    } else {
        preview.innerHTML = `
            <div class="photo-placeholder">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                </svg>
                <div>Belum ada foto</div>
                <small>Ambil foto parameter untuk validasi</small>
            </div>
        `;
        photoSection.classList.remove('has-photo');
        if (badge) {
            badge.textContent = 'OPSIONAL';
            badge.classList.remove('has-photo');
        }
    }
}

function updateParamPhotoPreviewWithInfo(result) {
    const preview = document.getElementById('paramPhotoPreview');
    const photoSection = document.getElementById('paramPhotoSection');
    const badge = document.getElementById('paramPhotoBadge');
    
    if (!preview || !photoSection) return;
    
    const sizeBadge = `
        <div style="position: absolute; top: 8px; right: 8px; background: rgba(16, 185, 129, 0.9); color: white; padding: 4px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 600;">
            ${result.compressedSize}KB ↓${result.reduction}%
        </div>`;
    
    preview.innerHTML = `
        <div style="position: relative; width: 100%; height: 100%;">
            <img src="${result.dataUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;">
            ${sizeBadge}
        </div>`;
    photoSection.classList.add('has-photo');
    
    if (badge) {
        badge.textContent = `✓ ${result.compressedSize}KB`;
        badge.classList.add('has-photo');
    }
}

function loadParamPhotoForCurrentStep() {
    const fullLabel = AREAS[activeArea][activeIdx];
    currentParamPhoto = paramPhotos[activeArea]?.[fullLabel] || null;
    updateParamPhotoPreview();
}

function saveParamPhotosToDraft() {
    try {
        localStorage.setItem(PHOTO_DRAFT_KEYS.TURBINE, JSON.stringify(paramPhotos));
    } catch (e) {
        console.error('Error saving param photos:', e);
    }
}

function loadParamPhotosFromDraft() {
    try {
        const saved = localStorage.getItem(PHOTO_DRAFT_KEYS.TURBINE);
        if (saved) {
            paramPhotos = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Error loading param photos:', e);
        paramPhotos = {};
    }
}

function clearParamPhotosForArea(areaName) {
    if (paramPhotos[areaName]) {
        delete paramPhotos[areaName];
        saveParamPhotosToDraft();
    }
}

function handleCTParamPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
        showCustomAlert('Ukuran file terlalu besar (>10MB).', 'error');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
        const originalDataUrl = e.target.result;
        showCustomAlert('🔄 Mengkompresi foto CT...', 'info');
        
        try {
            const result = await compressImage(originalDataUrl, {
                maxWidth: 1600,
                maxHeight: 1600,
                quality: 0.75,
                type: 'image/jpeg'
            });
            
            currentCTParamPhoto = result.dataUrl;
            if (!ctParamPhotos[activeAreaCT]) ctParamPhotos[activeAreaCT] = {};
            const fullLabel = AREAS_CT[activeAreaCT][activeIdxCT];
            ctParamPhotos[activeAreaCT][fullLabel] = currentCTParamPhoto;
            saveCTParamPhotosToDraft();
            
            updateCTParamPhotoPreviewWithInfo(result);
            showCustomAlert(`✓ Foto CT: ${result.compressedSize}KB`, 'success');
            
        } catch (error) {
            console.error('Kompresi CT gagal:', error);
            currentCTParamPhoto = originalDataUrl;
            if (!ctParamPhotos[activeAreaCT]) ctParamPhotos[activeAreaCT] = {};
            const fullLabel = AREAS_CT[activeAreaCT][activeIdxCT];
            ctParamPhotos[activeAreaCT][fullLabel] = currentCTParamPhoto;
            saveCTParamPhotosToDraft();
            updateCTParamPhotoPreview();
        }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

function updateCTParamPhotoPreview() {
    const preview = document.getElementById('ctParamPhotoPreview');
    const photoSection = document.getElementById('ctParamPhotoSection');
    const badge = document.getElementById('ctParamPhotoBadge');
    
    if (!preview || !photoSection) return;
    
    if (currentCTParamPhoto) {
        preview.innerHTML = `<img src="${currentCTParamPhoto}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;" alt="CT Parameter Photo">`;
        photoSection.classList.add('has-photo');
        if (badge) {
            badge.textContent = '✓ ADA';
            badge.classList.add('has-photo');
        }
    } else {
        preview.innerHTML = `
            <div class="photo-placeholder">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                </svg>
                <div>Belum ada foto</div>
                <small>Ambil foto parameter untuk validasi</small>
            </div>
        `;
        photoSection.classList.remove('has-photo');
        if (badge) {
            badge.textContent = 'OPSIONAL';
            badge.classList.remove('has-photo');
        }
    }
}

function updateCTParamPhotoPreviewWithInfo(result) {
    const preview = document.getElementById('ctParamPhotoPreview');
    const photoSection = document.getElementById('ctParamPhotoSection');
    const badge = document.getElementById('ctParamPhotoBadge');
    
    if (!preview || !photoSection) return;
    
    const sizeBadge = `
        <div style="position: absolute; top: 8px; right: 8px; background: rgba(59, 130, 246, 0.9); color: white; padding: 4px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 600;">
            ${result.compressedSize}KB ↓${result.reduction}%
        </div>`;
    
    preview.innerHTML = `
        <div style="position: relative; width: 100%; height: 100%;">
            <img src="${result.dataUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;">
            ${sizeBadge}
        </div>`;
    photoSection.classList.add('has-photo');
    
    if (badge) {
        badge.textContent = `✓ ${result.compressedSize}KB`;
        badge.classList.add('has-photo');
    }
}

function loadCTParamPhotoForCurrentStep() {
    const fullLabel = AREAS_CT[activeAreaCT][activeIdxCT];
    currentCTParamPhoto = ctParamPhotos[activeAreaCT]?.[fullLabel] || null;
    updateCTParamPhotoPreview();
}

function saveCTParamPhotosToDraft() {
    try {
        localStorage.setItem(PHOTO_DRAFT_KEYS.CT, JSON.stringify(ctParamPhotos));
    } catch (e) {
        console.error('Error saving CT param photos:', e);
    }
}

function loadCTParamPhotosFromDraft() {
    try {
        const saved = localStorage.getItem(PHOTO_DRAFT_KEYS.CT);
        if (saved) {
            ctParamPhotos = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Error loading CT param photos:', e);
        ctParamPhotos = {};
    }
}

function clearCTParamPhotosForArea(areaName) {
    if (ctParamPhotos[areaName]) {
        delete ctParamPhotos[areaName];
        saveCTParamPhotosToDraft();
    }
}
