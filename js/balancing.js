/* ============================================
   TURBINE LOGSHEET PRO - BALANCING MODULE
   ============================================ */

// ============================================
// 1. INITIALIZATION & SHIFT DETECTION
// ============================================

function initBalancingScreen() {
    if (!requireAuth()) return;
    
    const balancingUser = document.getElementById('balancingUser');
    if (balancingUser && currentUser) balancingUser.textContent = currentUser.name;
    
    detectShift();
    
    const draftData = JSON.parse(localStorage.getItem(DRAFT_KEYS.BALANCING));
    if (draftData) {
        loadBalancingDraft();
    } else {
        loadLastBalancingData(); // Mengambil data terakhir dari server
    }
    
    calculateLPBalance();
    setupBalancingAutoSave();
    setTimeout(updateDraftStatusIndicator, 100);
}

function detectShift() {
    const hour = new Date().getHours();
    let shift = 3;
    let shiftText = "Shift 3 (23:00 - 07:00)";
    
    if (hour >= 7 && hour < 15) {
        shift = 1;
        shiftText = "Shift 1 (07:00 - 15:00)";
    } else if (hour >= 15 && hour < 23) {
        shift = 2;
        shiftText = "Shift 2 (15:00 - 23:00)";
    }
    
    currentShift = shift;
    const badge = document.getElementById('currentShiftBadge');
    const info = document.getElementById('balancingShiftInfo');
    
    if (badge) {
        badge.textContent = `SHIFT ${shift}`;
        const colors = ['#f59e0b', '#3b82f6', '#10b981'];
        badge.style.background = colors[shift - 1];
    }
    if (info) info.textContent = `${shiftText} • Auto Save Aktif`;
    
    setDefaultDateTime();
}

function setDefaultDateTime() {
    const now = new Date();
    const dateInput = document.getElementById('balancingDate');
    const timeInput = document.getElementById('balancingTime');
    
    if (dateInput) dateInput.value = now.toISOString().split('T')[0];
    if (timeInput) timeInput.value = now.toTimeString().slice(0, 5);
}

// ============================================
// 2. FETCH LAST DATA (FIXED WITH JSONP)
// ============================================

function loadLastBalancingData() {
    const loader = document.getElementById('loader');
    const balancingTimeLabel = document.getElementById('balancingLastTimeLabel');
    const balancingDateLabel = document.getElementById('balancingLastDateLabel');

    if (loader) loader.style.display = 'flex';
    updateStatusIndicator(false);

    const callbackName = 'jsonp_balancing_' + Date.now();
    
    window[callbackName] = (response) => {
        if (loader) loader.style.display = 'none';
        
        if (response && response.success && response.data) {
            const lastDataFetch = response.data;

            // Update Label Header (Memperbaiki issue --:--)
            if (balancingTimeLabel) balancingTimeLabel.textContent = lastDataFetch._lastTime || '--:--';
            if (balancingDateLabel) balancingDateLabel.textContent = lastDataFetch['Tanggal'] || '--/--/----';

            // Mapping field dari server (Spreadsheet) ke form PWA
            const fieldMapping = {
                'loadMW': lastDataFetch['Load_MW'],
                'eksporMW': lastDataFetch['Ekspor_Impor_MW'],
                'plnMW': lastDataFetch['PLN_MW'],
                'ubbMW': lastDataFetch['UBB_MW'],
                'pieMW': lastDataFetch['PIE_MW'],
                'tg65MW': lastDataFetch['TG65_MW'],
                'tg66MW': lastDataFetch['TG66_MW'],
                'gtgMW': lastDataFetch['GTG_MW'],
                'ss6500MW': lastDataFetch['SS6500_MW'],
                'fq1105': lastDataFetch['Produksi_Steam_SA_t/h'],
                'stgSteam': lastDataFetch['STG_Steam_t/h'],
                'pa2Steam': lastDataFetch['PA2_Steam_t/h'],
                'puri2Steam': lastDataFetch['Puri2_Steam_t/h'],
                'deaeratorSteam': lastDataFetch['Deaerator_t/h'],
                'kegiatanShift': lastDataFetch['Kegiatan_Shift']
            };

            Object.entries(fieldMapping).forEach(([id, value]) => {
                const el = document.getElementById(id);
                if (el && value !== undefined && value !== null && value !== '') {
                    el.value = value;
                }
            });

            updateStatusIndicator(true);
            calculateLPBalance();
            saveBalancingDraft();
            showCustomAlert('✓ Data terakhir berhasil dimuat.', 'success');
        }
        cleanupJSONP(callbackName);
    };

    const script = document.createElement('script');
    script.src = `${GAS_URL}?action=getLastBalancing&callback=${callbackName}&t=${Date.now()}`;
    script.onerror = () => {
        if (loader) loader.style.display = 'none';
        cleanupJSONP(callbackName);
    };
    document.body.appendChild(script);
}

