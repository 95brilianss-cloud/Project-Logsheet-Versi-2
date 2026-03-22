// js/balancing/balancing.js
// ============================================
// BALANCING POWER - CORE LOGIC
// Form handling, LP Steam balance calculation, WhatsApp formatting, submit
// ============================================

import { 
  BALANCING_FIELDS,
  DRAFT_KEYS,
  GAS_URL 
} from '../config/constants.js';

import { 
  saveBalancingDraft, 
  loadBalancingDraft, 
  clearBalancingDraft, 
  addToBalancingHistory 
} from '../utils/storage.js';

import { 
  showCustomAlert, 
  showUploadProgress, 
  navigateTo 
} from '../utils/ui.js';

import { getCurrentUser, requireAuth } from '../utils/auth.js';

// ============================================
// State & Konstanta Lokal
// ============================================

let balancingAutoSaveInterval = null;

// Field yang wajib diisi minimal
const REQUIRED_FIELDS = ['loadMW', 'fq1105', 'stgSteam'];

// ============================================
// Inisialisasi Halaman Balancing
// ============================================

export function initBalancingScreen() {
  if (!requireAuth()) return;

  loadLastBalancingData();
  setupBalancingListeners();

  // Auto-save draft setiap 30 detik jika ada perubahan
  if (!balancingAutoSaveInterval) {
    balancingAutoSaveInterval = setInterval(() => {
      if (hasBalancingChanges()) {
        saveBalancingDraft(getCurrentBalancingData());
      }
    }, 30000);
  }

  calculateLPBalance(); // hitung awal
}

// ============================================
// Load Data Terakhir (dari spreadsheet atau draft)
// ============================================

function loadLastBalancingData() {
  const loader = document.getElementById('balancingLoader');
  if (loader) loader.style.display = 'flex';

  // Prioritas: draft lokal dulu (jika ada perubahan belum tersimpan)
  const draft = loadBalancingDraft();
  if (draft && Object.keys(draft).length > 0) {
    fillBalancingForm(draft, 'draft');
    if (loader) loader.style.display = 'none';
    showCustomAlert('Draft balancing terakhir dimuat.', 'info');
    return;
  }

  // Jika tidak ada draft → ambil dari server
  const callbackName = 'jsonp_balancing_' + Date.now();
  const timeout = setTimeout(() => {
    setDefaultDateTime();
    if (loader) loader.style.display = 'none';
  }, 8000);

  window[callbackName] = (data) => {
    clearTimeout(timeout);
    if (data && Object.keys(data).length > 0) {
      fillBalancingForm(data, 'spreadsheet');
    } else {
      setDefaultDateTime();
    }
    if (loader) loader.style.display = 'none';
  };

  const script = document.createElement('script');
  script.src = `${GAS_URL}?action=getLastBalancing&callback=${callbackName}`;
  script.onerror = () => {
    clearTimeout(timeout);
    setDefaultDateTime();
    if (loader) loader.style.display = 'none';
  };
  document.body.appendChild(script);
}

