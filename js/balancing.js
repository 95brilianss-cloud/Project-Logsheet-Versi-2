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
        loadLastBalancingData(); 
    }
    
    calculateLPBalance();
    setupBalancingAutoSave();
    setTimeout(updateDraftStatusIndicator, 100);
}

function detectShift() {
    const now = new Date();
    const hour = now.getHours();
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
// 2. FETCH LAST DATA (JSONP METHOD)
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

            if (balancingTimeLabel) balancingTimeLabel.textContent = lastDataFetch._lastTime || '--:--';
            if (balancingDateLabel) balancingDateLabel.textContent = lastDataFetch['Tanggal'] || '--/--/----';

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

            const eksporEl = document.getElementById('eksporMW');
            if (eksporEl && eksporEl.value) handleEksporInput(eksporEl);

            updateStatusIndicator(true);
            calculateLPBalance();
            saveBalancingDraft();
            showCustomAlert('✓ Data terakhir berhasil dimuat.', 'success');
        } else {
            setDefaultDateTime();
        }
        cleanupJSONP(callbackName);
    };

    const script = document.createElement('script');
    script.src = `${GAS_URL}?action=getLastBalancing&callback=${callbackName}&t=${Date.now()}`;
    script.onerror = () => {
        if (loader) loader.style.display = 'none';
        setDefaultDateTime();
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
    BALANCING_FIELDS.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) element.value = '';
    });
    
    setDefaultDateTime(); 
    
    const eksporEl = document.getElementById('eksporMW');
    if (eksporEl) handleEksporInput(eksporEl);
    
    calculateLPBalance();
    showCustomAlert('Form berhasil direset!', 'success');
}

// ============================================
// 4. CALCULATIONS & UI HANDLERS
// ============================================

function handleEksporInput(input) {
    const label = document.getElementById('eksporLabel');
    const hint = document.getElementById('eksporHint');
    let value = parseFloat(input.value);
    
    if (isNaN(value) || input.value === '') {
        if (label) { label.textContent = 'Ekspor/Impor (MW)'; label.style.color = '#94a3b8'; }
        if (hint) { hint.innerHTML = '💡 <strong>Minus (-) = Ekspor</strong> | <strong>Plus (+) = Impor</strong>'; hint.style.color = '#94a3b8'; }
        input.style.borderColor = 'rgba(148, 163, 184, 0.2)';
        input.style.background = 'rgba(15, 23, 42, 0.6)';
        input.setAttribute('data-state', '');
        return;
    }
    
    if (value < 0) {
        if (label) { label.textContent = 'Ekspor (MW)'; label.style.color = '#10b981'; }
        if (hint) { hint.innerHTML = '✓ Posisi: <strong>Ekspor ke Grid</strong>'; hint.style.color = '#10b981'; }
        input.style.borderColor = '#10b981';
        input.style.background = 'rgba(16, 185, 129, 0.05)';
        input.setAttribute('data-state', 'ekspor');
    } else {
        if (label) { label.textContent = 'Impor (MW)'; label.style.color = '#f59e0b'; }
        if (hint) { hint.innerHTML = '✓ Posisi: <strong>Impor dari Grid</strong>'; hint.style.color = '#f59e0b'; }
        input.style.borderColor = '#f59e0b';
        input.style.background = 'rgba(245, 158, 11, 0.05)';
        input.setAttribute('data-state', 'impor');
    }
}

function getEksporImporValue() {
    const input = document.getElementById('eksporMW');
    if (!input || !input.value) return 0;
    const value = parseFloat(input.value);
    return isNaN(value) ? 0 : value;
}

function calculateLPBalance() {
    const produksi = parseFloat(document.getElementById('fq1105')?.value) || 0;
    const ids = ['stgSteam', 'pa2Steam', 'puri2Steam', 'deaeratorSteam', 'dumpCondenser', 'pcv6105', 'melterSA2', 'ejectorSteam', 'glandSealSteam'];
    
    let totalKonsumsi = 0;
    ids.forEach(id => { totalKonsumsi += parseFloat(document.getElementById(id)?.value) || 0; });
    
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
    setInterval(() => { if (hasBalancingData()) saveBalancingDraft(); }, 10000);
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
    return BALANCING_FIELDS.some(id => {
        const el = document.getElementById(id);
        return el && el.value !== '' && id !== 'balancingDate' && id !== 'balancingTime';
    });
}

