// ============================================
// AUTHENTICATION MODULE - TURBINE LOGSHEET PRO
// ============================================

let currentUser = null;
let isAuthenticated = false;
let usersCache = null;

/**
 * Inisialisasi sistem autentikasi saat aplikasi dimuat
 */
function initAuth() {
    const session = getSession();
    
    if (session && isSessionValid(session)) {
        currentUser = session.user;
        isAuthenticated = true;
        updateUIForAuthenticatedUser();
        
        // Jika masih di login screen, arahkan ke home
        if (document.getElementById('loginScreen').classList.contains('active')) {
            navigateTo('homeScreen');
        }
    } else {
        clearSession();
        showLoginScreen();
    }
    
    loadUsersCache();
}

/**
 * Logika Utama Login Operator
 */
async function loginOperator() {
    const usernameInput = document.getElementById('operatorUsername');
    const passwordInput = document.getElementById('operatorPassword');
    const loginBtn = document.querySelector('#loginScreen .btn-primary');
    
    if (!usernameInput || !passwordInput) return;
    
    const username = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value.trim();
    
    if (!username || !password) {
        showLoginError('Username dan password wajib diisi!');
        return;
    }
    
    // UI Feedback
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span>⏳ Memverifikasi...</span>';
    hideLoginError();
    
    // 1. Coba Login Online (Jika ada koneksi)
    if (navigator.onLine) {
        try {
            const result = await validateUserOnline(username, password);
            
            if (result.success) {
                updateUserCache(username, password, result.user);
                handleLoginSuccess(result.user, username, password, false);
                return;
            } else {
                showLoginError(result.error || 'Username atau password salah');
                resetLoginBtn(loginBtn);
                return;
            }
        } catch (error) {
            console.warn('Network error, switching to offline mode');
        }
    }
    
    // 2. Fallback ke Login Offline
    const offlineResult = validateUserOffline(username, password);
    
    if (offlineResult.success) {
        handleLoginSuccess(offlineResult.user, username, password, true);
    } else {
        showLoginError(offlineResult.error || 'Login gagal. Periksa koneksi.');
        resetLoginBtn(loginBtn);
    }
}

/**
 * Validasi User ke Server (JSONP)
 */
function validateUserOnline(username, password) {
    return new Promise((resolve, reject) => {
        const callbackName = 'loginCallback_' + Date.now();
        const timeout = setTimeout(() => {
            cleanupJSONP(callbackName);
            reject(new Error('Timeout'));
        }, 10000);
        
        window[callbackName] = (response) => {
            clearTimeout(timeout);
            cleanupJSONP(callbackName);
            resolve(response);
        };
        
        const script = document.createElement('script');
        script.src = `${GAS_URL}?action=login&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&callback=${callbackName}`;
        script.onerror = () => reject(new Error('Network error'));
        document.body.appendChild(script);
    });
}

/**
 * Validasi User secara Lokal (Offline Mode)
 */
function validateUserOffline(username, password) {
    const cache = loadUsersCache();
    const user = cache ? cache[username] : null;
    
    if (user && user.password === password) {
        if (user.status === 'INACTIVE') return { success: false, error: 'User dinonaktifkan' };
        return { success: true, user: user };
    }
    return { success: false, error: 'User tidak ditemukan atau password salah' };
}

/**
 * Penanganan setelah Login Berhasil
 */
function handleLoginSuccess(user, username, password, isOffline) {
    currentUser = user;
    isAuthenticated = true;
    
    saveSession(user);
    updateUIForAuthenticatedUser();
    navigateTo('homeScreen');
    
    const mode = isOffline ? '(Mode Offline)' : '';
    showCustomAlert(`Selamat datang, ${user.name}! ${mode}`, 'success');
    
    // Sinkronisasi data user lain jika admin login online
    if (!isOffline && user.role === 'admin') syncUsersForOffline();
}

/**
 * Manajemen Sesi (LocalStorage)
 */
function saveSession(user) {
    const session = {
        user: user,
        loginTime: Date.now(),
        expiresAt: Date.now() + AUTH_CONFIG.SESSION_DURATION
    };
    localStorage.setItem(AUTH_CONFIG.SESSION_KEY, JSON.stringify(session));
}

function getSession() {
    const data = localStorage.getItem(AUTH_CONFIG.SESSION_KEY);
    return data ? JSON.parse(data) : null;
}

function isSessionValid(session) {
    return session && Date.now() < session.expiresAt;
}

function clearSession() {
    localStorage.removeItem(AUTH_CONFIG.SESSION_KEY);
    currentUser = null;
    isAuthenticated = false;
}

function logoutOperator() {
    if (confirm('Yakin ingin keluar?')) {
        clearSession();
        showLoginScreen();
        showCustomAlert('Anda telah logout', 'info');
    }
}

/**
 * Helper UI Autentikasi
 */
function showLoginScreen() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('loginScreen').classList.add('active');
}

function showLoginError(msg) {
    const errEl = document.getElementById('loginError');
    if (errEl) {
        errEl.textContent = msg;
        errEl.style.display = 'block';
    }
}

function hideLoginError() {
    const errEl = document.getElementById('loginError');
    if (errEl) errEl.style.display = 'none';
}

function resetLoginBtn(btn) {
    btn.disabled = false;
    btn.innerHTML = '<span>🔓 Masuk</span>';
}

function loadUsersCache() {
    const data = localStorage.getItem(AUTH_CONFIG.USERS_CACHE_KEY);
    return data ? JSON.parse(data) : {};
}

function updateUserCache(username, password, userData) {
    const cache = loadUsersCache();
    cache[username] = { ...userData, password: password, lastSync: new Date().toISOString() };
    localStorage.setItem(AUTH_CONFIG.USERS_CACHE_KEY, JSON.stringify(cache));
}