function fillBalancingForm(data, source = 'unknown') {
  const fieldMapping = {
    balancingDate: data.Tanggal,
    balancingTime: data.Jam,
    loadMW: data.Load_MW,
    eksporMW: data.Ekspor_Impor_MW,
    plnMW: data.PLN_MW,
    ubbMW: data.UBB_MW,
    pieMW: data.PIE_MW,
    tg65MW: data.TG65_MW,
    tg66MW: data.TG66_MW,
    gtgMW: data.GTG_MW,
    ss6500MW: data.SS6500_MW,
    ss2000Via: data.SS2000_Via,
    activePowerMW: data.Active_Power_MW,
    reactivePowerMVAR: data.Reactive_Power_MVAR,
    currentS: data.Current_S_A,
    voltageV: data.Voltage_V,
    hvs65l02MW: data.HVS65_L02_MW,
    hvs65l02Current: data.HVS65_L02_Current_A,
    total3BMW: data.Total_3B_MW,
    fq1105: data['Produksi_Steam_SA_t/h'],
    stgSteam: data['STG_Steam_t/h'],
    pa2Steam: data['PA2_Steam_t/h'],
    puri2Steam: data['Puri2_Steam_t/h'],
    melterSA2: data['Melter_SA2_t/h'],
    ejectorSteam: data['Ejector_t/h'],
    glandSealSteam: data['Gland_Seal_t/h'],
    deaeratorSteam: data['Deaerator_t/h'],
    dumpCondenser: data['Dump_Condenser_t/h'],
    pcv6105: data['PCV6105_t/h'],
    pi6122: data['PI6122_kg/cm2'],
    ti6112: data['TI6112_C'],
    ti6146: data['TI6146_C'],
    ti6126: data['TI6126_C'],
    axialDisplacement: data['Axial_Displacement_mm'],
    vi6102: data['VI6102_μm'],
    te6134: data['TE6134_C'],
    ctSuFan: data['CT_SU_Fan'],
    ctSuPompa: data['CT_SU_Pompa'],
    ctSaFan: data['CT_SA_Fan'],
    ctSaPompa: data['CT_SA_Pompa'],
    kegiatanShift: data.Kegiatan_Shift
  };

  BALANCING_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (el && fieldMapping[id] !== undefined && fieldMapping[id] !== null) {
      el.value = fieldMapping[id];
    }
  });

  // Trigger perhitungan & visual
  const eksporEl = document.getElementById('eksporMW');
  if (eksporEl && eksporEl.value) handleEksporInput(eksporEl);

  calculateLPBalance();
  saveBalancingDraft(getCurrentBalancingData());

  const msg = source === 'spreadsheet' 
    ? '✓ Data balancing terakhir dari server dimuat.'
    : '✓ Draft balancing lokal dimuat.';
  
  showCustomAlert(msg, 'success');
}

function setDefaultDateTime() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().slice(0,5);

  document.getElementById('balancingDate')?.setAttribute('value', dateStr);
  document.getElementById('balancingTime')?.setAttribute('value', timeStr);
}

// ============================================
// Event Listeners khusus Balancing
// ============================================

function setupBalancingListeners() {
  // Input Ekspor/Impor → ubah label & warna
  const eksporInput = document.getElementById('eksporMW');
  if (eksporInput) {
    eksporInput.addEventListener('input', () => handleEksporInput(eksporInput));
  }

  // Hitung ulang balance LPS setiap kali field steam berubah
  const steamFields = ['fq1105','stgSteam','pa2Steam','puri2Steam','melterSA2',
                       'ejectorSteam','glandSealSteam','deaeratorSteam',
                       'dumpCondenser','pcv6105'];

  steamFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', calculateLPBalance);
    }
  });

  // Reset form
  const resetBtn = document.getElementById('balancingResetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetBalancingForm);
  }
}

// ============================================
// Visual & Perhitungan Ekspor/Impor
// ============================================

function handleEksporInput(input) {
  const label = document.getElementById('eksporLabel');
  const hint = document.getElementById('eksporHint');
  const value = parseFloat(input.value) || 0;

  if (isNaN(value) || input.value === '') {
    if (label) {
      label.textContent = 'Ekspor/Impor (MW)';
      label.style.color = '#94a3b8';
    }
    if (hint) {
      hint.innerHTML = '💡 <strong>Minus (-) = Ekspor</strong> | <strong>Plus (+) = Impor</strong>';
      hint.style.color = '#94a3b8';
    }
    input.style.borderColor = 'rgba(148,163,184,0.2)';
    input.style.background = 'rgba(15,23,42,0.6)';
    input.setAttribute('data-state', '');
    return;
  }

  if (value < 0) {
    label.textContent = 'Ekspor (MW)';
    label.style.color = '#10b981';
    hint.innerHTML = '✓ Posisi: <strong>Ekspor ke Grid</strong> (Nilai negatif)';
    hint.style.color = '#10b981';
    input.style.borderColor = '#10b981';
    input.style.background = 'rgba(16,185,129,0.05)';
    input.setAttribute('data-state', 'ekspor');
  } else if (value > 0) {
    label.textContent = 'Impor (MW)';
    label.style.color = '#f59e0b';
    hint.innerHTML = '✓ Posisi: <strong>Impor dari Grid</strong> (Nilai positif)';
    hint.style.color = '#f59e0b';
    input.style.borderColor = '#f59e0b';
    input.style.background = 'rgba(245,158,11,0.05)';
    input.setAttribute('data-state', 'impor');
  } else {
    label.textContent = 'Ekspor/Impor (MW)';
    label.style.color = '#94a3b8';
    hint.innerHTML = '⚪ Posisi: <strong>Netral</strong> (Nilai 0)';
    hint.style.color = '#64748b';
    input.style.borderColor = 'rgba(148,163,184,0.2)';
    input.style.background = 'rgba(15,23,42,0.6)';
    input.setAttribute('data-state', '');
  }
}

