// js/utils/format.js
// ============================================
// FORMATTING UTILITIES
// Pembantu untuk format angka, tanggal, string, pesan WhatsApp, dll.
// Semua output diformat sesuai standar Indonesia (pemisah ribuan titik, desimal koma)
// ============================================

/**
 * Format angka dengan pemisah ribuan (Indonesia style: 1.234,56)
 * @param {number|string} num - Angka yang akan diformat
 * @param {number} [decimals=2] - Jumlah desimal
 * @param {boolean} [forceDecimals=false] - Paksa tampilkan desimal meski 0
 * @returns {string} String yang sudah diformat atau '-' jika invalid
 */
export function formatNumber(num, decimals = 2, forceDecimals = false) {
  if (num === undefined || num === null || isNaN(num)) return '-';

  const parsed = parseFloat(num);
  if (isNaN(parsed)) return '-';

  return parsed.toLocaleString('id-ID', {
    minimumFractionDigits: forceDecimals ? decimals : 0,
    maximumFractionDigits: decimals
  });
}

/**
 * Format angka bulat (tanpa desimal)
 * @param {number|string} num
 * @returns {string}
 */
export function formatInteger(num) {
  return formatNumber(num, 0);
}

/**
 * Format angka dengan satuan (MW, t/h, kg/cm², °C, dll)
 * @param {number|string} value
 * @param {string} unit - satuan (misal: 'MW', 't/h', 'kg/cm²')
 * @param {number} [decimals=2]
 * @returns {string} Contoh: "1.234,56 MW"
 */
export function formatWithUnit(value, unit = '', decimals = 2) {
  const numStr = formatNumber(value, decimals);
  return unit ? `${numStr} ${unit}` : numStr;
}

/**
 * Format tanggal ke format Indonesia: 22 Maret 2026
 * @param {string|Date} dateInput - ISO string atau objek Date
 * @returns {string}
 */
