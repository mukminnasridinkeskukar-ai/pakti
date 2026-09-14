/* ============================================
 * PAKTI - Toast Notifications
 * ============================================ */

/**
 * Show toast notification
 * @param {string} message - Pesan yang akan ditampilkan
 * @param {string} type - success | error | warning | info
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) {
    console.warn('[Toast] Container tidak ditemukan, fallback ke console:', type, message);
    return;
  }

  const icons = {
    success: 'fa-check-circle',
    error: 'fa-times-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle',
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fas ${icons[type] || icons.info} toast-icon"></i>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  // Auto remove after 3.5 seconds
  setTimeout(() => {
    toast.style.animation = 'toastIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/**
 * Convenience methods
 */
function toastSuccess(message) {
  showToast(message, 'success');
}

function toastError(message) {
  showToast(message, 'error');
}

function toastWarning(message) {
  showToast(message, 'warning');
}

function toastInfo(message) {
  showToast(message, 'info');
}