function getEksporImporValue() {
  const input = document.getElementById('eksporMW');
  if (!input || !input.value) return 0;
  const val = parseFloat(input.value);
  return isNaN(val) ? 0 : val;
}

// ============================================
// Perhitungan Balance LPS
// ============================================

export function calculateLPBalance() {
  const produksi = parseFloat(document.getElementById('fq1105')?.value) || 0;

  const konsumsiItems = [
    'stgSteam', 'pa2Steam', 'puri2Steam', 'deaeratorSteam',
    'dumpCondenser', 'pcv6105', 'melterSA2', 'ejectorSteam', 'glandSealSteam'
  ];

  let totalKonsumsi = 0;
  konsumsiItems.forEach(id => {
    totalKonsumsi += parseFloat(document.getElementById(id)?.value) || 0;
  });

  document.getElementById('totalKonsumsiSteam')?.textContent = totalKonsumsi.toFixed(1) + ' t/h';

  const balance = produksi - totalKonsumsi;
  const absBalance = Math.abs(balance);

  const balanceInput = document.getElementById('lpBalanceValue');
  if (balanceInput) balanceInput.value = absBalance.toFixed(1);

  const label = document.getElementById('lpBalanceLabel');
  const status = document.getElementById('lpBalanceStatus');
  const field = document.getElementById('lpBalanceField');

  if (balance < 0) {
    if (label) label.textContent = 'LPS Impor dari SU 3A (t/h)';
    if (status) {
      status.textContent = 'Posisi: Impor dari 3A (Produksi < Konsumsi)';
      status.style.color = '#f59e0b';
    }
    if (balanceInput) {
      balanceInput.style.borderColor = '#f59e0b';
      balanceInput.style.color = '#f59e0b';
      balanceInput.style.background = 'rgba(245,158,11,0.1)';
    }
    if (field) {
      field.style.borderColor = 'rgba(245,158,11,0.3)';
      field.style.background = 'rgba(245,158,11,0.05)';
    }
  } else {
    if (label) label.textContent = 'LPS Ekspor ke SU 3A (t/h)';
    if (status) {
      status.textContent = 'Posisi: Ekspor ke 3A (Produksi > Konsumsi)';
      status.style.color = '#10b981';
    }
    if (balanceInput) {
      balanceInput.style.borderColor = '#10b981';
      balanceInput.style.color = '#10b981';
      balanceInput.style.background = 'rgba(16,185,129,0.1)';
    }
    if (field) {
      field.style.borderColor = 'rgba(16,185,129,0.3)';
      field.style.background = 'rgba(16,185,129,0.05)';
    }
  }

  return balance;
}

// ============================================
// Format Pesan WhatsApp
// ============================================

