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

  // ============================================
  // FALLBACK VALUES (jika config.js belum dimuat)
  // ============================================
  // Penting: pakai typeof check supaya tidak throw ReferenceError
  // jika config.js gagal load atau dibuka via file://
  var FALLBACK_LANDING_URL = 'https://mukminnasri.com';
  var FALLBACK_SESSION_TIMEOUT = 60 * 60 * 1000; // 1 jam

  var LANDING_URL = (typeof LANDING_PAGE_URL !== 'undefined') ? LANDING_PAGE_URL : FALLBACK_LANDING_URL;
  var SESSION_TIMEOUT = (typeof SESSION_TIMEOUT_MS !== 'undefined') ? SESSION_TIMEOUT_MS : FALLBACK_SESSION_TIMEOUT;
  var KEY_VISITED = (typeof STORAGE_KEY_BROWSER_VISITED !== 'undefined') ? STORAGE_KEY_BROWSER_VISITED : 'pakti_browser_visited';
  var KEY_ACTIVITY = (typeof STORAGE_KEY_LAST_ACTIVITY !== 'undefined') ? STORAGE_KEY_LAST_ACTIVITY : 'pakti_last_activity';

  console.log('[Session] Config loaded:', {
    landingUrl: LANDING_URL,
    sessionTimeoutMs: SESSION_TIMEOUT,
    sessionTimeoutMin: SESSION_TIMEOUT / 60000,
  });

  let idleTimer = null;
  let activityThrottleTimer = null;

  /**
   * Cek apakah ini kunjungan pertama di browser ini
   */
  function isFirstVisit() {
    try {
      return localStorage.getItem(KEY_VISITED) !== 'true';
    } catch (e) {
      return true;
    }
  }

  /**
   * Tandai bahwa browser ini sudah pernah visit
   */
  function markVisited() {
    try {
      localStorage.setItem(KEY_VISITED, 'true');
    } catch (e) {
      console.warn('[Session] Tidak bisa set localStorage:', e);
    }
  }

  /**
   * Update timestamp aktivitas terakhir
   */
  function updateLastActivity() {
    try {
      localStorage.setItem(KEY_ACTIVITY, String(Date.now()));
    } catch (e) {
      // ignore
    }
  }

  /**
   * Cek apakah session sudah expired (idle > SESSION_TIMEOUT)
   */
  function isSessionExpired() {
    try {
      const last = parseInt(localStorage.getItem(KEY_ACTIVITY) || '0', 10);
      if (!last) return false;
      const elapsed = Date.now() - last;
      return elapsed > SESSION_TIMEOUT;
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
      localStorage.removeItem(KEY_VISITED);
      localStorage.removeItem(KEY_ACTIVITY);
      sessionStorage.removeItem('adminToken');
      sessionStorage.removeItem('adminUser');
    } catch (e) {
      // ignore
    }

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

    setTimeout(function () {
      window.location.href = LANDING_URL;
    }, 800);
  }

  /**
   * Setup activity listeners
   */
  function setupActivityListeners() {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    events.forEach(function (eventName) {
      window.addEventListener(eventName, function () {
        if (activityThrottleTimer) return;
        activityThrottleTimer = setTimeout(function () {
          updateLastActivity();
          activityThrottleTimer = null;
        }, 30000);
      }, { passive: true });
    });

    window.addEventListener('focus', function () {
      updateLastActivity();
      if (isSessionExpired()) {
        redirectToLanding('session_expired');
      }
    });

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
   * Mulai idle timer - cek setiap 1 menit
   */
  function startIdleCheck() {
    if (idleTimer) clearInterval(idleTimer);
    idleTimer = setInterval(function () {
      if (isSessionExpired()) {
        redirectToLanding('session_expired');
      }
    }, 60000);
  }

  /**
   * Initialize session manager
   */
  function initSessionManager() {
    // 1. Cek apakah browser baru
    if (isFirstVisit()) {
      markVisited();
      updateLastActivity();
      console.log('[Session] Browser baru terdeteksi → redirect ke', LANDING_URL);
      window.location.href = LANDING_URL;
      return;
    }

    // 2. Cek apakah session expired
    if (isSessionExpired()) {
      redirectToLanding('session_expired');
      return;
    }

    // 3. Update aktivitas terakhir
    updateLastActivity();

    // 4. Setup listeners & idle check
    setupActivityListeners();
    startIdleCheck();

    console.log('[Session] ✅ Session manager aktif. Idle timeout:', SESSION_TIMEOUT / 60000, 'menit');
  }

  // Expose untuk debugging (pakai var lokal, bukan referensi langsung)
  window.PAKTI_SESSION = {
    isFirstVisit: isFirstVisit,
    isSessionExpired: isSessionExpired,
    updateLastActivity: updateLastActivity,
    redirectToLanding: redirectToLanding,
    LANDING_URL: LANDING_URL,
    SESSION_TIMEOUT_MS: SESSION_TIMEOUT,
    reset: function () {
      try {
        localStorage.removeItem(KEY_VISITED);
        localStorage.removeItem(KEY_ACTIVITY);
        console.log('[Session] Reset OK. Reload halaman untuk trigger redirect.');
      } catch (e) {}
    },
  };

  // Auto-init saat DOM ready (atau langsung jika sudah ready)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSessionManager);
  } else {
    initSessionManager();
  }
})();
