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
 */
function renderPakTerbitCard(data) {
  const resultContainer = document.getElementById('pakTerbitResult');
  if (!resultContainer) return;

  // Dokumen list
  const dokumenList = [
    {
      key: 'Dok_Foto_4x6',
      label: 'Foto Berwarna 4x6 cm',
      icon: 'fa-image',
      type: 'image',
      url: data['Dok_Foto_4x6'] || '',
    },
    {
      key: 'Dok_SK_Pangkat_2022_2023',
      label: 'SK Pangkat Terakhir 2022/2023',
      icon: 'fa-file-pdf',
      type: 'pdf',
      url: data['Dok_SK_Pangkat_2022_2023'] || '',
    },
    {
      key: 'Dok_SK_Jabfung_2022_2023',
      label: 'SK Jabatan Fungsional 2022/2023',
      icon: 'fa-file-pdf',
      type: 'pdf',
      url: data['Dok_SK_Jabfung_2022_2023'] || '',
    },
    {
      key: 'Dok_PAK_Konvensional_s_d_2022',
      label: 'PAK Konvensional s/d 2022',
      icon: 'fa-file-contract',
      type: 'pdf',
      url: data['Dok_PAK_Konvensional_s_d_2022'] || '',
    },
  ];

  const driveLink = data['Upload Dokumen (Drive Link)'] || '';
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

  // Build documents HTML
  let documentsHTML = '';
  let hasAnyDocument = false;

  for (const doc of dokumenList) {
    if (doc.url) {
      hasAnyDocument = true;
      const isImage = doc.type === 'image';
      const previewBtn = `<button class="btn-preview-pak" onclick="previewPAKDocument('${escapeHtml(doc.url)}', '${doc.type}')">
          <i class="fas fa-eye"></i> ${isImage ? 'Preview' : 'Lihat'}
        </button>`;

      documentsHTML += `
        <div class="pak-doc-item">
          <div class="pak-doc-header">
            <div class="pak-doc-title">
              <i class="fas ${doc.icon}"></i> ${doc.label}
            </div>
            <div class="pak-doc-actions">
              ${previewBtn}
              <a href="${escapeHtml(doc.url)}" target="_blank" class="btn-download-pak" download>
                <i class="fas fa-download"></i> Download
              </a>
            </div>
          </div>
          <div class="pak-doc-filename">
            <i class="fas fa-paperclip"></i> ${extractFileName(doc.url)}
          </div>
          ${
            isImage
              ? `
            <div class="pak-doc-thumbnail" onclick="previewPAKDocument('${escapeHtml(doc.url)}', 'image')">
              <img src="${escapeHtml(doc.url)}" alt="${doc.label}" loading="lazy" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-image\\' style=\\'font-size:48px;color:#ccc;\\'></i>'">
            </div>
          `
              : ''
          }
        </div>
      `;
    }
  }

  if (!hasAnyDocument) {
    documentsHTML = `
      <div class="pak-doc-no-file" style="padding: 20px; text-align: center; color: #666;">
        <i class="fas fa-folder-open" style="font-size: 32px; margin-bottom: 10px; display: block;"></i>
        Belum ada dokumen yang diupload
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
        <div class="pak-card-status-badge ${data['Status'] === 'Terbit' ? 'status-terbit' : ''}">
          <i class="fas fa-${data['Status'] === 'Terbit' ? 'check-circle' : 'clock'}"></i> ${data['Status'] || 'Menunggu'}
        </div>
      </div>

      <div class="pak-card-body">
        <div class="pak-info-grid">
          ${infoGridHTML}

          <div class="pak-info-item">
            <span class="pak-info-label"><i class="fas fa-info-circle"></i> Status</span>
            <span class="pak-info-value">${getStatusBadge(data['Status'] || 'Menunggu')}</span>
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
            <i class="fas fa-folder-open"></i> Dokumen Pengajuan
            ${
              driveLink
                ? `<a href="${escapeHtml(driveLink)}" target="_blank" class="btn-link-drive">
                <i class="fas fa-external-link-alt"></i> Buka Folder
              </a>`
                : ''
            }
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
 * Preview PAK document
 */
function previewPAKDocument(docUrl, docType) {
  if (!docUrl) {
    toastError('Dokumen tidak tersedia');
    return;
  }

  if (!docType) {
    const lowerUrl = docUrl.toLowerCase();
    if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg') || lowerUrl.includes('.png')) {
      docType = 'image';
    } else {
      docType = 'pdf';
    }
  }

  if (docType === 'image') {
    openLightbox(docUrl);
  } else {
    window.open(docUrl, '_blank');
    toastInfo('Membuka dokumen PDF...');
  }
}
