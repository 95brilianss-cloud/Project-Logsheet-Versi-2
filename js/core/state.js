// js/core/state.js
// ============================================
// GLOBAL STATE MANAGEMENT
// Pusat pengelolaan semua state aplikasi yang bersifat global/cross-module
// ============================================

import { 
  DRAFT_KEYS, 
  DRAFT_KEYS_CT, 
  PHOTO_DRAFT_KEYS 
} from '../config/constants.js';

import { 
  loadTurbineDraft, 
  loadCTDraft, 
  loadParamPhotos, 
  loadCTParamPhotos,
  loadBalancingDraft,
  getSession 
} from '../utils/storage.js';

// ============================================
// State Global (diekspor agar bisa diakses modul lain)
// ============================================

// --- Autentikasi ---
export let currentUser = null;
export let isAuthenticated = false;

// --- Turbine Logsheet ---
export let lastData = {};                       // data terakhir dari server (turbine)
export let currentInput = {};                   // draft input parameter turbine
export let activeArea = "";
export let activeIdx = 0;
export let totalParams = 0;
export let currentInputType = 'text';
export let currentParamPhoto = null;            // foto sementara parameter turbine
export let paramPhotos = {};                    // semua foto validasi parameter turbine

// --- Cooling Tower (CT) ---
export let lastDataCT = {};
export let currentInputCT = {};
export let activeAreaCT = "";
export let activeIdxCT = 0;
export let totalParamsCT = 0;
export let currentInputTypeCT = 'text';
export let currentCTParamPhoto = null;
export let ctParamPhotos = {};

// --- Balancing ---
export let balancingDraft = null;               // draft form balancing

// --- Lainnya (bisa ditambah) ---
export let currentShift = 3;                    // default shift (bisa diubah via UI nanti)
export let uploadProgressInterval = null;
export let currentUploadController = null;
export let deferredPrompt = null;               // untuk PWA install prompt
export let installBannerShown = false;

// ============================================
// Inisialisasi State Awal (dipanggil sekali saat app start)
// ============================================

export function initState() {
  console.log('[STATE] Inisialisasi state global dimulai...');

  // 1. Load session & user
  const session = getSession();
  if (session && session.user) {
    currentUser = session.user;
    isAuthenticated = true;
    console.log('[STATE] User terautentikasi:', currentUser.username);
  } else {
    currentUser = null;
    isAuthenticated = false;
  }

  // 2. Load draft Turbine
  try {
    currentInput = loadTurbineDraft() || {};
    paramPhotos = loadParamPhotos() || {};
    totalParams = calculateTotalParams(); // hitung dari AREAS
    console.log('[STATE] Draft turbine terload:', Object.keys(currentInput).length, 'area');
  } catch (err) {
    console.error('[STATE] Gagal load draft turbine:', err);
    currentInput = {};
    paramPhotos = {};
  }

  // 3. Load draft CT
  try {
    currentInputCT = loadCTDraft() || {};
    ctParamPhotos = loadCTParamPhotos() || {};
    totalParamsCT = calculateTotalParamsCT();
    console.log('[STATE] Draft CT terload:', Object.keys(currentInputCT).length, 'area');
  } catch (err) {
    console.error('[STATE] Gagal load draft CT:', err);
    currentInputCT = {};
    ctParamPhotos = {};
  }

  // 4. Load draft Balancing
  try {
    balancingDraft = loadBalancingDraft();
    console.log('[STATE] Draft balancing terload:', balancingDraft ? 'ada' : 'kosong');
  } catch (err) {
    console.error('[STATE] Gagal load draft balancing:', err);
    balancingDraft = null;
  }

  // 5. Reset state sementara lainnya
  resetTemporaryState();

  console.log('[STATE] Inisialisasi selesai');
}

// ============================================
// Helper: Hitung total parameter dari struktur AREAS
// ============================================

function calculateTotalParams() {
  // Asumsi AREAS sudah diimport dari constants.js
  // Jika belum, import di sini atau pindah ke fungsi lain
  return Object.values(AREAS).reduce((acc, arr) => acc + arr.length, 0);
}

function calculateTotalParamsCT() {
  return Object.values(AREAS_CT).reduce((acc, arr) => acc + arr.length, 0);
}

// ============================================
// Reset state sementara (saat logout, ganti area, dll)
// ============================================

export function resetTemporaryState() {
  lastData = {};
  lastDataCT = {};
  activeArea = "";
  activeIdx = 0;
  activeAreaCT = "";
  activeIdxCT = 0;
  currentParamPhoto = null;
  currentCTParamPhoto = null;
  currentUploadController = null;
  console.log('[STATE] State sementara direset');
}

// ============================================
// Getter & Setter (opsional - untuk konsistensi)
// ============================================

export function getCurrentUser() {
  return currentUser;
}

export function setCurrentUser(user) {
  currentUser = user;
  isAuthenticated = !!user;
}

export function getTurbineDraft() {
  return currentInput;
}

export function updateTurbineDraft(newDraft) {
  currentInput = { ...currentInput, ...newDraft };
}

export function getCTDraft() {
  return currentInputCT;
}

export function getBalancingDraft() {
  return balancingDraft;
}

export function updateBalancingDraft(newData) {
  balancingDraft = { ...balancingDraft, ...newData };
}

// ============================================
// Export utama
// ============================================

export default {
  initState,
  resetTemporaryState,
  getCurrentUser,
  setCurrentUser,
  getTurbineDraft,
  getCTDraft,
  getBalancingDraft,
  updateTurbineDraft,
  updateBalancingDraft,
  
  // state langsung (bisa diakses tapi sebaiknya lewat getter/setter)
  currentUser,
  isAuthenticated,
  currentInput,
  currentInputCT,
  paramPhotos,
  ctParamPhotos,
  balancingDraft,
  currentShift
};
