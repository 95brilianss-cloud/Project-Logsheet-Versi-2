// js/utils/auth.js
// ============================================
// AUTENTIKASI & SESSION MANAGEMENT
// ============================================

import { 
  AUTH_CONFIG, 
  OFFLINE_USERS, 
  GAS_URL 
} from '../config/constants.js';

import { 
  getSession, 
  saveSession, 
  clearSession, 
  loadUsersCache, 
  updateUsersCache 
} from './storage.js';

import { showCustomAlert, navigateTo, showLoginScreen } from './ui.js';

// Variabel global yang dideklarasikan di sini (akan di-export)
let currentUser = null;
let isAuthenticated = false;
let usersCache = null;

// ============================================
// Session & Authentication Helpers
// ============================================

export function isSessionValid(session) {
  if (!session || !session.expiresAt) return false;
  return Date.now() < session.expiresAt;
}

export function requireAuth() {
  const session = getSession();
  if (!session || !isSessionValid(session)) {
    clearSession();
    showLoginScreen();
    showCustomAlert('Sesi Anda telah berakhir. Silakan login kembali.', 'error');
    return false;
  }
  currentUser = session.user;
  isAuthenticated = true;
  return true;
}

export function isAdmin() {
  return currentUser && currentUser.role === 'admin';
}

export function getCurrentUser() {
  return currentUser;
}

export function setCurrentUser(user) {
  currentUser = user;
}

// ============================================
// Online & Offline Validation
// ============================================

function validateUserOffline(username, password) {
  const inputUsername = String(username).toLowerCase().trim();
  const inputPassword = String(password).trim();

  // Cek dari cache terlebih dahulu
  const cachedUsers = loadUsersCache();
  if (cachedUsers && cachedUsers[inputUsername]) {
    const user = cachedUsers[inputUsername];
    if (String(user.password).trim() === inputPassword) {
      if (user.status === 'INACTIVE') {
        return { success: false, error: 'User tidak aktif' };
      }
      return {
        success: true,
        user: {
          username: user.username,
          name: user.name,
          role: user.role,
          department: user.department
        }
      };
    }
    return { success: false, error: 'Password salah' };
  }

  // Fallback ke user legacy (hardcoded)
  const legacyUser = OFFLINE_USERS[inputUsername];
  if (!legacyUser) {
    return { success: false, error: 'User tidak ditemukan' };
  }

  if (legacyUser.password !== inputPassword) {
    return { success: false, error: 'Password salah' };
  }

  return {
    success: true,
    user: {
      username: inputUsername,
      name: legacyUser.name,
      role: legacyUser.role,
      department: legacyUser.department
    }
  };
}

function validateUserOnline(username, password) {
  return new Promise((resolve, reject) => {
    const callbackName = 'loginCallback_' + Date.now();
    const timeout = setTimeout(() => {
      cleanupJSONP(callbackName);
      reject(new Error('Timeout login server'));
    }, 10000);

    window[callbackName] = (response) => {
      clearTimeout(timeout);
      cleanupJSONP(callbackName);
      resolve(response);
    };

    const script = document.createElement('script');
    script.src = `${GAS_URL}?action=login&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&callback=${callbackName}`;
    script.onerror = () => {
      clearTimeout(timeout);
      cleanupJSONP(callbackName);
      reject(new Error('Network error saat login'));
    };

    document.body.appendChild(script);
  });
}

function cleanupJSONP(callbackName) {
  if (window[callbackName]) {
    delete window[callbackName];
  }
}

// ============================================
// Login Handler Utama
// ============================================