function clearBalancingDraft() {
    localStorage.removeItem(DRAFT_KEYS.BALANCING);
    updateDraftStatusIndicator();
}

function updateDraftStatusIndicator() {
    const indicator = document.getElementById('draftStatusIndicator');
    if (indicator) indicator.style.display = localStorage.getItem(DRAFT_KEYS.BALANCING) ? 'flex' : 'none';
}

// ============================================
// 5. SUBMIT DATA & WHATSAPP FORMAT
// ============================================

function formatWhatsAppMessage(data) {
    const tglParts = data.Tanggal.split('-');
    const tglIndo = `${tglParts[2]}-${tglParts[1]}-${tglParts[0]}`;
    
    let message = `*Update STG 17,5 MW*\n`;
    message += `Tgl ${tglIndo} Jam ${data.Jam}\n\n`;
    message += `*Output Power*\n`;
    message += `⠂ Load = ${data.Load_MW} MW\n`;
    message += `⠂ ${data.Ekspor_Impor_Status} = ${Math.abs(data.Ekspor_Impor_MW)} MW\n\n`;
    message += `*Steam Balance*\n`;
    message += `⠂ FQ-1105 = ${data['Produksi_Steam_SA_t/h']} t/h\n`;
    message += `⠂ Total Konsumsi = ${data['Total_Konsumsi_Steam_t/h']} t/h\n`;
    message += `*${data.LPS_Balance_Status}* = ${data['LPS_Balance_t/h']} t/h\n\n`;
    message += `*Kegiatan Shift ${data.Shift}*\n`;
    message += data.Kegiatan_Shift || '-';
    
    return message;
}

async function submitBalancingData() {
    if (!requireAuth()) return;
    const progress = showUploadProgress('Mengirim Data Balancing...');
    
    const lpBalance = calculateLPBalance();
    const eksporValue = getEksporImporValue();
    
    const balancingData = {
        type: 'BALANCING',
        Operator: currentUser ? currentUser.name : 'Unknown',
        Tanggal: document.getElementById('balancingDate')?.value || '',
        Jam: document.getElementById('balancingTime')?.value || '',
        Shift: currentShift,
        'Load_MW': parseFloat(document.getElementById('loadMW')?.value) || 0,
        'Ekspor_Impor_MW': eksporValue,
        'Ekspor_Impor_Status': eksporValue > 0 ? 'Impor' : (eksporValue < 0 ? 'Ekspor' : 'Netral'),
        'PLN_MW': parseFloat(document.getElementById('plnMW')?.value) || 0,
        'UBB_MW': parseFloat(document.getElementById('ubbMW')?.value) || 0,
        'PIE_MW': parseFloat(document.getElementById('pieMW')?.value) || 0,
        'GTG_MW': parseFloat(document.getElementById('gtgMW')?.value) || 0,
        'Produksi_Steam_SA_t/h': parseFloat(document.getElementById('fq1105')?.value) || 0,
        'Total_Konsumsi_Steam_t/h': parseFloat(document.getElementById('totalKonsumsiSteam')?.textContent) || 0,
        'LPS_Balance_t/h': Math.abs(lpBalance),
        'LPS_Balance_Status': lpBalance < 0 ? 'Impor dari 3A' : 'Ekspor ke 3A',
        'Kegiatan_Shift': document.getElementById('kegiatanShift')?.value || ''
    };
    
    try {
        await fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(balancingData)
        });
        
        progress.complete();
        showCustomAlert('✓ Data Balancing berhasil dikirim!', 'success');
        clearBalancingDraft();
        
        setTimeout(() => {
            const waMessage = encodeURIComponent(formatWhatsAppMessage(balancingData));
            window.open(`https://wa.me/6281382160345?text=${waMessage}`, '_blank');
            navigateTo('homeScreen');
        }, 1000);
    } catch (error) {
        progress.error();
        showCustomAlert('Gagal mengirim ke server.', 'error');
    }
}
