/* ============================================
   TURBINE LOGSHEET PRO - USER MANAGEMENT
   ============================================ */

// ============================================
// 1. UI MODALS & LISTING
// ============================================

function showUserManagement() {
    if (!isAdmin()) {
        showCustomAlert('Akses ditolak. Hanya admin yang bisa mengakses.', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.id = 'userManagementModal';
    modal.style.cssText = 'position: fixed; inset: 0; background: rgba(15, 23, 42, 0.98); z-index: 10003; overflow-y: auto; padding: 20px;';
    
    modal.innerHTML = `
        <div style="max-width: 480px; margin: 0 auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 16px; background: rgba(30, 41, 59, 0.8); border-radius: 12px; border: 1px solid rgba(148, 163, 184, 0.2);">
                <h2 style="margin: 0; font-size: 1.25rem;">👥 Manajemen User</h2>
                <button onclick="closeUserManagement()" style="background: none; border: none; color: #94a3b8; cursor: pointer; padding: 8px;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            
            <div id="userListContainer" style="margin-bottom: 20px;">
                <div style="text-align: center; padding: 40px; color: #64748b;">
                    ⏳ Memuat data user...
                </div>
            </div>
            
            <button onclick="showAddUserForm()" style="width: 100%; padding: 16px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Tambah User Baru
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    loadUserList();
}

function closeUserManagement() {
    const modal = document.getElementById('userManagementModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

async function loadUserList() {
    const container = document.getElementById('userListContainer');
    if (!container) return;
    
    try {
        const result = await fetchUsersFromServer();
        
        if (result.success) {
            const uniqueUsers = [];
            const seen = new Set();
            
            result.users.forEach(user => {
                const key = String(user.username).toLowerCase().trim();
                if (key && !seen.has(key)) {
                    seen.add(key);
                    uniqueUsers.push(user);
                }
            });
            
            renderUserList(uniqueUsers);
            updateUsersCache(uniqueUsers);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        const cached = loadUsersCache();
        if (cached) {
            const usersArray = Object.values(cached);
            renderUserList(usersArray);
        } else {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ef4444;">
                    ❌ Gagal memuat data user
                </div>
            `;
        }
    }
}