function formatWhatsAppMessage(data) {
  const fmt = (num, decimals = 2) => {
    if (num === undefined || num === null || isNaN(num)) return '-';
    return Number(num).toLocaleString('id-ID', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const fmtInt = num => isNaN(num) ? '-' : Number(num).toLocaleString('id-ID');

  const tglParts = data.Tanggal.split('-');
  const bulan = {
    '01':'Januari','02':'Februari','03':'Maret','04':'April',
    '05':'Mei','06':'Juni','07':'Juli','08':'Agustus',
    '09':'September','10':'Oktober','11':'November','12':'Desember'
  };
  const tglIndo = `${tglParts[2]} ${bulan[tglParts[1]]} ${tglParts[0]}`;

  let msg = `*Update STG 17,5 MW*\n`;
  msg += `Tgl ${tglIndo}\n`;
  msg += `Jam ${data.Jam}\n\n`;

  msg += `*Output Power STG 17,5*\n`;
  msg += `⠂ Load = ${fmt(data.Load_MW)} MW\n`;
  msg += `⠂ ${data.Ekspor_Impor_Status} = ${fmt(Math.abs(data.Ekspor_Impor_MW), 3)} MW\n\n`;

  msg += `*Balance Power SCADA*\n`;
  msg += `⠂ PLN = ${fmt(data.PLN_MW)}MW\n`;
  msg += `⠂ UBB = ${fmt(data.UBB_MW)}MW\n`;
  msg += `⠂ PIE = ${fmt(data.PIE_MW)} MW\n`;
  msg += `⠂ TG-65 = ${fmt(data.TG65_MW)} MW\n`;
  msg += `⠂ TG-66 = ${fmt(data.TG66_MW)} MW\n`;
  msg += `⠂ GTG = ${fmt(data.GTG_MW)} MW\n\n`;

  msg += `*Konsumsi Power 3B*\n`;
  msg += `● SS-6500 (TR-Main 01) = ${fmt(data.SS6500_MW, 3)} MW\n`;
  msg += `● SS-2000 *Via ${data.SS2000_Via}*\n`;
  msg += `  ⠂ Active power = ${fmt(data.Active_Power_MW, 3)} MW\n`;
  msg += `  ⠂ Reactive power = ${fmt(data.Reactive_Power_MVAR, 3)} MVAR\n`;
  msg += `  ⠂ Current S = ${fmt(data.Current_S_A, 1)} A\n`;
  msg += `  ⠂ Voltage = ${fmtInt(data.Voltage_V)} V\n`;
  msg += `  ⠂ (HVS65 L02) = ${fmt(data.HVS65_L02_MW, 3)} MW (${fmtInt(data.HVS65_L02_Current_A)} A)\n`;
  msg += `● Total 3B = ${fmt(data.Total_3B_MW, 3)}MW\n\n`;

  msg += `*Produksi Steam SA*\n`;
  msg += `⠂ FQ-1105 = ${fmt(data['Produksi_Steam_SA_t/h'], 1)} t/h\n\n`;

  msg += `*Konsumsi Steam 3B*\n`;
  msg += `⠂ STG 17,5 = ${fmt(data['STG_Steam_t/h'], 1)} t/h\n`;
  msg += `⠂ PA2 = ${fmt(data['PA2_Steam_t/h'], 1)} t/h\n`;
  msg += `⠂ Puri2 = ${fmt(data['Puri2_Steam_t/h'], 1)} t/h\n`;
  msg += `⠂ Melter SA2 = ${fmt(data['Melter_SA2_t/h'], 1)} t/h\n`;
  msg += `⠂ Ejector = ${fmt(data['Ejector_t/h'], 1)} t/h\n`;
  msg += `⠂ Gland Seal = ${fmt(data['Gland_Seal_t/h'], 1)} t/h\n`;
  msg += `⠂ Deaerator = ${fmt(data['Deaerator_t/h'], 1)} t/h\n`;
  msg += `⠂ Dump Condenser = ${fmt(data['Dump_Condenser_t/h'], 1)} t/h\n`;
  msg += `⠂ PCV-6105 = ${fmt(data['PCV6105_t/h'], 1)} t/h\n`;
  msg += `*⠂ Total Konsumsi* = ${fmt(data['Total_Konsumsi_Steam_t/h'], 1)} t/h\n\n`;

  msg += `*${data.LPS_Balance_Status}* = ${fmt(data['LPS_Balance_t/h'], 1)} t/h\n\n`;

  msg += `*Monitoring*\n`;
  msg += `⠂ Steam Extraction PI-6122 = ${fmt(data['PI6122_kg/cm2'], 2)} kg/cm² & TI-6112 = ${fmt(data['TI6112_C'], 1)} °C\n`;
  msg += `⠂ Temp. Cooling Air Inlet (TI-6146/47) = ${fmt(data['TI6146_C'], 2)} °C\n`;
  msg += `⠂ Temp. Lube Oil (TI-6126) = ${fmt(data['TI6126_C'], 2)} °C\n`;
  msg += `⠂ Axial Displacement = ${fmt(data['Axial_Displacement_mm'], 2)} mm (High : 0,6 mm)\n`;
  msg += `⠂ Vibrasi VI-6102 = ${fmt(data['VI6102_μm'], 2)} μm (High : 85 μm)\n`;
  msg += `⠂ Temp. Journal Bearing TE-6134 = ${fmt(data['TE6134_C'], 1)} °C (High : 115 °C)\n`;
  msg += `⠂ CT SU = Fan : ${fmtInt(data['CT_SU_Fan'])} & Pompa : ${fmtInt(data['CT_SU_Pompa'])}\n`;
  msg += `⠂ CT SA = Fan : ${fmtInt(data['CT_SA_Fan'])} & Pompa : ${fmtInt(data['CT_SA_Pompa'])}\n\n`;

  msg += `*Kegiatan Shift ${data.Shift}*\n`;
  msg += data.Kegiatan_Shift || '-';

  return msg;
}

// ============================================
// Submit Balancing
// ============================================

export async function submitBalancingData() {
  if (!requireAuth()) return;

  // Validasi minimal
  for (const id of REQUIRED_FIELDS) {
    const el = document.getElementById(id);
    if (!el || !el.value.trim()) {
      showCustomAlert(`Field ${id} wajib diisi!`, 'error');
      el?.focus();
      return;
    }
  }

  const progress = showUploadProgress('Mengirim Data Balancing...');

  const eksporValue = getEksporImporValue();
  const lpBalance = calculateLPBalance();

  const data = getCurrentBalancingData();
  data.Ekspor_Impor_MW = eksporValue;
  data.Ekspor_Impor_Status = eksporValue > 0 ? 'Impor' : (eksporValue < 0 ? 'Ekspor' : 'Netral');
  data.LPS_Balance_t_h = Math.abs(lpBalance);
  data.LPS_Balance_Status = lpBalance < 0 ? 'Impor dari 3A' : 'Ekspor ke 3A';
  data.Total_Konsumsi_Steam_t_h = parseFloat(document.getElementById('totalKonsumsiSteam')?.textContent) || 0;

  try {
    await fetch(GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'BALANCING',
        Operator: getCurrentUser()?.name || 'Unknown',
        Timestamp: new Date().toISOString(),
        ...data
      })
    });

    progress.complete();
    showCustomAlert('✓ Data Balancing berhasil dikirim!', 'success');

    // Simpan ke history lokal
    addToBalancingHistory(data);

    // Buka WhatsApp
    setTimeout(() => {
      const waMsg = encodeURIComponent(formatWhatsAppMessage(data));
      const waNumber = '6281382160345'; // ganti sesuai kebutuhan
      window.open(`https://wa.me/${waNumber}?text=${waMsg}`, '_blank');
      navigateTo('homeScreen');
    }, 1200);

  } catch (err) {
    console.error('[BALANCING] Submit gagal:', err);
    progress.error();

    // Simpan offline
    addToOfflineLogsheet({
      type: 'BALANCING_OFFLINE',
      ...data
    }, 'balancing');

    showCustomAlert('Gagal mengirim. Data disimpan lokal.', 'error');
  }
}