export async function loginOperator() {
  const usernameInput = document.getElementById('operatorUsername');
  const passwordInput = document.getElementById('operatorPassword');
  const loginBtn = document.querySelector('#loginScreen .btn-primary');

  if (!usernameInput || !passwordInput) return;

  const username = String(usernameInput.value).trim().toLowerCase();
  const password = String(passwordInput.value).trim();

  if (!username || !password) {
    showLoginError('Username dan password wajib diisi!');
    return;
  }

  if (loginBtn) {
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span>⏳ Memverifikasi...</span>';
  }

  hideLoginError();

  // 1. Coba login online terlebih dahulu
  if (navigator.onLine) {
    try {
      console.log('[AUTH] Mencoba login online:', username);
      const result = await validateUserOnline(username, password);

      if (result.success === true) {
        // Login online berhasil
        updateUserCache(username, password, result.user);
        handleLoginSuccess(result.user, username, password, false);
        return;
      } else {
        // Server menolak (password salah, user tidak aktif, dll)
        console.log('[AUTH] Server menolak:', result.error);
        showLoginError(result.error || 'Username atau password salah');
        if (loginBtn) {
          loginBtn.disabled = false;
          loginBtn.innerHTML = '<span>🔓 Masuk</span>';
        }
        return; // JANGAN lanjut ke offline
      }
    } catch (error) {
      console.warn('[AUTH] Gagal koneksi online, beralih ke mode offline:', error.message);
      // Lanjut ke offline
    }
  } else {
    console.log('[AUTH] Perangkat offline, langsung pakai mode lokal');
  }

  // 2. Fallback ke offline
  const offlineResult = validateUserOffline(username, password);

  if (offlineResult.success) {
    handleLoginSuccess(offlineResult.user, username, password, true);
  } else {
    showLoginError(offlineResult.error || 'Login gagal. Periksa koneksi atau username/password.');
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.innerHTML = '<span>🔓 Masuk</span>';
    }
  }
}

function handleLoginSuccess(user, username, password, isOffline = false) {
  currentUser = user;
  isAuthenticated = true;

  // Simpan session (8 jam default, 30 hari jika remember me nanti ditambahkan)
  saveSession(user, false);

  updateUIForAuthenticatedUser();

  navigateTo('homeScreen');

  if (isOffline) {
    showCustomAlert(`✓ Login offline berhasil! Selamat datang, ${user.name || user.username}`, 'warning');
  } else {
    showCustomAlert(`✓ Login berhasil! Selamat datang, ${user.name || user.username}`, 'success');

    // Jika admin → sinkronkan user untuk offline
    if (user.role === 'admin') {
      syncUsersForOffline();
    }
  }

  // Reset form login
  const loginBtn = document.querySelector('#loginScreen .btn-primary');
  if (loginBtn) {
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<span>🔓 Masuk</span>';
  }

  const passwordInput = document.getElementById('operatorPassword');
  if (passwordInput) passwordInput.value = '';

  console.log(`[AUTH] Login sukses - User: ${user.username}, Role: ${user.role}, Mode: ${isOffline ? 'OFFLINE' : 'ONLINE'}`);
}

export function logoutOperator() {
  if (!confirm('Apakah Anda yakin ingin keluar?')) return;

  // Backup draft jika ada
  if (Object.keys(currentInput || {}).length > 0) {
    localStorage.setItem(DRAFT_KEYS.LOGSHEET_BACKUP, JSON.stringify(currentInput));
  }

  clearSession();
  currentUser = null;
  isAuthenticated = false;

  // Kosongkan form login
  const usernameInput = document.getElementById('operatorUsername');
  const passwordInput = document.getElementById('operatorPassword');
  if (usernameInput) usernameInput.value = '';
  if (passwordInput) passwordInput.value = '';

  showLoginScreen();
  showCustomAlert('Anda telah keluar dari sistem.', 'success');
}

// ============================================
// User Cache & Sync
// ============================================

function updateUserCache(username, password, userData) {
  let cache = loadUsersCache() || {};

  cache[username.toLowerCase()] = {
    username: userData.username || username,
    password: password,
    role: userData.role || 'operator',
    name: userData.name || username,
    department: userData.department || 'Unit Utilitas 3B',
    status: 'ACTIVE',
    lastSync: new Date().toISOString()
  };

  localStorage.setItem(AUTH_CONFIG.USERS_CACHE_KEY, JSON.stringify(cache));
  usersCache = cache;
  console.log('[AUTH] User dicache untuk offline:', username);
}

export function updatePasswordInCache(username, newPassword) {
  if (!username) return;

  const cache = loadUsersCache() || {};
  const key = String(username).toLowerCase();

  if (cache[key]) {
    cache[key].password = newPassword;
    cache[key].lastSync = new Date().toISOString();
    localStorage.setItem(AUTH_CONFIG.USERS_CACHE_KEY, JSON.stringify(cache));
    usersCache = cache;
    console.log('[AUTH] Password diupdate di cache untuk:', username);
  }
}