export function formatDateID(dateInput) {
  if (!dateInput) return '-';

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Format tanggal + jam: 22 Maret 2026 16:21
 * @param {string|Date} dateInput
 * @returns {string}
 */
export function formatDateTimeID(dateInput) {
  if (!dateInput) return '-';

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '-';

  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Format jam saja: 16:21
 * @param {string|Date} dateInput
 * @returns {string}
 */
export function formatTime(dateInput) {
  if (!dateInput) return '--:--';

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '--:--';

  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Format pesan WhatsApp untuk Balancing (versi reusable)
 * @param {Object} data - objek data balancing lengkap
 * @returns {string} Pesan WhatsApp yang sudah diformat
 */
export function formatBalancingWhatsApp(data) {
  const fmt = (val, dec = 2) => formatNumber(val, dec);
  const fmtInt = (val) => formatInteger(val);

  const tglParts = (data.Tanggal || '').split('-');
  const bulan = {
    '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
    '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
    '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember'
  };
  const tglIndo = tglParts[2] ? `${tglParts[2]} ${bulan[tglParts[1]]} ${tglParts[0]}` : '-';

  let msg = `*Update STG 17,5 MW*\n`;
  msg += `Tgl ${tglIndo}\n`;
  msg += `Jam ${data.Jam || '--:--'}\n\n`;

  msg += `*Output Power STG 17,5*\n`;
  msg += `⠂ Load = ${fmt(data.Load_MW)} MW\n`;
  msg += `⠂ ${data.Ekspor_Impor_Status || 'Netral'} = ${fmt(Math.abs(data.Ekspor_Impor_MW || 0), 3)} MW\n\n`;

  msg += `*Balance Power SCADA*\n`;
  msg += `⠂ PLN = ${fmt(data.PLN_MW)} MW\n`;
  msg += `⠂ UBB = ${fmt(data.UBB_MW)} MW\n`;
  msg += `⠂ PIE = ${fmt(data.PIE_MW)} MW\n`;
  msg += `⠂ TG-65 = ${fmt(data.TG65_MW)} MW\n`;
  msg += `⠂ TG-66 = ${fmt(data.TG66_MW)} MW\n`;
  msg += `⠂ GTG = ${fmt(data.GTG_MW)} MW\n\n`;

  msg += `*Konsumsi Power 3B*\n`;
  msg += `● SS-6500 (TR-Main 01) = ${fmt(data.SS6500_MW, 3)} MW\n`;
  msg += `● SS-2000 *Via ${data.SS2000_Via || 'TR-Main01'}*\n`;
  msg += `  ⠂ Active power = ${fmt(data.Active_Power_MW, 3)} MW\n`;
  msg += `  ⠂ Reactive power = ${fmt(data.Reactive_Power_MVAR, 3)} MVAR\n`;
  msg += `  ⠂ Current S = ${fmt(data.Current_S_A, 1)} A\n`;
  msg += `  ⠂ Voltage = ${fmtInt(data.Voltage_V)} V\n`;
  msg += `  ⠂ (HVS65 L02) = ${fmt(data.HVS65_L02_MW, 3)} MW (${fmtInt(data.HVS65_L02_Current_A)} A)\n`;
  msg += `● Total 3B = ${fmt(data.Total_3B_MW, 3)} MW\n\n`;

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

  msg += `*${data.LPS_Balance_Status || 'Balance LPS'}* = ${fmt(data['LPS_Balance_t/h'], 1)} t/h\n\n`;

  msg += `*Monitoring*\n`;
  msg += `⠂ Steam Extraction PI-6122 = ${fmt(data['PI6122_kg/cm2'], 2)} kg/cm² & TI-6112 = ${fmt(data['TI6112_C'], 1)} °C\n`;
  msg += `⠂ Temp. Cooling Air Inlet (TI-6146/47) = ${fmt(data['TI6146_C'], 2)} °C\n`;
  msg += `⠂ Temp. Lube Oil (TI-6126) = ${fmt(data['TI6126_C'], 2)} °C\n`;
  msg += `⠂ Axial Displacement = ${fmt(data['Axial_Displacement_mm'], 2)} mm (High : 0,6 mm)\n`;
  msg += `⠂ Vibrasi VI-6102 = ${fmt(data['VI6102_μm'], 2)} μm (High : 85 μm)\n`;
  msg += `⠂ Temp. Journal Bearing TE-6134 = ${fmt(data['TE6134_C'], 1)} °C (High : 115 °C)\n`;
  msg += `⠂ CT SU = Fan : ${fmtInt(data['CT_SU_Fan'])} & Pompa : ${fmtInt(data['CT_SU_Pompa'])}\n`;
  msg += `⠂ CT SA = Fan : ${fmtInt(data['CT_SA_Fan'])} & Pompa : ${fmtInt(data['CT_SA_Pompa'])}\n\n`;

  msg += `*Kegiatan Shift ${data.Shift || '-' }*\n`;
  msg += data.Kegiatan_Shift || '-';

  return msg;
}

/**
 * Truncate teks panjang dengan ellipsis
 * @param {string} str
 * @param {number} maxLength
 * @returns {string}
 */
export function truncate(str, maxLength = 100) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Capitalize kata pertama setiap kata
 * @param {string} str
 * @returns {string}
 */
export function capitalizeWords(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format label parameter (hapus bagian dalam kurung jika perlu)
 * @param {string} fullLabel - contoh: "PI-6114 MPS Inlet (kg/cm2)"
 * @param {boolean} [keepUnit=true]
 * @returns {string}
 */
export function formatParamLabel(fullLabel, keepUnit = true) {
  if (!fullLabel) return '';
  
  if (keepUnit) return fullLabel;
  
  // Hapus bagian dalam kurung
  return fullLabel.replace(/\s*\([^)]*\)$/, '').trim();
}

/**
 * Format shift number menjadi teks
 * @param {number} shift
 * @returns {string}
 */
export function formatShift(shift) {
  const shiftNames = { 1: 'I', 2: 'II', 3: 'III' };
  return shiftNames[shift] || `Shift ${shift}`;
}

// ============================================
// Export semua fungsi
// ============================================

export default {
  formatNumber,
  formatInteger,
  formatWithUnit,
  formatDateID,
  formatDateTimeID,
  formatTime,
  formatBalancingWhatsApp,
  truncate,
  capitalizeWords,
  formatParamLabel,
  formatShift
};