// ============================================
// 3. RESET & FORM MANAGEMENT
// ============================================

function resetBalancingForm() {
    if (!confirm('Yakin reset form? Semua data akan dikosongkan.')) return;
    
    clearBalancingDraft();
    
    // Kosongkan semua field input
    BALANCING_FIELDS.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) element.value = '';
    });
    
    // Kembalikan ke waktu sekarang (Agar tidak --)
    setDefaultDateTime(); 
    
    const eksporEl = document.getElementById('eksporMW');
    if (eksporEl) {
        eksporEl.setAttribute('data-state', '');
        eksporEl.style.borderColor = 'rgba(148, 163, 184, 0.2)';
    }
    
    calculateLPBalance();
    showCustomAlert('Form berhasil direset!', 'success');
}

// ============================================
// 4. CALCULATIONS & AUTO-SAVE
// ============================================

function calculateLPBalance() {
    const produksi = parseFloat(document.getElementById('fq1105')?.value) || 0;
    const ids = ['stgSteam', 'pa2Steam', 'puri2Steam', 'deaeratorSteam', 'dumpCondenser', 'pcv6105', 'melterSA2', 'ejectorSteam', 'glandSealSteam'];
    
    let totalKonsumsi = 0;
    ids.forEach(id => {
        totalKonsumsi += parseFloat(document.getElementById(id)?.value) || 0;
    });
    
    const totalDisplay = document.getElementById('totalKonsumsiSteam');
    if (totalDisplay) totalDisplay.textContent = totalKonsumsi.toFixed(1) + ' t/h';
    
    const balance = produksi - totalKonsumsi;
    const balanceInput = document.getElementById('lpBalanceValue');
    const balanceStatus = document.getElementById('lpBalanceStatus');
    
    if (balanceInput) balanceInput.value = Math.abs(balance).toFixed(1);
    if (balanceStatus) {
        balanceStatus.textContent = balance < 0 ? 'Posisi: Impor dari 3A' : 'Posisi: Ekspor ke 3A';
        balanceStatus.style.color = balance < 0 ? '#f59e0b' : '#10b981';
    }
    return balance;
}

function setupBalancingAutoSave() {
    setInterval(() => {
        if (hasBalancingData()) saveBalancingDraft();
    }, 10000);
}

function saveBalancingDraft() {
    const data = {};
    BALANCING_FIELDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) data[id] = el.value;
    });
    localStorage.setItem(DRAFT_KEYS.BALANCING, JSON.stringify(data));
    updateDraftStatusIndicator();
}

function loadBalancingDraft() {
    const data = JSON.parse(localStorage.getItem(DRAFT_KEYS.BALANCING));
    if (!data) return;
    BALANCING_FIELDS.forEach(id => {
        const el = document.getElementById(id);
        if (el && data[id]) el.value = data[id];
    });
}

function hasBalancingData() {
    return BALANCING_FIELDS.some(id => document.getElementById(id)?.value !== '');
}

function clearBalancingDraft() {
    localStorage.removeItem(DRAFT_KEYS.BALANCING);
    updateDraftStatusIndicator();
}

function updateDraftStatusIndicator() {
    const indicator = document.getElementById('draftStatusIndicator');
    if (indicator) indicator.style.display = localStorage.getItem(DRAFT_KEYS.BALANCING) ? 'flex' : 'none';
}
