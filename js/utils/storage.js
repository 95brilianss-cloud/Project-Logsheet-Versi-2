// js/utils/storage.js
// ============================================
// LOCALSTORAGE, DRAFT, SESSION, CACHE MANAGEMENT
// ============================================

import { 
  AUTH_CONFIG, 
  DRAFT_KEYS, 
  DRAFT_KEYS_CT, 
  PHOTO_DRAFT_KEYS 
} from '../config/constants.js';

// ============================================
// Session Management
// ============================================

export function saveSession(user, rememberMe = false) {
  const duration = rememberMe 
    ? AUTH_CONFIG.REMEMBER_ME_DURATION 
    : AUTH_CONFIG.SESSION_DURATION;

  const session = {
    user: user,
    loginTime: Date.now(),
    expiresAt: Date.now() + duration,
    rememberMe: rememberMe
  };

  try {
    localStorage.setItem(AUTH_CONFIG.SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(user));
    console.log('[STORAGE] Session disimpan hingga:', new Date(session.expiresAt).toLocaleString());
  } catch (err) {
    console.error('[STORAGE] Gagal menyimpan session:', err);
  }
}

export function getSession() {
  try {
    const sessionData = localStorage.getItem(AUTH_CONFIG.SESSION_KEY);
    return sessionData ? JSON.parse(sessionData) : null;
  } catch (err) {
    console.error('[STORAGE] Gagal membaca session:', err);
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(AUTH_CONFIG.SESSION_KEY);
  localStorage.removeItem(AUTH_CONFIG.USER_KEY);
  console.log('[STORAGE] Session dihapus');
}

// ============================================
// Users Cache (untuk offline login)
// ============================================

export function loadUsersCache() {
  try {
    const cache = localStorage.getItem(AUTH_CONFIG.USERS_CACHE_KEY);
    return cache ? JSON.parse(cache) : null;
  } catch (err) {
    console.error('[STORAGE] Gagal membaca users cache:', err);
    return null;
  }
}

export function updateUsersCache(usersArray) {
  try {
    let cache = loadUsersCache() || {};

    usersArray.forEach(user => {
      if (user && user.username != null) {
        const usernameStr = String(user.username).toLowerCase().trim();
        
        if (usernameStr) {
          cache[usernameStr] = {
            username: String(user.username),
            password: String(user.password || ''),
            role: String(user.role || 'operator'),
            name: String(user.name || user.username),
            department: String(user.department || 'Unit Utilitas 3B'),
            status: String(user.status || 'ACTIVE'),
            lastSync: new Date().toISOString()
          };
        }
      }
    });

    localStorage.setItem(AUTH_CONFIG.USERS_CACHE_KEY, JSON.stringify(cache));
    console.log('[STORAGE] Users cache diperbarui. Total:', Object.keys(cache).length);
  } catch (err) {
    console.error('[STORAGE] Gagal update users cache:', err);
  }
}

// ============================================
// Draft Logsheet (Turbine & CT)
// ============================================

export function saveTurbineDraft(data) {
  try {
    localStorage.setItem(DRAFT_KEYS.LOGSHEET, JSON.stringify(data));
    console.log('[STORAGE] Draft turbine disimpan');
  } catch (err) {
    console.error('[STORAGE] Gagal simpan draft turbine:', err);
  }
}

export function loadTurbineDraft() {
  try {
    const draft = localStorage.getItem(DRAFT_KEYS.LOGSHEET);
    return draft ? JSON.parse(draft) : {};
  } catch (err) {
    console.error('[STORAGE] Gagal load draft turbine:', err);
    return {};
  }
}

export function clearTurbineDraft() {
  localStorage.removeItem(DRAFT_KEYS.LOGSHEET);
  console.log('[STORAGE] Draft turbine dihapus');
}

export function saveCTDraft(data) {
  try {
    localStorage.setItem(DRAFT_KEYS_CT.LOGSHEET, JSON.stringify(data));
    console.log('[STORAGE] Draft CT disimpan');
  } catch (err) {
    console.error('[STORAGE] Gagal simpan draft CT:', err);
  }
}

export function loadCTDraft() {
  try {
    const draft = localStorage.getItem(DRAFT_KEYS_CT.LOGSHEET);
    return draft ? JSON.parse(draft) : {};
  } catch (err) {
    console.error('[STORAGE] Gagal load draft CT:', err);
    return {};
  }
}

export function clearCTDraft() {
  localStorage.removeItem(DRAFT_KEYS_CT.LOGSHEET);
  console.log('[STORAGE] Draft CT dihapus');
}

// ============================================
// Parameter Photo Draft (Turbine & CT)
// ============================================

export function saveParamPhotos(photos) {
  try {
    localStorage.setItem(PHOTO_DRAFT_KEYS.TURBINE, JSON.stringify(photos));
    console.log('[STORAGE] Draft foto parameter turbine disimpan');
  } catch (err) {
    console.error('[STORAGE] Gagal simpan foto draft turbine:', err);
  }
}

export function loadParamPhotos() {
  try {
    const photos = localStorage.getItem(PHOTO_DRAFT_KEYS.TURBINE);
    return photos ? JSON.parse(photos) : {};
  } catch (err) {
    console.error('[STORAGE] Gagal load foto draft turbine:', err);
    return {};
  }
}

export function clearParamPhotos() {
  localStorage.removeItem(PHOTO_DRAFT_KEYS.TURBINE);
}

export function saveCTParamPhotos(photos) {
  try {
    localStorage.setItem(PHOTO_DRAFT_KEYS.CT, JSON.stringify(photos));
    console.log('[STORAGE] Draft foto parameter CT disimpan');
  } catch (err) {
    console.error('[STORAGE] Gagal simpan foto draft CT:', err);
  }
}

export function loadCTParamPhotos() {
  try {
    const photos = localStorage.getItem(PHOTO_DRAFT_KEYS.CT);
    return photos ? JSON.parse(photos) : {};
  } catch (err) {
    console.error('[STORAGE] Gagal load foto draft CT:', err);
    return {};
  }
}

export function clearCTParamPhotos() {
  localStorage.removeItem(PHOTO_DRAFT_KEYS.CT);
}

// ============================================
// Balancing Draft & History
// ============================================

export function saveBalancingDraft(data) {
  try {
    localStorage.setItem(DRAFT_KEYS.BALANCING, JSON.stringify(data));
  } catch (err) {
    console.error('[STORAGE] Gagal simpan draft balancing:', err);
  }
}

export function loadBalancingDraft() {
  try {
    const draft = localStorage.getItem(DRAFT_KEYS.BALANCING);
    return draft ? JSON.parse(draft) : null;
  } catch (err) {
    console.error('[STORAGE] Gagal load draft balancing:', err);
    return null;
  }
}

export function clearBalancingDraft() {
  localStorage.removeItem(DRAFT_KEYS.BALANCING);
}

export function addToBalancingHistory(entry) {
  try {
    let history = JSON.parse(localStorage.getItem(DRAFT_KEYS.BALANCING_HISTORY) || '[]');
    history.push({
      ...entry,
      submittedAt: new Date().toISOString()
    });
    localStorage.setItem(DRAFT_KEYS.BALANCING_HISTORY, JSON.stringify(history));
  } catch (err) {
    console.error('[STORAGE] Gagal tambah ke balancing history:', err);
  }
}

// ============================================
// Offline Queue (untuk submit gagal)
// ============================================

export function addToOfflineLogsheet(data, type = 'turbine') {
  const key = type === 'ct' ? DRAFT_KEYS_CT.OFFLINE : DRAFT_KEYS.LOGSHEET_OFFLINE;
  try {
    let queue = JSON.parse(localStorage.getItem(key) || '[]');
    queue.push(data);
    localStorage.setItem(key, JSON.stringify(queue));
    console.log(`[STORAGE] Data offline ditambahkan ke queue (${type})`);
  } catch (err) {
    console.error('[STORAGE] Gagal tambah ke offline queue:', err);
  }
}

export function getOfflineLogsheet(type = 'turbine') {
  const key = type === 'ct' ? DRAFT_KEYS_CT.OFFLINE : DRAFT_KEYS.LOGSHEET_OFFLINE;
  try {
    const queue = localStorage.getItem(key);
    return queue ? JSON.parse(queue) : [];
  } catch (err) {
    console.error('[STORAGE] Gagal baca offline queue:', err);
    return [];
  }
}

export function clearOfflineLogsheet(type = 'turbine') {
  const key = type === 'ct' ? DRAFT_KEYS_CT.OFFLINE : DRAFT_KEYS.LOGSHEET_OFFLINE;
  localStorage.removeItem(key);
  console.log(`[STORAGE] Offline queue (${type}) dihapus`);
}

// ============================================
// Utility: Backup & Reset
// ============================================

export function backupCurrentDraft() {
  const turbineDraft = loadTurbineDraft();
  if (Object.keys(turbineDraft).length > 0) {
    localStorage.setItem(DRAFT_KEYS.LOGSHEET_BACKUP, JSON.stringify(turbineDraft));
  }
}

export function resetAllDrafts() {
  Object.values(DRAFT_KEYS).forEach(key => localStorage.removeItem(key));
  Object.values(DRAFT_KEYS_CT).forEach(key => localStorage.removeItem(key));
  Object.values(PHOTO_DRAFT_KEYS).forEach(key => localStorage.removeItem(key));
  console.warn('[STORAGE] Semua draft dan foto draft telah direset');
}

// ============================================
// Inisialisasi (opsional dipanggil saat app start)
// ============================================

export function initStorage() {
  // Bisa ditambahkan pengecekan integritas atau migrasi data di sini
  console.log('[STORAGE] LocalStorage handler diinisialisasi');
}
