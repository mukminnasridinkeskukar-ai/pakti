/* ============================================
 * PAKTI - Navigation
 * ============================================ */

/**
 * Pindah halaman
 */
function navigateTo(page) {
  // Cek akses halaman terbatas
  if (RESTRICTED_PAGES.includes(page) && !adminToken) {
    toastWarning('Silakan login terlebih dahulu!');
    showLoginModal();
    return;
  }

  // Cek akses halaman admin-only
  if (ADMIN_ONLY_PAGES.includes(page) && currentUser && currentUser.role !== 'admin') {
    toastError('Anda tidak memiliki akses ke halaman ini!');
    return;
  }
  if (ADMIN_ONLY_PAGES.includes(page) && !currentUser) {
    toastWarning('Silakan login sebagai admin!');
    showLoginModal();
    return;
  }

  // Update active state menu
  document.querySelectorAll('.menu-item').forEach((item) => {
    item.classList.remove('active');
    if (item.getAttribute('data-page') === page) {
      item.classList.add('active');
    }
  });

  // Update page title
  const titles = {
    dashboard: 'Dashboard Data',
    formulir: 'Formulir Pengajuan',
    tracking: 'Pemantauan Proses',
    pakTerbit: 'Cek PAK Terbit',
    cekStatus: 'Cek Status Pengajuan',
    petunjuk: 'Petunjuk Penggunaan',
    dataMaster: 'Data Master (Sheet DATA)',
    pembuatanPAK: 'Pembuatan PAK Integrasi',
    admin: 'Kelola Data Pengajuan',
  };
  const pageTitleEl = document.getElementById('pageTitle');
  if (pageTitleEl) pageTitleEl.textContent = titles[page] || 'Beranda';

  // Show page section
  document.querySelectorAll('.page-section').forEach((section) => {
    section.classList.remove('active');
  });
  const pageSection = document.getElementById(page + 'Page');
  if (pageSection) pageSection.classList.add('active');

  // Close mobile sidebar
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.remove('active');

  // Load page-specific data
  if (page === 'dashboard') {
    loadDashboardData();
  } else if (page === 'tracking') {
    loadTrackingData();
  } else if (page === 'pakTerbit') {
    loadPakTerbitData();
  } else if (page === 'cekStatus') {
    const nikInput = document.getElementById('cekNikInput');
    const resultDiv = document.getElementById('cekStatusResult');
    if (nikInput) nikInput.value = '';
    if (resultDiv) resultDiv.innerHTML = '';
  } else if (page === 'admin') {
    loadAdminData();
  } else if (page === 'dataMaster') {
    if (typeof loadDataMaster === 'function') loadDataMaster();
  } else if (page === 'pembuatanPAK') {
    if (typeof loadPembuatanPAKData === 'function') loadPembuatanPAKData();
  } else if (page === 'petunjuk') {
    if (typeof initPetunjukPage === 'function') initPetunjukPage();
  }
}

/**
 * Setup navigation event listeners
 */
function setupNavigation() {
  // Mobile menu toggle
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', function () {
      const sidebar = document.getElementById('sidebar');
      if (sidebar) sidebar.classList.toggle('active');
    });
  }

  // Menu items
  document.querySelectorAll('.menu-item[data-page]').forEach((item) => {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      const page = this.getAttribute('data-page');
      navigateTo(page);
    });
  });

  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  // Header logout button
  const headerLogoutBtn = document.getElementById('headerLogoutBtn');
  if (headerLogoutBtn) {
    headerLogoutBtn.addEventListener('click', handleLogout);
  }

  // Modal login form
  const loginModalForm = document.getElementById('loginModalForm');
  if (loginModalForm) {
    loginModalForm.addEventListener('submit', handleModalLogin);
  }

  // Enter key on PAK Terbit search
  const pakTerbitSearchInput = document.getElementById('pakTerbitSearchInput');
  if (pakTerbitSearchInput) {
    pakTerbitSearchInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        searchPAKTerbit();
      }
    });
  }
}
