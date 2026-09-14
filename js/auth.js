/* ============================================
 * PAKTI - Authentication
 * ============================================
 * Authentication menggunakan tabel `admin_users` di Supabase
 * (atau sessionStorage sebagai fallback untuk demo).
 *
 * Skema admin_users:
 * - id (uuid, PK)
 * - username (text, unique)
 * - password (text) - sebaiknya hash di server
 * - role (text) - 'admin' | 'sdmk'
 * - nama (text)
 * - satuan_kerja (text) - 'all' untuk admin, nama satker untuk sdmk
 * ============================================ */

let adminToken = sessionStorage.getItem('adminToken');
let currentUser = null;

// Load stored user
(function loadStoredUser() {
  const stored = sessionStorage.getItem('adminUser');
  if (stored) {
    try {
      currentUser = JSON.parse(stored);
    } catch (e) {
      sessionStorage.removeItem('adminUser');
      sessionStorage.removeItem('adminToken');
    }
  }
})();

// Halaman yang membutuhkan login
const RESTRICTED_PAGES = ['admin'];

// Halaman yang hanya bisa diakses admin
const ADMIN_ONLY_PAGES = ['admin'];

/**
 * Handle login via modal
 */
async function handleModalLogin(e) {
  if (e) e.preventDefault();

  const usernameInput = document.getElementById('modalLoginUsername');
  const passwordInput = document.getElementById('modalLoginPassword');
  if (!usernameInput || !passwordInput) return;

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    toastWarning('Username dan password wajib diisi!');
    return;
  }

  toastInfo('Sedang login...');

  try {
    // Coba autentikasi via Supabase terlebih dahulu
    if (isSupabaseReady()) {
      const { data, error } = await supabaseClient
        .from('admin_users')
        .select('*')
        .eq('username', username)
        .eq('password', password) // NOTE: Hash di production
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Login berhasil
        currentUser = {
          username: data.username,
          role: data.role,
          nama: data.nama,
          satuanKerja: data.satuan_kerja || 'all',
        };
        adminToken = btoa(username + ':' + Date.now());
        sessionStorage.setItem('adminToken', adminToken);
        sessionStorage.setItem('adminUser', JSON.stringify(currentUser));

        closeModal('loginModal');
        showApp();
        loadDashboardData();

        const roleLabel = currentUser.role === 'admin' ? 'Administrator' : currentUser.nama;
        toastSuccess('Login berhasil sebagai ' + roleLabel + '!');

        usernameInput.value = '';
        passwordInput.value = '';
        return;
      }
    }

    // Fallback: gunakan credentials demo (offline)
    if (typeof DEMO_USERS !== 'undefined' && DEMO_USERS.length > 0) {
      const user = DEMO_USERS.find((u) => u.username === username && u.password === password);
      if (user) {
        currentUser = user;
        adminToken = btoa(username + ':' + Date.now());
        sessionStorage.setItem('adminToken', adminToken);
        sessionStorage.setItem('adminUser', JSON.stringify(user));

        closeModal('loginModal');
        showApp();
        loadDashboardData();

        const roleLabel = user.role === 'admin' ? 'Administrator' : user.nama;
        toastSuccess('Login berhasil sebagai ' + roleLabel + '!');
        usernameInput.value = '';
        passwordInput.value = '';
        return;
      }
    }

    toastError('Username atau password salah!');
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    toastError('Gagal login: ' + (error.message || 'unknown error'));
  }
}

/**
 * Logout
 */
function handleLogout() {
  sessionStorage.removeItem('adminToken');
  sessionStorage.removeItem('adminUser');
  adminToken = null;
  currentUser = null;
  showApp();
  navigateTo('dashboard');
  toastSuccess('Logout berhasil!');
}

function showLogin() {
  // App selalu tampil - halaman admin memerlukan login via modal
  showApp();
}

function showLoginModal() {
  openModal('loginModal');
}

function showApp() {
  const loginPage = document.getElementById('loginPage');
  const appContainer = document.getElementById('appContainer');
  const userInfo = document.getElementById('userInfo');
  const headerLogoutBtn = document.getElementById('headerLogoutBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  if (loginPage) loginPage.style.display = 'none';
  if (appContainer) appContainer.style.display = 'flex';

  if (adminToken && currentUser) {
    if (userInfo) userInfo.style.display = 'flex';
    if (headerLogoutBtn) headerLogoutBtn.style.display = 'inline-flex';
    if (logoutBtn) logoutBtn.style.display = 'flex';

    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');
    if (userNameEl) userNameEl.textContent = currentUser.nama || currentUser.username;
    if (userRoleEl)
      userRoleEl.textContent = currentUser.role === 'admin' ? 'Administrator' : 'Pengguna';

    updateMenuByRole(currentUser.role);
  } else {
    if (userInfo) userInfo.style.display = 'none';
    if (headerLogoutBtn) headerLogoutBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
    updateMenuByRole(null);
  }
}

function updateMenuByRole(role) {
  const adminMenuItems = document.querySelectorAll('[data-page="admin"]');
  adminMenuItems.forEach((item) => {
    item.style.display = role === 'admin' ? 'flex' : 'none';
  });

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.style.display = adminToken ? 'flex' : 'none';
}

function toggleUserMenu() {
  const dropdown = document.getElementById('userDropdown');
  if (dropdown) {
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  }
}

// Close dropdown when clicking outside
document.addEventListener('click', function (e) {
  const userInfo = document.getElementById('userInfo');
  const dropdown = document.getElementById('userDropdown');
  if (userInfo && dropdown && !userInfo.contains(e.target)) {
    dropdown.style.display = 'none';
  }
});

/**
 * Cek apakah user saat ini adalah admin
 */
function isCurrentUserAdmin() {
  return currentUser && currentUser.role === 'admin';
}

/**
 * Get current user (untuk dipakai di modul lain)
 */
function getCurrentUser() {
  return currentUser;
}
