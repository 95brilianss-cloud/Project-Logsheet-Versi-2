/**
 * ============================================================
 * TURBINE LOGSHEET PRO - UTILITIES MODULE
 * FILE: utils.gs (Helper Functions & Global Initializer)
 * ============================================================
 */

// ============================================================
// 1. RESPONSE HELPERS (JSON & JSONP)
// ============================================================

/**
 * Mengembalikan response dalam format JSON standar (digunakan oleh doPost)
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Mengembalikan response dalam format JSONP untuk membypass CORS (digunakan oleh doGet)
 */
function jsonpResponse(data, callback) {
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(data) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return jsonResponse(data);
}

// ============================================================
// 2. FORMATTING & PARSING HELPERS
// ============================================================

/**
 * Membersihkan nama file dari karakter ilegal agar aman disimpan di Google Drive
 */
function sanitizeFileName(name) {
  return String(name).replace(/[^a-zA-Z0-9\-_]/g, '_').substring(0, 50);
}

/**
 * Memformat objek Date menjadi string tanggal YYYY-MM-DD
 */
function formatDate(date) {
  if (!date) return '';
  return Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/**
 * Memformat objek Date menjadi string waktu HH:mm
 */
function formatTime(date) {
  if (!date) return '';
  return Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), 'HH:mm');
}

/**
 * Menentukan Shift operasional berdasarkan jam
 */
function getShift(date) {
  if (!date) return 3;
  const d = new Date(date);
  const hour = d.getHours();
  
  if (hour >= 7 && hour < 15) return 1;
  if (hour >= 15 && hour < 23) return 2;
  return 3;
}

// ============================================================
// 3. DRIVE FOLDER HELPERS
// ============================================================

/**
 * Mencari folder berdasarkan nama, jika tidak ada maka otomatis dibuat baru
 */
function getOrCreateFolder(parent, name) {
  const folders = parent.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parent.createFolder(name);
}

// ============================================================
// 4. SYSTEM AUDIT LOGGER
// ============================================================

/**
 * Mencatat aktivitas penting (Submit, Edit, Delete) ke sheet AUDIT_LOG
 */
function logAudit(action, operator, details) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('AUDIT_LOG');
    
    if (!sheet) {
      sheet = ss.insertSheet('AUDIT_LOG');
      sheet.appendRow(['Timestamp', 'Action', 'Operator', 'Details']);
      sheet.getRange("A1:D1").setFontWeight("bold").setBackground("#d9d2e9");
      sheet.setFrozenRows(1);
    }
    
    sheet.appendRow([
      new Date(),
      action,
      operator || 'System',
      typeof details === 'object' ? JSON.stringify(details) : details
    ]);
  } catch (e) {
    console.error('Audit log error:', e);
  }
}

// ============================================================
// 5. GLOBAL SPREADSHEET INITIALIZER (RUN ONCE)
// ============================================================

/**
 * FUNGSI SETUP AWAL:
 * Jalankan fungsi ini SEKALI SAJA secara manual dari editor Apps Script 
 * untuk membuat semua Sheet yang dibutuhkan secara otomatis.
 */
function initializeSpreadsheet() {
  console.log('=== INITIALIZING SPREADSHEET ===');
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ['LOGSHEET', 'LOGSHEET_CT', 'TPM', 'BALANCING', 'USERS', 'PHOTOS', 'AUDIT_LOG'];
  let createdCount = 0;
  
  sheets.forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      switch(sheetName) {
        case 'LOGSHEET':
          if (typeof createLogsheetSheet === 'function') createLogsheetSheet(ss);
          break;
        case 'LOGSHEET_CT':
          if (typeof createLogsheetCTSheet === 'function') createLogsheetCTSheet(ss);
          break;
        case 'TPM':
          if (typeof createTPMSheet === 'function') createTPMSheet(ss);
          break;
        case 'BALANCING':
          if (typeof createBalancingSheet === 'function') createBalancingSheet(ss);
          break;
        case 'USERS':
          // Membuat sheet USERS secara manual jika fungsi dari users.gs belum dieksekusi
          const userSheet = ss.insertSheet('USERS');
          userSheet.appendRow(['Timestamp', 'Username', 'Password', 'Name', 'Role', 'Department', 'Status']);
          userSheet.getRange("A1:G1").setFontWeight("bold").setBackground("#f4cccc");
          userSheet.setFrozenRows(1);
          break;
        case 'PHOTOS':
          if (typeof createPhotosSheet === 'function') createPhotosSheet(ss);
          break;
        case 'AUDIT_LOG':
          const auditSheet = ss.insertSheet('AUDIT_LOG');
          auditSheet.appendRow(['Timestamp', 'Action', 'Operator', 'Details']);
          auditSheet.getRange("A1:D1").setFontWeight("bold").setBackground("#d9d2e9");
          auditSheet.setFrozenRows(1);
          break;
      }
      console.log('Created:', sheetName);
      createdCount++;
    } else {
      console.log('Exists:', sheetName);
    }
  });
  
  const resultMsg = 'Setup Selesai! Berhasil membuat ' + createdCount + ' sheets baru.';
  console.log(resultMsg);
  return resultMsg;
}
