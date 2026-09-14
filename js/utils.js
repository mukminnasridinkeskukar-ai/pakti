/* ============================================
 * PAKTI - Utility Functions
 * ============================================ */

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format date to Indonesian locale
 */
function formatDate(dateString) {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return String(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch (e) {
    return String(dateString);
  }
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Get status badge HTML
 */
function getStatusBadge(status) {
  const statusMap = {
    Menunggu: 'badge-menunggu',
    Perbaikan: 'badge-perbaikan',
    Ditolak: 'badge-ditolak',
    Terbit: 'badge-terbit',
  };
  const labelMap = {
    Menunggu: 'Menunggu',
    Perbaikan: 'Perbaikan',
    Ditolak: 'Ditolak',
    Terbit: 'Terbit',
  };
  const className = statusMap[status] || 'badge-menunggu';
  const label = labelMap[status] || 'Menunggu';
  return `<span class="badge ${className}">${label}</span>`;
}

/**
 * Extract filename from URL
 */
function extractFileName(url) {
  try {
    if (!url) return 'Tidak ada file';
    if (url.includes('supabase') || url.includes('storage')) {
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/');
      const lastPart = parts[parts.length - 1];
      return lastPart ? decodeURIComponent(lastPart) : 'Dokumen';
    }
    const pathname = new URL(url).pathname;
    return pathname.split('/').pop() || 'Dokumen.pdf';
  } catch (e) {
    return 'Dokumen.pdf';
  }
}

/**
 * Convert camelCase field name to Space-separated Label
 */
function fieldToLabel(field) {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

/**
 * Debounce function
 */
function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Convert ISO timestamp to readable Indonesian date-time
 */
function formatDateTime(dateString) {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return String(dateString);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return String(dateString);
  }
}

/**
 * Validate NIP (18 digit numeric)
 */
function isValidNIP(nip) {
  return /^\d{18}$/.test(nip);
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Show confirm dialog (Promise-based)
 */
function confirmDialog(message) {
  return Promise.resolve(window.confirm(message));
}
