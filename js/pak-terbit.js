/* ============================================
 * PAKTI - PAK Terbit Page Logic
 * ============================================ */

function loadPakTerbitData() {
  // Reset to initial state
  const initial = document.getElementById('pakTerbitInitial');
  const result = document.getElementById('pakTerbitResult');
  const empty = document.getElementById('pakTerbitEmpty');
  const loading = document.getElementById('pakTerbitLoading');
  const searchInput = document.getElementById('pakTerbitSearchInput');

  if (initial) initial.style.display = 'block';
  if (result) result.style.display = 'none';
  if (empty) empty.style.display = 'none';
  if (loading) loading.style.display = 'none';
  if (searchInput) searchInput.value = '';
}

/**
 * Search PAK Terbit by NIK/NIP
 */
async function searchPAKTerbit() {
  const searchInput = document.getElementById('pakTerbitSearchInput');
  if (!searchInput) return;

  const nikNip = searchInput.value.trim();

  if (!nikNip || nikNip.length < 10) {
    toastError('Masukkan NIK atau NIP yang valid (minimal 10 digit)');
    return;
  }

  // Show loading
  document.getElementById('pakTerbitInitial').style.display = 'none';
  document.getElementById('pakTerbitResult').style.display = 'none';
  document.getElementById('pakTerbitEmpty').style.display = 'none';
  document.getElementById('pakTerbitLoading').style.display = 'block';

  const btnSearch = document.getElementById('btnSearchPAK');
  if (btnSearch) {
    btnSearch.disabled = true;
    btnSearch.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mencari...';
  }

  try {
    // Search via Supabase
    const data = await fetchPAKTerbit(nikNip);

    document.getElementById('pakTerbitLoading').style.display = 'none';

    if (data) {
      renderPakTerbitCard(data);
    } else {
      showPakTerbitEmpty();
    }
  } catch (error) {
    console.error('[PAK Terbit] Error:', error);
    document.getElementById('pakTerbitLoading').style.display = 'none';
    showPakTerbitEmpty();
    toastError('Terjadi kesalahan saat mencari data: ' + (error.message || ''));
  } finally {
    if (btnSearch) {
      btnSearch.disabled = false;
      btnSearch.innerHTML = '<i class="fas fa-search"></i> Cari PAK';
    }
  }
}

/**
 * Render PAK Terbit data card
 * NOTE: Dokumen & foto lama (Foto 4x6, SK Pangkat, SK Jabfung, PAK Konvensional)
 * tidak lagi ditampilkan. Yang ditampilkan hanya dokumen "PAK Integrasi Terbit"
 * (kolom pak_integrasi_terbit, link diisi manual oleh admin via Supabase).
 */
