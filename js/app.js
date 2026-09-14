/* ============================================
 * PAKTI - Main App Initialization
 * ============================================ */

/**
 * Initialize app after splash screen
 */
function initApp() {
  // Inisialisasi Supabase terlebih dahulu
  const supabaseReady = initSupabase();

  if (!supabaseReady) {
    console.warn('[APP] ⚠️  Supabase belum dikonfigurasi - menjalankan mode demo');
    console.warn('[APP] Edit js/config.js dan isi SUPABASE_URL + SUPABASE_ANON_KEY');
  }

  // Tampilkan app container
  const appContainer = document.getElementById('appContainer');
  if (appContainer) appContainer.style.display = 'flex';

  const loginPage = document.getElementById('loginPage');
  if (loginPage) loginPage.style.display = 'none';

  // Setup navigation, forms, dan event listeners
  setupNavigation();
  setupFormListeners();
  toggleAdminColumns();

  // Tampilkan app (cek status login)
  showApp();

  // Navigasi ke dashboard
  navigateTo('dashboard');

  console.log('[APP] ✅ Aplikasi PAKTI berhasil dimulai');
  console.log('[APP] Supabase status:', supabaseReady ? 'TERHUBUNG' : 'BELUM KONFIGURASI');
}

// Inisialisasi saat DOM ready (fallback jika splash screen tidak ada)
document.addEventListener('DOMContentLoaded', function () {
  // Jika splash screen tidak ada atau sudah hidden, langsung init app
  const splash = document.getElementById('splashScreen');
  if (!splash || splash.style.display === 'none') {
    if (typeof initApp === 'function') {
      // Tunggu sebentar untuk memastikan semua script sudah dimuat
      setTimeout(initApp, 100);
    }
  }
  // Jika splash screen ada, initApp akan dipanggil oleh splash.js setelah animasi selesai
});