async function syncUsersForOffline() {
  try {
    const result = await fetchUsersFromServer();
    if (result.success) {
      updateUsersCache(result.users);
      showCustomAlert('User list berhasil disinkronkan untuk mode offline', 'success');
    }
  } catch (err) {
    console.warn('[AUTH] Gagal sync user untuk offline:', err);
  }
}

function fetchUsersFromServer() {
  return new Promise((resolve, reject) => {
    if (!currentUser || !currentUser.username) {
      reject(new Error('Tidak ada user yang login'));
      return;
    }

    const callbackName = 'usersCallback_' + Date.now();
    const timeout = setTimeout(() => {
      cleanupJSONP(callbackName);
      reject(new Error('Timeout mengambil daftar user'));
    }, 10000);

    window[callbackName] = (response) => {
      clearTimeout(timeout);
      cleanupJSONP(callbackName);
      resolve(response);
    };

    const script = document.createElement('script');
    script.src = `${GAS_URL}?action=getUsers&adminUser=${encodeURIComponent(currentUser.username)}&adminPass=admin123&callback=${callbackName}`;
    script.onerror = () => {
      clearTimeout(timeout);
      cleanupJSONP(callbackName);
      reject(new Error('Network error saat mengambil daftar user'));
    };

    document.body.appendChild(script);
  });
}

// ============================================
// UI Update & Error Handling
// ============================================

function updateUIForAuthenticatedUser() {
  if (!currentUser) return;

  const userElements = [
    'displayUserName', 'tpmHeaderUser', 'tpmInputUser',
    'areaListUser', 'paramUser', 'balancingUser',
    'ctAreaListUser', 'ctParamUser'
  ];

  userElements.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = currentUser.name || currentUser.username;
  });

  if (currentUser.role === 'admin') {
    const homeHeader = document.querySelector('.home-header .user-info');
    if (homeHeader && !homeHeader.querySelector('.admin-badge')) {
      const badge = document.createElement('span');
      badge.className = 'admin-badge';
      badge.style.cssText = 'background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.65rem; font-weight: 700; margin-left: 4px; text-transform: uppercase;';
      badge.textContent = 'Admin';
      homeHeader.appendChild(badge);
    }
  }
}

function showLoginError(message) {
  const errorMsg = document.getElementById('loginError');
  const usernameInput = document.getElementById('operatorUsername');
  const passwordInput = document.getElementById('operatorPassword');

  if (errorMsg) {
    errorMsg.textContent = message;
    errorMsg.style.display = 'block';
  }

  if (usernameInput) usernameInput.style.borderColor = '#ef4444';
  if (passwordInput) passwordInput.style.borderColor = '#ef4444';
}

function hideLoginError() {
  const errorMsg = document.getElementById('loginError');
  const usernameInput = document.getElementById('operatorUsername');
  const passwordInput = document.getElementById('operatorPassword');

  if (errorMsg) {
    errorMsg.style.display = 'none';
    errorMsg.textContent = '';
  }

  if (usernameInput) usernameInput.style.borderColor = '';
  if (passwordInput) passwordInput.style.borderColor = '';
}

export function togglePasswordVisibility() {
  const passwordInput = document.getElementById('operatorPassword');
  const eyeIcon = document.getElementById('eyeIcon');

  if (!passwordInput) return;

  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    if (eyeIcon) {
      eyeIcon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
    }
  } else {
    passwordInput.type = 'password';
    if (eyeIcon) {
      eyeIcon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    }
  }
}

// ============================================
// Inisialisasi Auth saat aplikasi dimuat
// ============================================

export function initAuth() {
  const session = getSession();

  if (session && isSessionValid(session)) {
    currentUser = session.user;
    isAuthenticated = true;
    updateUIForAuthenticatedUser();

    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen && loginScreen.classList.contains('active')) {
      navigateTo('homeScreen');
    }
  } else {
    clearSession();
    showLoginScreen();
  }

  // Load cache user
  usersCache = loadUsersCache();
}

// Export semua yang dibutuhkan oleh file lain
export {
  currentUser,
  isAuthenticated,
  initAuth,
  loginOperator,
  logoutOperator,
  requireAuth,
  isAdmin,
  getCurrentUser
};