function renderPakTerbitCard(data) {
  const resultContainer = document.getElementById('pakTerbitResult');
  if (!resultContainer) return;

  const updateTerakhir = data['Update Terakhir'] || data['Timestamp'] || '-';
  const formattedDate = formatDate(updateTerakhir);

  // All fields to display
  const allFields = [
    { key: 'Nama Lengkap dengan Gelar', icon: 'fa-user', label: 'Nama Lengkap' },
    { key: 'NIP', icon: 'fa-id-badge', label: 'NIP' },
    { key: 'No Karpeg', icon: 'fa-id-card', label: 'No Karpeg' },
    { key: 'Tempat & Tanggal Lahir', icon: 'fa-calendar-alt', label: 'TTL' },
    { key: 'Pendidikan', icon: 'fa-graduation-cap', label: 'Pendidikan' },
    { key: 'Jenis Kelamin', icon: 'fa-venus-mars', label: 'Jenis Kelamin' },
    { key: 'Pangkat/Gol', icon: 'fa-star', label: 'Pangkat/Gol' },
    { key: 'TMT Pangkat', icon: 'fa-calendar', label: 'TMT Pangkat' },
    { key: 'Jenis JF', icon: 'fa-briefcase', label: 'Jenis JF' },
    { key: 'Jenjang JF', icon: 'fa-layer-group', label: 'Jenjang JF' },
    { key: 'TMT JF', icon: 'fa-calendar-check', label: 'TMT JF' },
    { key: 'Masa Kerja Gol', icon: 'fa-hourglass-half', label: 'Masa Kerja Gol' },
    { key: 'Satuan Kerja', icon: 'fa-building', label: 'Satuan Kerja' },
  ];

  let infoGridHTML = '';
  for (const field of allFields) {
    if (data[field.key] !== undefined && data[field.key] !== '') {
      infoGridHTML += `
        <div class="pak-info-item">
          <span class="pak-info-label"><i class="fas ${field.icon}"></i> ${field.label}</span>
          <span class="pak-info-value">${escapeHtml(data[field.key])}</span>
        </div>
      `;
    }
  }

  // Build "PAK Integrasi Terbit" document HTML
  const integrasiUrl = data['PAK_Integrasi_Terbit'] || '';
  const status = data['Status'] || 'Menunggu';
  let documentsHTML = '';

  if (integrasiUrl) {
    documentsHTML = `
      <div class="pak-doc-item pak-integrasi-doc">
        <div class="pak-doc-header">
          <div class="pak-doc-title">
            <i class="fas fa-file-pdf"></i> Dokumen PAK Integrasi Terbit
          </div>
          <div class="pak-doc-actions">
            <button class="btn-preview-pak" onclick="previewPAKIntegrasiDoc('${encodeURIComponent(integrasiUrl)}')">
              <i class="fas fa-eye"></i> Preview
            </button>
            <button class="btn-download-pak" onclick="downloadPAKIntegrasiDoc('${encodeURIComponent(integrasiUrl)}')">
              <i class="fas fa-download"></i> Download
            </button>
          </div>
        </div>
        <div class="pak-doc-filename">
          <i class="fas fa-paperclip"></i> ${extractFileName(integrasiUrl)}
        </div>
      </div>
    `;
  } else if (status === 'Terbit') {
    documentsHTML = `
      <div class="pak-doc-no-file">
        <i class="fas fa-folder-open"></i>
        Dokumen PAK Integrasi belum diunggah oleh admin.
      </div>
    `;
  } else {
    documentsHTML = `
      <div class="pak-doc-no-file">
        <i class="fas fa-hourglass-half"></i>
        Dokumen PAK Integrasi akan tersedia setelah status pengajuan "Terbit".
      </div>
    `;
  }

  const cardHTML = `
    <div class="pak-data-card">
      <div class="pak-card-header">
        <div class="pak-card-header-left">
          <div class="pak-card-name">${escapeHtml(data['Nama Lengkap dengan Gelar'] || '-')}</div>
          <div class="pak-card-nip"><i class="fas fa-id-badge"></i> NIP: ${escapeHtml(data['NIP'] || '-')}</div>
        </div>
        <div class="pak-card-status-badge ${status === 'Terbit' ? 'status-terbit' : ''}">
          <i class="fas fa-${status === 'Terbit' ? 'check-circle' : 'clock'}"></i> ${status}
        </div>
      </div>

      <div class="pak-card-body">
        <div class="pak-info-grid">
          ${infoGridHTML}

          <div class="pak-info-item">
            <span class="pak-info-label"><i class="fas fa-info-circle"></i> Status</span>
            <span class="pak-info-value">${getStatusBadge(status)}</span>
          </div>
          <div class="pak-info-item">
            <span class="pak-info-label"><i class="fas fa-clock"></i> Update Terakhir</span>
            <span class="pak-info-value">${formattedDate}</span>
          </div>
          <div class="pak-info-item" style="grid-column: 1 / -1;">
            <span class="pak-info-label"><i class="fas fa-sticky-note"></i> Catatan Admin</span>
            <span class="pak-info-value">${escapeHtml(data['Catatan Admin'] || '-')}</span>
          </div>
        </div>

        <div class="pak-card-documents">
          <div class="pak-doc-section-header">
            <i class="fas fa-file-signature"></i> Dokumen PAK Integrasi Terbit
          </div>
          <div class="pak-doc-list">
            ${documentsHTML}
          </div>
        </div>
      </div>
    </div>
  `;

  resultContainer.innerHTML = cardHTML;
  resultContainer.style.display = 'block';
}

function showPakTerbitEmpty() {
  const result = document.getElementById('pakTerbitResult');
  const empty = document.getElementById('pakTerbitEmpty');
  if (result) result.style.display = 'none';
  if (empty) empty.style.display = 'block';
}

/**
 * Decode argumen URL yang di-encode via encodeURIComponent
 * (untuk onclick attribute agar aman dari karakter kutip)
 */
