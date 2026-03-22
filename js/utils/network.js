// js/utils/network.js
// ============================================
// NETWORK UTILITIES
// Wrapper untuk komunikasi dengan Google Apps Script, JSONP cleanup,
// error handling, offline detection, dan request helpers
// ============================================

import { GAS_URL } from '../config/constants.js';
import { showCustomAlert } from './ui.js';

// ============================================
// Konstanta Network
// ============================================
const REQUEST_TIMEOUT = 12000; // 12 detik timeout default untuk JSONP & fetch

// ============================================
// JSONP Helper (karena GAS legacy masih pakai JSONP untuk GET)
// ============================================

export function jsonpRequest(params = {}, callbackNamePrefix = 'jsonp_') {
  return new Promise((resolve, reject) => {
    const callbackName = callbackNamePrefix + Date.now();
    const timeout = setTimeout(() => {
      cleanupJSONP(callbackName);
      reject(new Error('Request timeout'));
    }, REQUEST_TIMEOUT);

    window[callbackName] = (response) => {
      clearTimeout(timeout);
      cleanupJSONP(callbackName);
      
      if (response && response.success === false) {
        reject(new Error(response.error || 'Server returned error'));
      } else {
        resolve(response);
      }
    };

    const query = new URLSearchParams({
      ...params,
      callback: callbackName
    });

    const script = document.createElement('script');
    script.src = `${GAS_URL}?${query.toString()}`;
    
    script.onerror = () => {
      clearTimeout(timeout);
      cleanupJSONP(callbackName);
      reject(new Error('Network error (script load failed)'));
    };

    document.body.appendChild(script);
  });
}

export function cleanupJSONP(callbackName) {
  if (window[callbackName]) {
    delete window[callbackName];
  }
  // Bersihkan script element yang sudah dipakai (opsional)
  const scripts = document.querySelectorAll(`script[src*="${callbackName}"]`);
  scripts.forEach(s => s.remove());
}

// ============================================
// POST Request Wrapper (no-cors, untuk submit data)
// ============================================

export async function postToGAS(payload, options = {}) {
  const { timeout = REQUEST_TIMEOUT, showProgress = true } = options;

  let progress;
  if (showProgress) {
    progress = showUploadProgress('Mengirim data ke server...');
  }

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(GAS_URL, {
      method: 'POST',
      mode: 'no-cors',           // wajib karena GAS tidak support CORS full
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(id);

    // Karena no-cors → tidak bisa baca response body
    // Kita anggap sukses jika tidak throw error
    if (progress) progress.complete();

    return { success: true };
  } catch (err) {
    if (progress) progress.error();

    if (err.name === 'AbortError') {
      showCustomAlert('Request timeout. Silakan coba lagi.', 'error');
    } else if (!navigator.onLine) {
      showCustomAlert('Perangkat offline. Data akan disimpan lokal.', 'warning');
    } else {
      showCustomAlert('Gagal terhubung ke server. Coba periksa koneksi.', 'error');
    }

    console.error('[NETWORK] POST error:', err);
    return { success: false, error: err.message };
  }
}

// ============================================
// Check Online Status + Periodic Check (opsional)
// ============================================

export function isOnline() {
  return navigator.onLine;
}

// Contoh penggunaan periodic check (bisa dipanggil di main.js)
export function startOnlineStatusMonitor(callback) {
  window.addEventListener('online', () => {
    showCustomAlert('Koneksi internet kembali tersedia', 'success');
    if (callback) callback(true);
  });

  window.addEventListener('offline', () => {
    showCustomAlert('Koneksi internet terputus. Mode offline diaktifkan.', 'warning');
    if (callback) callback(false);
  });
}

// ============================================
// Helper: Buat payload standar untuk semua submit
// ============================================

export function createStandardPayload(type, extra = {}) {
  return {
    type,
    Operator: getCurrentUser()?.name || 'Unknown',
    OperatorId: getCurrentUser()?.id || 'Unknown',
    Timestamp: new Date().toISOString(),
    ...extra
  };
}

// ============================================
// Export
// ============================================

export default {
  jsonpRequest,
  cleanupJSONP,
  postToGAS,
  isOnline,
  startOnlineStatusMonitor,
  createStandardPayload
};
