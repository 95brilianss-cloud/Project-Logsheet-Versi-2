// js/admin/user-management.js
// ============================================
// ADMIN - USER MANAGEMENT
// Manajemen user: list, toggle status, delete, add new user (admin only)
// ============================================

import { 
  GAS_URL, 
  AUTH_CONFIG 
} from '../config/constants.js';

import { 
  loadUsersCache, 
  updateUsersCache 
} from '../utils/storage.js';

import { 
  getCurrentUser, 
  isAdmin, 
  requireAuth 
} from '../utils/auth.js';

import { 
  showCustomAlert, 
  showUploadProgress 
} from '../utils/ui.js';

// ============================================
// State Lokal
// ============================================

let currentUsers = [];

// ============================================
// Tampilkan Modal Manajemen User
// ============================================

export function showUserManagement() {
  if (!requireAuth() || !isAdmin()) {
    showCustomAlert('Akses ditolak. Hanya admin yang bisa mengakses fitur ini.', 'error');
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'userManagementModal';
  modal.style.cssText = `
    position: fixed; inset: 0; background: rgba(15,23,42,0.95); z-index: 10003;
    overflow-y: auto; padding: 20px; display: flex; align-items: flex-start;
  `;

  modal.innerHTML = `
    <div style="max-width: 520px; width: 100%; margin: 40px auto; background: #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
      <div style="padding: 20px; background: linear-gradient(135deg, #334155, #1e293b); display: flex; justify-content: space-between; align-items: center;">
        <h2 style="margin: 0; font-size: 1.4rem; color: #e2e8f0;">👥 Manajemen User</h2>
        <button id="closeUserModalBtn" style="background: none; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer;">×</button>
      </div>
      
      <div id="userListContainer" style="padding: 20px; min-height: 300px;">
        <div style="text-align: center; padding: 60px 20px; color: #64748b;">
          <div class="spinner" style="margin: 0 auto 20px;"></div>
          Memuat daftar user...
        </div>
      </div>
      
      <div style="padding: 20px; border-top: 1px solid #334155; text-align: center;">
        <button id="addUserBtn" style="padding: 12px 24px; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; font-size: 1rem;">
          ➕ Tambah User Baru
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  // Event close modal
  document.getElementById('closeUserModalBtn')?.addEventListener('click', closeUserManagement);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeUserManagement();
  });

  // Load daftar user
  loadUserList();

  // Tombol tambah user
  document.getElementById('addUserBtn')?.addEventListener('click', showAddUserForm);
}

export function closeUserManagement() {
  const modal = document.getElementById('userManagementModal');
  if (modal) {
    modal.remove();
    document.body.style.overflow = '';
  }
}

// ============================================
// Load & Render Daftar User
// ============================================

async function loadUserList() {
  const container = document.getElementById('userListContainer');
  if (!container) return;

  try {
    const result = await fetchUsersFromServer();

    if (result.success && result.users && result.users.length > 0) {
      // Hilangkan duplikat berdasarkan username (case insensitive)
      const uniqueUsers = [];
      const seen = new Set();

      result.users.forEach(user => {
        const key = String(user.username || '').toLowerCase().trim();
        if (key && !seen.has(key)) {
          seen.add(key);
          uniqueUsers.push(user);
        }
      });

      currentUsers = uniqueUsers;
      renderUserList(uniqueUsers);
      updateUsersCache(uniqueUsers); // update cache offline
    } else {
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: #ef4444;">
          ❌ Gagal memuat daftar user
        </div>
      `;
    }
  } catch (err) {
    console.error('[USER-MGMT] Gagal load user:', err);

    // Fallback ke cache jika offline atau error
    const cached = loadUsersCache();
    if (cached && Object.keys(cached).length > 0) {
      const usersArray = Object.values(cached);
      currentUsers = usersArray;
      renderUserList(usersArray);
      showCustomAlert('Menampilkan data dari cache lokal (mode offline)', 'warning');
    } else {
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: #64748b;">
          Tidak ada data user tersedia
        </div>
      `;
    }
  }
}

async function fetchUsersFromServer() {
  return new Promise((resolve, reject) => {
    const current = getCurrentUser();
    if (!current || !current.username) {
      reject(new Error('Tidak ada user login'));
      return;
    }

    const callbackName = 'usersCallback_' + Date.now();
    const timeout = setTimeout(() => {
      cleanupJSONP(callbackName);
      reject(new Error('Timeout mengambil daftar user'));
    }, 12000);

    window[callbackName] = (response) => {
      clearTimeout(timeout);
      cleanupJSONP(callbackName);
      resolve(response);
    };

    const script = document.createElement('script');
    script.src = `${GAS_URL}?action=getUsers&adminUser=${encodeURIComponent(current.username)}&adminPass=admin123&callback=${callbackName}`;
    script.onerror = () => {
      clearTimeout(timeout);
      cleanupJSONP(callbackName);
      reject(new Error('Network error saat mengambil daftar user'));
    };

    document.body.appendChild(script);
  });
}

function cleanupJSONP(name) {
  if (window[name]) delete window[name];
}

function renderUserList(users) {
  const container = document.getElementById('userListContainer');
  if (!container) return;

  if (users.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: #64748b;">
        Tidak ada data user
      </div>
    `;
    return;
  }

  let html = '<div style="display: flex; flex-direction: column; gap: 16px;">';

  users.forEach(user => {
    const username = String(user.username || '').toLowerCase().trim();
    const isCurrentUser = username === String(getCurrentUser()?.username || '').toLowerCase();
    const isActive = user.status !== 'INACTIVE';
    const isAdminRole = user.role === 'admin';

    html += `
      <div style="background: ${isActive ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)'}; border: 1px solid ${isActive ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}; border-radius: 12px; padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: start; gap: 12px;">
          <div style="flex: 1;">
            <div style="font-weight: 600; color: ${isActive ? '#e2e8f0' : '#64748b'};">
              ${user.name || user.username || 'Unknown'}
              ${isCurrentUser ? '<span style="font-size:0.75rem; background:rgba(59,130,246,0.2); color:#60a5fa; padding:2px 8px; border-radius:6px; margin-left:8px;">Anda</span>' : ''}
            </div>
            <div style="font-size:0.875rem; color:#94a3b8; margin-top:4px;">
              @${user.username} • ${user.department || 'Unit Utilitas 3B'}
            </div>
          </div>

          <div style="display: flex; gap: 8px; align-items: center;">
            <span style="padding:4px 10px; border-radius:999px; font-size:0.75rem; font-weight:600; background:${isAdminRole ? 'rgba(245,158,11,0.2)' : 'rgba(100,116,139,0.2)'}; color:${isAdminRole ? '#f59e0b' : '#94a3b8'};">
              ${user.role || 'operator'}
            </span>
            <span style="padding:4px 10px; border-radius:999px; font-size:0.75rem; font-weight:600; background:${isActive ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}; color:${isActive ? '#10b981' : '#ef4444'};">
              ${isActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
        </div>

        <!-- Password hanya visible untuk admin -->
        <div style="margin:12px 0; padding:12px; background:rgba(239,68,68,0.08); border:1px dashed rgba(239,68,68,0.3); border-radius:8px; font-family:monospace; color:#f87171; font-size:0.9rem;">
          🔓 ${user.password || 'N/A'}
        </div>

        ${!isCurrentUser ? `
          <div style="display: flex; gap: 12px; margin-top: 12px;">
            <button onclick="toggleUserStatus('${user.username}')" style="flex:1; padding:10px; background:${isActive ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)'}; color:${isActive ? '#ef4444' : '#10b981'}; border:1px solid ${isActive ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}; border-radius:8px; cursor:pointer; font-weight:600;">
              ${isActive ? 'Nonaktifkan' : 'Aktifkan'}
            </button>
            <button onclick="deleteUser('${user.username}')" style="padding:10px 16px; background:rgba(239,68,68,0.1); color:#ef4444; border:1px solid rgba(239,68,68,0.3); border-radius:8px; cursor:pointer;">
              Hapus
            </button>
          </div>
        ` : `
          <div style="text-align:center; color:#64748b; font-size:0.875rem; padding:12px;">
            Tidak dapat mengedit akun sendiri
          </div>
        `}
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

// ============================================
// Toggle Status User
// ============================================

window.toggleUserStatus = async function(username) {
  if (!confirm(`Yakin ingin mengubah status user ${username}?`)) return;

  const user = currentUsers.find(u => String(u.username).toLowerCase() === String(username).toLowerCase());
  if (!user) return;

  const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

  try {
    const result = await updateUserStatus(username, newStatus);
    if (result.success) {
      showCustomAlert(`Status ${username} diubah menjadi ${newStatus}`, 'success');
      loadUserList(); // refresh list
    } else {
      showCustomAlert(result.error || 'Gagal mengubah status', 'error');
    }
  } catch (err) {
    showCustomAlert('Gagal mengubah status user', 'error');
  }
};

async function updateUserStatus(username, newStatus) {
  return new Promise((resolve, reject) => {
    const callbackName = 'statusCallback_' + Date.now();
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
    script.src = `${GAS_URL}?action=updateUserStatus&username=${encodeURIComponent(username)}&status=${newStatus}&adminUser=${encodeURIComponent(getCurrentUser()?.username || '')}&callback=${callbackName}`;
    script.onerror = () => {
      clearTimeout(timeout);
      cleanupJSONP(callbackName);
      reject(new Error('Network error'));
    };
    document.body.appendChild(script);
  });
}

// ============================================
// Hapus User
// ============================================

window.deleteUser = async function(username) {
  if (!confirm(`Yakin ingin menghapus user ${username} secara permanen?`)) return;

  try {
    const result = await deleteUserFromServer(username);
    if (result.success) {
      showCustomAlert(`User ${username} berhasil dihapus`, 'success');
      loadUserList(); // refresh
    } else {
      showCustomAlert(result.error || 'Gagal menghapus user', 'error');
    }
  } catch (err) {
    showCustomAlert('Gagal menghapus user', 'error');
  }
};

async function deleteUserFromServer(username) {
  return new Promise((resolve, reject) => {
    const callbackName = 'deleteCallback_' + Date.now();
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
    script.src = `${GAS_URL}?action=deleteUser&username=${encodeURIComponent(username)}&adminUser=${encodeURIComponent(getCurrentUser()?.username || '')}&callback=${callbackName}`;
    script.onerror = () => {
      clearTimeout(timeout);
      cleanupJSONP(callbackName);
      reject(new Error('Network error'));
    };
    document.body.appendChild(script);
  });
}

// ============================================
// Tambah User Baru (Modal Form)
// ============================================

function showAddUserForm() {
  const modal = document.getElementById('userManagementModal');
  if (!modal) return;

  // Simpan konten lama untuk restore
  modal.setAttribute('data-old-content', modal.innerHTML);

  modal.innerHTML = `
    <div style="max-width: 520px; width: 100%; margin: 40px auto; background: #1e293b; border-radius: 16px; overflow: hidden;">
      <div style="padding: 20px; background: linear-gradient(135deg, #334155, #1e293b); display: flex; justify-content: space-between; align-items: center;">
        <h2 style="margin: 0; font-size: 1.4rem; color: #e2e8f0;">➕ Tambah User Baru</h2>
        <button id="backToListBtn" style="background: none; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer;">×</button>
      </div>

      <div style="padding: 24px;">
        <form id="addUserForm" style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label style="display: block; margin-bottom: 6px; color: #cbd5e1; font-size: 0.9rem;">Username</label>
            <input type="text" id="newUsername" required placeholder="contoh: operator1" style="width: 100%; padding: 12px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: white; font-size: 1rem;">
          </div>

          <div>
            <label style="display: block; margin-bottom: 6px; color: #cbd5e1; font-size: 0.9rem;">Nama Lengkap</label>
            <input type="text" id="newName" required placeholder="Nama Lengkap" style="width: 100%; padding: 12px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: white; font-size: 1rem;">
          </div>

          <div>
            <label style="display: block; margin-bottom: 6px; color: #cbd5e1; font-size: 0.9rem;">Password</label>
            <input type="text" id="newPassword" required placeholder="Masukkan password" style="width: 100%; padding: 12px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: white; font-size: 1rem;">
          </div>

          <div>
            <label style="display: block; margin-bottom: 6px; color: #cbd5e1; font-size: 0.9rem;">Role</label>
            <select id="newRole" style="width: 100%; padding: 12px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: white; font-size: 1rem;">
              <option value="operator">Operator</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label style="display: block; margin-bottom: 6px; color: #cbd5e1; font-size: 0.9rem;">Departemen</label>
            <input type="text" id="newDepartment" value="Unit Utilitas 3B" style="width: 100%; padding: 12px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: white; font-size: 1rem;">
          </div>

          <button type="submit" style="margin-top: 20px; padding: 14px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; font-size: 1.1rem;">
            Tambah User
          </button>
        </form>
      </div>
    </div>
  `;

  // Event kembali ke list
  document.getElementById('backToListBtn')?.addEventListener('click', () => {
    const oldContent = modal.getAttribute('data-old-content');
    if (oldContent) {
      modal.innerHTML = oldContent;
      loadUserList();
    }
  });

  // Submit form
  document.getElementById('addUserForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleAddUser();
  });
}

async function handleAddUser() {
  const username = document.getElementById('newUsername')?.value?.trim();
  const name = document.getElementById('newName')?.value?.trim();
  const password = document.getElementById('newPassword')?.value?.trim();
  const role = document.getElementById('newRole')?.value;
  const department = document.getElementById('newDepartment')?.value?.trim() || 'Unit Utilitas 3B';

  if (!username || !password || !name) {
    showCustomAlert('Username, nama, dan password wajib diisi', 'error');
    return;
  }

  try {
    const result = await addNewUserToServer({ username, name, password, role, department });

    if (result.success) {
      showCustomAlert(`User ${username} berhasil ditambahkan`, 'success');
      closeUserManagement(); // tutup modal tambah
      setTimeout(showUserManagement, 800); // buka ulang list
    } else {
      showCustomAlert(result.error || 'Gagal menambah user', 'error');
    }
  } catch (err) {
    showCustomAlert('Gagal menambah user baru', 'error');
  }
}

async function addNewUserToServer(userData) {
  return new Promise((resolve, reject) => {
    const callbackName = 'addUserCallback_' + Date.now();
    const timeout = setTimeout(() => {
      cleanupJSONP(callbackName);
      reject(new Error('Timeout'));
    }, 10000);

    window[callbackName] = (response) => {
      clearTimeout(timeout);
      cleanupJSONP(callbackName);
      resolve(response);
    };

    const params = new URLSearchParams({
      action: 'addUser',
      username: userData.username,
      name: userData.name,
      password: userData.password,
      role: userData.role,
      department: userData.department,
      adminUser: getCurrentUser()?.username || '',
      callback: callbackName
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

// ============================================
// Export fungsi utama
// ============================================

export {
  showUserManagement,
  closeUserManagement
};