function decodeDocUrlArg(encoded) {
  try {
    return decodeURIComponent(encoded);
  } catch (e) {
    return encoded;
  }
}

/**
 * Deteksi tipe dokumen dari URL (pdf / image / other)
 */
function detectDocTypeFromUrl(url) {
  const lowerUrl = (url || '').toLowerCase().split('?')[0];
  if (/\.(jpg|jpeg|png|gif|webp|bmp)$/.test(lowerUrl)) return 'image';
  if (/\.pdf$/.test(lowerUrl)) return 'pdf';
  return 'other';
}

/**
 * Preview dokumen PAK Integrasi Terbit
 * - PDF      : tampil di modal preview (iframe bawaan browser)
 * - Gambar   : tampil di modal preview (img)
 * - Lainnya  : buka di tab baru
 */
function previewPAKIntegrasiDoc(docUrl) {
  docUrl = decodeDocUrlArg(docUrl);
  if (!docUrl) {
    toastError('Dokumen tidak tersedia');
    return;
  }

  const docType = detectDocTypeFromUrl(docUrl);
  const modal = document.getElementById('pakDocPreviewModal');
  const titleEl = document.getElementById('pakDocPreviewTitle');
  const bodyEl = document.getElementById('pakDocPreviewBody');
  const downloadBtn = document.getElementById('pakDocPreviewDownload');

  if (!modal || !bodyEl) {
    // Fallback: buka di tab baru
    window.open(docUrl, '_blank');
    return;
  }

  // Simpan URL untuk tombol download di modal
  modal.dataset.docUrl = docUrl;
  if (downloadBtn) {
    downloadBtn.setAttribute('onclick', `downloadPAKIntegrasiDoc('${encodeURIComponent(docUrl)}')`);
  }
  if (titleEl) {
    titleEl.textContent = extractFileName(docUrl) || 'Preview Dokumen';
  }

  // Render isi preview sesuai tipe
  if (docType === 'image') {
    bodyEl.innerHTML = `
      <div class="pak-doc-preview-image-wrap">
        <img src="${escapeHtml(docUrl)}" alt="Preview Dokumen" onerror="this.parentElement.innerHTML='<div class=\\'pak-doc-preview-fallback\\'><i class=\\'fas fa-triangle-exclamation\\'></i><p>Gambar tidak dapat dimuat.</p></div>'">
      </div>
    `;
  } else {
    // PDF & tipe lain -> iframe (browser punya viewer PDF bawaan)
    bodyEl.innerHTML = `
      <iframe class="pak-doc-preview-iframe" src="${escapeHtml(docUrl)}" title="Preview Dokumen"></iframe>
    `;
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

/**
 * Tutup modal preview dokumen PAK Integrasi
 */
function closePakDocPreview() {
  const modal = document.getElementById('pakDocPreviewModal');
  const bodyEl = document.getElementById('pakDocPreviewBody');
  if (bodyEl) bodyEl.innerHTML = ''; // stop loading iframe/img
  if (modal) {
    modal.classList.remove('active');
    delete modal.dataset.docUrl;
  }
  document.body.style.overflow = '';
}

/**
 * Download dokumen PAK Integrasi Terbit
 * Menggunakan fetch -> blob agar file langsung terunduh
 * (atribut `download` tidak berlaku untuk cross-origin URL).
 * Jika fetch gagal (CORS/jaringan), fallback: buka tab baru.
 */
async function downloadPAKIntegrasiDoc(docUrl) {
  docUrl = decodeDocUrlArg(docUrl);
  if (!docUrl) {
    toastError('Dokumen tidak tersedia');
    return;
  }

  toastInfo('Menyiapkan unduhan...');

  try {
    const response = await fetch(docUrl, { mode: 'cors' });
    if (!response.ok) throw new Error('HTTP ' + response.status);

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = extractFileName(docUrl) || 'dokumen-pak-integrasi';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);

    toastSuccess('Dokumen berhasil diunduh');
  } catch (error) {
    console.warn('[PAK Terbit] Blob download gagal, fallback ke tab baru:', error);
    window.open(docUrl, '_blank');
    toastInfo('Dokumen dibuka di tab baru. Klik kanan -> "Save as" untuk menyimpan.');
  }
}