// ============================================
// Reset Form
// ============================================

export function resetBalancingForm() {
  if (!confirm('Yakin reset form? Semua data akan dihapus dan draft dibersihkan.')) {
    return;
  }

  clearBalancingDraft();

  BALANCING_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  ['ss2000Via','melterSA2','ejectorSteam','glandSealSteam'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.selectedIndex = 0;
  });

  const eksporEl = document.getElementById('eksporMW');
  if (eksporEl) {
    eksporEl.value = '';
    handleEksporInput(eksporEl);
  }

  calculateLPBalance();
  showCustomAlert('Form balancing berhasil direset.', 'success');
}

// ============================================
// Helper: Ambil semua data form saat ini
// ============================================

function getCurrentBalancingData() {
  const data = {};
  BALANCING_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      data[id] = el.value.trim();
    }
  });

  // Tambahan field yang dihitung
  data.Tanggal = document.getElementById('balancingDate')?.value || '';
  data.Jam = document.getElementById('balancingTime')?.value || '';
  data.Shift = 3; // atau ambil dari state global currentShift

  return data;
}

function hasBalancingChanges() {
  const draft = loadBalancingDraft() || {};
  const current = getCurrentBalancingData();

  return JSON.stringify(draft) !== JSON.stringify(current);
}

// ============================================
// Export fungsi utama
// ============================================

export {
  initBalancingScreen,
  submitBalancingData,
  resetBalancingForm,
  calculateLPBalance,
  handleEksporInput
};
