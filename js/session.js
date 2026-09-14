/* ============================================
 * PAKTI - Session & Redirect Manager
 * ============================================
 *
 * Fitur:
 * 1. Browser baru (tidak pernah visit) → redirect ke LANDING_PAGE_URL dulu
 * 2. Idle lebih dari SESSION_TIMEOUT_MS (1 jam) → auto redirect ke LANDING_PAGE_URL
 * 3. Update aktivitas user secara berkala
 *
 * Konfigurasi ada di js/config.js:
 *   - LANDING_PAGE_URL
 *   - SESSION_TIMEOUT_MS
 *   - STORAGE_KEY_BROWSER_VISITED
 *   - STORAGE_KEY_LAST_ACTIVITY
 * ============================================ */

(function () {
  // Cegah double-eksekusi
  if (window.__paktiSessionManager) return;
  window.__paktiSessionManager = true;

  let idleTimer = null;
  let activityThrottleTimer = null;

  /**
   * Cek apakah ini kunjungan pertama di browser ini
   * (flag disimpan di localStorage, tidak di sessionStorage,
   * supaya bertahan walaupun tab ditutup).
   */
  function isFirstVisit() {
    try {
      return localStorage.getItem(STORAGE_KEY_BROWSER_VISITED) !== 'true';
    } catch (e) {
      // LocalStorage mungkin diblokir (incognito / privacy mode)
      // Fallback: anggap true (treat as first visit)
      return true;
    }
  }

  /**
   * Tandai bahwa browser ini sudah pernah visit
   */
  function markVisited() {
    try {
      localStorage.setItem(STORAGE_KEY_BROWSER_VISITED, 'true');
    } catch (e) {
      console.warn('[Session] Tidak bisa set localStorage:', e);
    }
  }

  /**
   * Update timestamp aktivitas terakhir
   */
  function updateLastActivity() {
    try {
      localStorage.setItem(STORAGE_KEY_LAST_ACTIVITY, String(Date.now()));
    } catch (e) {
      // ignore
    }
  }

  /**
   * Cek apakah session sudah expired (idle > SESSION_TIMEOUT_MS)
   */
  function isSessionExpired() {
    try {
      const last = parseInt(localStorage.getItem(STORAGE_KEY_LAST_ACTIVITY) || '0', 10);
      if (!last) return false; // belum ada record aktivitas
      const elapsed = Date.now() - last;
      return elapsed > SESSION_TIMEOUT_MS;
    } catch (e) {
      return false;
    }
  }

  /**
   * Redirect ke landing page
   */
  function redirectToLanding(reason) {
    console.log('[Session] Redirect ke landing page. Reason:', reason);
    try {
      // Hapus flag visited supaya saat user kembali, dia dialihkan lagi
      // ke landing page (memenuhi syarat "setiap masuk kembali")
      localStorage.removeItem(STORAGE_KEY_BROWSER_VISITED);
      localStorage.removeItem(STORAGE_KEY_LAST_ACTIVITY);

      // Juga clear session admin
      sessionStorage.removeItem('adminToken');
      sessionStorage.removeItem('adminUser');
    } catch (e) {
      // ignore
    }

    // Tampilkan notifikasi sebentar sebelum redirect
    if (typeof showToast === 'function') {
      try {
        showToast(
          reason === 'session_expired'
            ? 'Sesi Anda telah berakhir (idle > 1 jam). Mengarahkan ke landing page...'
            : 'Mengarahkan ke landing page...',
          'info'
        );
      } catch (e) {}
    }

    // Delay 800ms supaya toast sempat tampil
    setTimeout(function () {
      window.location.href = LANDING_PAGE_URL;
    }, 800);
  }

  /**
   * Setup activity listeners (mouse, keyboard, scroll, touch)
   * Throttled untuk performa
   */
  function setupActivityListeners() {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    events.forEach(function (eventName) {
      window.addEventListener(eventName, function () {
        // Throttle: update paling tidak setiap 30 detik
        if (activityThrottleTimer) return;
        activityThrottleTimer = setTimeout(function () {
          updateLastActivity();
          activityThrottleTimer = null;
        }, 30000);
      }, { passive: true });
    });

    // Update saat window dapat fokus kembali
    window.addEventListener('focus', function () {
      updateLastActivity();
      // Cek apakah selama tab inactive, session sudah expired
      if (isSessionExpired()) {
        redirectToLanding('session_expired');
      }
    });

    // Update saat visibility berubah (user kembali ke tab)
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) {
        if (isSessionExpired()) {
          redirectToLanding('session_expired');
        } else {
          updateLastActivity();
        }
      }
    });
  }

  /**
   * Mulai idle timer - cek setiap 1 menit apakah session expired
   */
  function startIdleCheck() {
    if (idleTimer) clearInterval(idleTimer);
    idleTimer = setInterval(function () {
      if (isSessionExpired()) {
        redirectToLanding('session_expired');
      }
    }, 60000); // cek tiap 1 menit
  }

  /**
   * Initialize session manager
   * Dipanggil SANGAT AWAL, sebelum splash & app init
   */
  function initSessionManager() {
    // 1. Cek apakah browser baru (belum pernah visit)
    if (isFirstVisit()) {
      // Tandai sudah visit dulu (supaya setelah redirect dari landing page, tidak loop)
      markVisited();
      updateLastActivity();

      // Redirect ke landing page
      console.log('[Session] Browser baru terdeteksi → redirect ke', LANDING_PAGE_URL);

      // PENTING: Karena ini first visit, redirect ke landing page.
      // User akan kembali ke PAKTI setelah mengunjungi landing page.
      // Saat dia kembali, isFirstVisit() akan return false
      // (karena kita sudah markVisited() di atas).
      window.location.href = LANDING_PAGE_URL;
      return;
    }

    // 2. Cek apakah session sudah expired (idle > 1 jam)
    if (isSessionExpired()) {
      redirectToLanding('session_expired');
      return;
    }

    // 3. Update aktivitas terakhir
    updateLastActivity();

    // 4. Setup listeners & idle check
    setupActivityListeners();
    startIdleCheck();

    console.log('[Session] ✅ Session manager aktif. Idle timeout:', SESSION_TIMEOUT_MS / 60000, 'menit');
  }

  // Expose untuk debugging
  window.PAKTI_SESSION = {
    isFirstVisit: isFirstVisit,
    isSessionExpired: isSessionExpired,
    updateLastActivity: updateLastActivity,
    redirectToLanding: redirectToLanding,
    LANDING_PAGE_URL: LANDING_PAGE_URL,
    SESSION_TIMEOUT_MS: SESSION_TIMEOUT_MS,
  };

  // Auto-init saat DOM ready (atau langsung jika sudah ready)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSessionManager);
  } else {
    initSessionManager();
  }
})();
