/* ============================================
 * PAKTI - Modal & Lightbox Helpers
 * ============================================ */

/**
 * Open modal by ID
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

/**
 * Close modal by ID
 */
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

/**
 * Close lightbox
 */
function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    lightbox.classList.remove('active');
    const iframe = document.getElementById('lightboxIframe');
    if (iframe) iframe.src = '';
  }
}

/**
 * Open lightbox with URL
 */
function openLightbox(url) {
  const lightbox = document.getElementById('lightbox');
  const iframe = document.getElementById('lightboxIframe');
  if (lightbox && iframe) {
    iframe.src = url;
    lightbox.classList.add('active');
  }
}

/**
 * View document in modal
 */
function viewDocument(url) {
  if (!url || !url.startsWith('http')) {
    toastWarning('Dokumen belum tersedia atau link tidak valid');
    return;
  }

  const viewer = document.getElementById('documentViewer');
  const link = document.getElementById('documentLink');
  if (viewer && link) {
    viewer.src = url;
    link.href = url;
    openModal('documentModal');
  } else {
    // Fallback: open in new tab
    window.open(url, '_blank');
  }
}

// Close modal on overlay click (registered on DOMContentLoaded)
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', function (e) {
      if (e.target === this) {
        this.classList.remove('active');
      }
    });
  });

  // Close lightbox on overlay click
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    lightbox.addEventListener('click', function (e) {
      if (e.target === this) {
        closeLightbox();
      }
    });
  }

  // ESC key to close modal/lightbox
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach((m) => m.classList.remove('active'));
      closeLightbox();
    }
  });
});

/**
 * Show connection error modal
 */
function showConnectionErrorModal(customMessage) {
  let modal = document.getElementById('connectionErrorModal');
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'connectionErrorModal';
  modal.style.cssText =
    'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;';

  const content = document.createElement('div');
  content.style.cssText =
    'background:white;padding:30px;border-radius:16px;max-width:500px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);';

  const header = document.createElement('div');
  header.style.cssText = 'text-align:center;margin-bottom:20px;';
  header.innerHTML =
    '<i class="fas fa-exclamation-triangle" style="font-size:48px;color:#ef4444;"></i><h2 style="margin:15px 0 10px;color:#1e293b;">Koneksi Gagal</h2>';

  const errorMsg = document.createElement('div');
  errorMsg.style.cssText =
    'background:#fef2f2;padding:15px;border-radius:8px;margin-bottom:20px;color:#991b1b;font-size:14px;line-height:1.6;';
  errorMsg.textContent = customMessage || 'Tidak dapat terhubung ke Supabase.';

  const solution = document.createElement('div');
  solution.style.cssText = 'background:#f0f9ff;padding:15px;border-radius:8px;margin-bottom:20px;font-size:13px;color:#1e40af;';
  solution.innerHTML =
    '<strong>Solusi:</strong><ol style="margin:10px 0 0 20px;padding:0;line-height:1.8;">' +
    '<li>Buka dashboard Supabase</li>' +
    '<li>Pastikan project sudah aktif</li>' +
    '<li>Copy URL & anon key ke file <code>js/config.js</code></li>' +
    '<li>Pastikan tabel <code>pengajuan_pak</code> sudah dibuat</li>' +
    '<li>Periksa RLS policies</li></ol>';

  const buttons = document.createElement('div');
  buttons.style.cssText = 'display:flex;gap:10px;justify-content:center;';

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Tutup';
  closeBtn.style.cssText = 'padding:12px 24px;background:#64748b;color:white;border:none;border-radius:8px;cursor:pointer;';
  closeBtn.onclick = function () {
    modal.remove();
  };

  buttons.appendChild(closeBtn);
  content.appendChild(header);
  content.appendChild(errorMsg);
  content.appendChild(solution);
  content.appendChild(buttons);
  modal.appendChild(content);
  document.body.appendChild(modal);
}