function renderUserList(users) {
    const container = document.getElementById('userListContainer');
    if (!container) return;
    
    const validUsers = users.filter(user => {
        return user && user.username && String(user.username).trim() !== '';
    });
    
    if (validUsers.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #64748b;">
                Tidak ada data user
            </div>
        `;
        return;
    }
    
    let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';
    
    validUsers.forEach(user => {
        const currentUsername = String(currentUser?.username || '').toLowerCase();
        const userUsername = String(user.username).toLowerCase();
        const isCurrentUser = userUsername === currentUsername;
        
        const isActive = user.status === 'ACTIVE';
        const isAdminRole = user.role === 'admin';
        
        html += `
            <div style="background: rgba(30, 41, 59, 0.8); border: 1px solid ${isActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}; border-radius: 12px; padding: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <div style="font-weight: 600; color: ${isActive ? '#f8fafc' : '#64748b'};">
                            ${user.name || user.username}
                            ${isCurrentUser ? '<span style="font-size: 0.7rem; background: rgba(14, 165, 233, 0.2); color: #38bdf8; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">Anda</span>' : ''}
                        </div>
                        <div style="font-size: 0.875rem; color: #94a3b8;">
                            @${user.username} • ${user.department || 'Unit Utilitas 3B'}
                        </div>
                    </div>
                    <div style="display: flex; gap: 4px;">
                        <span style="padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; background: ${isAdminRole ? 'rgba(245, 158, 11, 0.2)' : 'rgba(100, 116, 139, 0.2)'}; color: ${isAdminRole ? '#f59e0b' : '#94a3b8'};">
                            ${user.role || 'operator'}
                        </span>
                        <span style="padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; background: ${isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; color: ${isActive ? '#10b981' : '#ef4444'};">
                            ${user.status || 'ACTIVE'}
                        </span>
                    </div>
                </div>
                
                <div style="background: rgba(239, 68, 68, 0.05); border: 1px dashed rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 12px; margin: 12px 0;">
                    <div style="font-size: 0.75rem; color: #ef4444; font-weight: 600;">🔓 Password:</div>
                    <div style="font-family: monospace; color: #f87171;">${user.password || 'N/A'}</div>
                </div>
                
                ${!isCurrentUser ? `
                    <div style="display: flex; gap: 8px;">
                        <button onclick="toggleUserStatus('${user.username}')" style="flex: 1; padding: 10px; background: ${isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'}; color: ${isActive ? '#ef4444' : '#10b981'}; border: 1px solid ${isActive ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}; border-radius: 8px; cursor: pointer;">
                            ${isActive ? '🔒 Nonaktifkan' : '🔓 Aktifkan'}
                        </button>
                        <button onclick="deleteUser('${user.username}')" style="padding: 10px 16px; background: rgba(100, 116, 139, 0.1); color: #64748b; border: 1px solid rgba(100, 116, 139, 0.3); border-radius: 8px; cursor: pointer;">
                            🗑️
                        </button>
                    </div>
                ` : '<div style="text-align: center; color: #64748b; font-size: 0.875rem; padding: 10px;">Tidak dapat mengedit diri sendiri</div>'}
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// ============================================
// 2. ADD & MODIFY USER
// ============================================

function showAddUserForm() {
    const modal = document.getElementById('userManagementModal');
    if (!modal) return;
    
    modal.setAttribute('data-old-content', modal.innerHTML);
    
    modal.innerHTML = `
        <div style="max-width: 480px; margin: 0 auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 16px; background: rgba(30, 41, 59, 0.8); border-radius: 12px; border: 1px solid rgba(148, 163, 184, 0.2);">
                <h2 style="margin: 0; font-size: 1.25rem;">➕ Tambah User Baru</h2>
                <button onclick="restoreUserManagement()" style="background: none; border: none; color: #94a3b8; cursor: pointer; padding: 8px;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            
            <form id="addUserForm" style="display: flex; flex-direction: column; gap: 16px;">
                <div>
                    <label style="display: block; font-size: 0.875rem; color: #94a3b8; margin-bottom: 6px;">Username *</label>
                    <input type="text" id="newUsername" required style="width: 100%; padding: 12px; background: rgba(15, 23, 42, 0.6); border: 2px solid rgba(148, 163, 184, 0.2); border-radius: 8px; color: white; font-size: 1rem;">
                </div>
                
                <div>
                    <label style="display: block; font-size: 0.875rem; color: #94a3b8; margin-bottom: 6px;">Password (Plaintext) *</label>
                    <input type="text" id="newPassword" required style="width: 100%; padding: 12px; background: rgba(15, 23, 42, 0.6); border: 2px solid rgba(148, 163, 184, 0.2); border-radius: 8px; color: white; font-size: 1rem;">
                    <small style="color: #64748b; font-size: 0.75rem;">⚠️ Password akan disimpan dalam bentuk plaintext</small>
                </div>
                
                <div>
                    <label style="display: block; font-size: 0.875rem; color: #94a3b8; margin-bottom: 6px;">Nama Lengkap *</label>
                    <input type="text" id="newName" required style="width: 100%; padding: 12px; background: rgba(15, 23, 42, 0.6); border: 2px solid rgba(148, 163, 184, 0.2); border-radius: 8px; color: white; font-size: 1rem;">
                </div>
                
                <div>
                    <label style="display: block; font-size: 0.875rem; color: #94a3b8; margin-bottom: 6px;">Role *</label>
                    <select id="newRole" required style="width: 100%; padding: 12px; background: rgba(15, 23, 42, 0.6); border: 2px solid rgba(148, 163, 184, 0.2); border-radius: 8px; color: white; font-size: 1rem;">
                        <option value="operator">Operator</option>
                        <option value="admin">Administrator</option>
                    </select>
                </div>
                
                <div>
                    <label style="display: block; font-size: 0.875rem; color: #94a3b8; margin-bottom: 6px;">Department</label>
                    <input type="text" id="newDepartment" value="Unit Utilitas 3B" style="width: 100%; padding: 12px; background: rgba(15, 23, 42, 0.6); border: 2px solid rgba(148, 163, 184, 0.2); border-radius: 8px; color: white; font-size: 1rem;">
                </div>
                
                <button type="submit" style="width: 100%; padding: 16px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; margin-top: 8px;">
                    Simpan User Baru
                </button>
            </form>
        </div>
    `;
    
    setTimeout(() => {
        const form = document.getElementById('addUserForm');
        if (form) form.addEventListener('submit', handleAddUser);
    }, 100);
}

function restoreUserManagement() {
    const modal = document.getElementById('userManagementModal');
    if (modal && modal.getAttribute('data-old-content')) {
        modal.innerHTML = modal.getAttribute('data-old-content');
        loadUserList();
    }
}

async function handleAddUser(e) {
    e.preventDefault();
    
    const formData = {
        username: document.getElementById('newUsername').value.trim().toLowerCase(),
        password: document.getElementById('newPassword').value,
        name: document.getElementById('newName').value.trim(),
        role: document.getElementById('newRole').value,
        department: document.getElementById('newDepartment').value.trim()
    };
    
    if (!formData.username || !formData.password || !formData.name) {
        showCustomAlert('Semua field wajib diisi!', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '⏳ Menyimpan...';
    submitBtn.disabled = true;
    
    try {
        const result = await addUserToServerWithCache(formData);
        
        if (result.success) {
            showCustomAlert('✓ User berhasil ditambahkan!', 'success');
            
            updateUserCache(formData.username, formData.password, {
                username: formData.username,
                name: formData.name,
                role: formData.role,
                department: formData.department,
                status: 'ACTIVE'
            });
            
            restoreUserManagement();
            
            setTimeout(async () => {
                localStorage.removeItem(AUTH_CONFIG.USERS_CACHE_KEY);
                usersCache = null;
                await loadUserList();
            }, 500);
            
        } else {
            showCustomAlert(result.error || 'Gagal menambahkan user', 'error');
        }
    } catch (error) {
        console.error('Add user error:', error);
        showCustomAlert('Gagal menambahkan user: ' + error.message, 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

async function toggleUserStatus(username) {
    if (!confirm(`Yakin ingin mengubah status user @${username}?`)) return;
    
    try {
        const payload = {
            type: 'USER_MANAGEMENT',
            action: 'toggle',
            adminUser: currentUser.username,
            adminPass: 'admin123',
            targetUsername: username
        };
        
        await fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        showCustomAlert('Status user diubah', 'success');
        loadUserList();
    } catch (error) {
        const cache = loadUsersCache();
        if (cache && cache[username.toLowerCase()]) {
            const currentStatus = cache[username.toLowerCase()].status || 'ACTIVE';
            cache[username.toLowerCase()].status = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
            localStorage.setItem(AUTH_CONFIG.USERS_CACHE_KEY, JSON.stringify(cache));
        }
        loadUserList();
        showCustomAlert('Status diubah secara lokal (mode offline)', 'warning');
    }
}

async function deleteUser(username) {
    if (!confirm(`Yakin ingin menghapus user @${username}?`)) return;
    
    if (username.toLowerCase() === currentUser.username.toLowerCase()) {
        showCustomAlert('Tidak bisa menghapus diri sendiri!', 'error');
        return;
    }
    
    try {
        const payload = {
            type: 'USER_MANAGEMENT',
            action: 'delete',
            adminUser: currentUser.username,
            adminPass: 'admin123',
            targetUsername: username
        };
        
        await fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        showCustomAlert('User berhasil dihapus', 'success');
        loadUserList();
    } catch (error) {
        const cache = loadUsersCache();
        if (cache && cache[username.toLowerCase()]) {
            delete cache[username.toLowerCase()];
            localStorage.setItem(AUTH_CONFIG.USERS_CACHE_KEY, JSON.stringify(cache));
        }
        loadUserList();
        showCustomAlert('User dihapus secara lokal (mode offline)', 'warning');
    }
}

// ============================================
// 3. SERVER & SPREADSHEET COMMUNICATION
// ============================================

function fetchUsersFromServer() {
    return new Promise((resolve, reject) => {
        if (!currentUser || !currentUser.username) {
            reject(new Error('Tidak ada user yang login'));
            return;
        }
        
        const callbackName = 'usersCallback_' + Date.now();
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
        script.src = `${GAS_URL}?action=getUsers&adminUser=${encodeURIComponent(currentUser.username)}&adminPass=admin123&callback=${callbackName}`;
        
        script.onerror = () => {
            clearTimeout(timeout);
            cleanupJSONP(callbackName);
            reject(new Error('Network error'));
        };
        
        document.body.appendChild(script);
    });
}

function addUserToServerWithCache(userData) {
    return new Promise((resolve, reject) => {
        const cache = loadUsersCache() || {};
        const adminKey = String(currentUser.username).toLowerCase();
        const adminData = cache[adminKey];
        
        let adminPass = 'admin123';
        
        if (adminData && adminData.password) {
            adminPass = adminData.password;
        } else if (currentUser.username === 'admin') {
            adminPass = 'admin123';
        }
        
        const payload = {
            type: 'USER_MANAGEMENT',
            action: 'add',
            adminUser: currentUser.username,
            adminPass: adminPass,
            userData: userData
        };
        
        const callbackName = 'addUserCallback_' + Date.now();
        const timeout = setTimeout(() => {
            cleanupJSONP(callbackName);
            reject(new Error('Timeout - Server tidak merespon'));
        }, 15000);
        
        window[callbackName] = (response) => {
            clearTimeout(timeout);
            cleanupJSONP(callbackName);
            
            if (response && response.success) {
                resolve(response);
            } else {
                reject(new Error((response && response.error) || 'Gagal menambahkan user'));
            }
        };
        
        const params = new URLSearchParams({
            action: 'userManagement',
            callback: callbackName,
            data: JSON.stringify(payload)
        });
        
        const script = document.createElement('script');
        script.src = `${GAS_URL}?${params.toString()}`;
        
        script.onerror = () => {
            clearTimeout(timeout);
            cleanupJSONP(callbackName);
            reject(new Error('Network error'));
        };
        
        document.body.appendChild(script);
    });
}

function updateUsersCache(usersArray) {
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
        usersCache = cache;
    } catch (e) {
        console.error('Error updating users cache:', e);
    }
}

// ============================================
// 4. OFFLINE SYNC (ADMIN ONLY)
// ============================================

async function syncUsersForOffline() {
    if (!navigator.onLine) {
        console.log('Sync skipped: Device is offline');
        return;
    }
    
    if (!currentUser || currentUser.role !== 'admin') {
        console.log('Sync skipped: No authenticated admin user');
        return;
    }
    
    console.log('[SYNC] Starting offline users sync for admin...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    try {
        const callbackName = 'syncUsersCallback_' + Date.now();
        
        const result = await new Promise((resolve, reject) => {
            const cleanup = () => {
                clearTimeout(timeoutId);
                if (window[callbackName]) delete window[callbackName];
            };
            
            window[callbackName] = (response) => {
                cleanup();
                if (response && response.success && Array.isArray(response.users)) {
                    resolve(response);
                } else {
                    reject(new Error(response?.error || 'Invalid response format'));
                }
            };
            
            const script = document.createElement('script');
            script.src = `${GAS_URL}?action=getUsers&adminUser=${encodeURIComponent(currentUser.username)}&adminPass=admin123&callback=${callbackName}`;
            
            script.onerror = () => {
                cleanup();
                reject(new Error('Failed to load script'));
            };
            
            controller.signal.addEventListener('abort', () => {
                cleanup();
                reject(new Error('Sync aborted'));
            });
            
            document.body.appendChild(script);
            
            script.onload = () => {
                setTimeout(() => {
                    if (script.parentNode) script.remove();
                }, 2000);
            };
        });
        
        if (result.users.length > 0) {
            updateUsersCache(result.users);
            console.log(`[SYNC] Success: ${result.users.length} users cached for offline mode`);
        } else {
            console.log('[SYNC] No users returned from server');
        }
        
    } catch (error) {
        console.error('[SYNC] Failed:', error.message);
    } finally {
        clearTimeout(timeoutId);
    }
}
