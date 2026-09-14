/* ============================================
 * PAKTI - Admin Panel Logic
 * ============================================ */

let deleteTargetId = null;
let editTargetId = null;
let statusTargetId = null;

// File storage untuk admin edit dokumen
let adminEditSelectedFiles = {
  foto: null,
  skPangkat: null,
  skJabfung: null,
  pakKonvensional: null,
};

function loadAdminData() {
  filteredData = [...allData];
  renderAdminTable();
}

/**
 * Render admin table
 */
function renderAdminTable() {
  currentPage = 1;
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageData = filteredData.slice(start, end);

  const tbody = document.getElementById('adminTableBody');
  if (!tbody) return;

  if (pageData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 40px;">
          <i class="fas fa-inbox" style="font-size: 40px; color: var(--text-light); margin-bottom: 12px;"></i>
          <p>Tidak ada data</p>
        </td>
      </tr>
    `;
  } else {
    const isAdmin = isCurrentUserAdmin();

    tbody.innerHTML = pageData
      .map((row, index) => {
        const rowIndex = start + index;
        const rowId = row._id || '';

        const actionButtons = isAdmin
          ? `<div style="display: flex; gap: 6px;">
              <button class="btn btn-primary btn-sm btn-icon" onclick="showDetail(${rowIndex})" title="Lihat Detail">
                <i class="fas fa-eye"></i>
              </button>
              <button class="btn btn-success btn-sm btn-icon" onclick="showEdit(${rowIndex})" title="Edit Data">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-warning btn-sm btn-icon" onclick="openStatusModal(${rowIndex})" title="Update Status">
                <i class="fas fa-tasks"></i>
              </button>
              <button class="btn btn-danger btn-sm btn-icon" onclick="openDeleteModal('${escapeHtml(String(rowId))}')" title="Hapus Data">
                <i class="fas fa-trash"></i>
              </button>
            </div>`
          : '<span style="color: var(--text-light)">View Only</span>';

        return `
          <tr>
            <td>${rowIndex + 1}</td>
            <td><strong>${escapeHtml(row['Nama Lengkap dengan Gelar'] || '-')}</strong></td>
            <td>${escapeHtml(row['NIP'] || '-')}</td>
            <td>${escapeHtml(row['Pangkat/Gol'] || '-')}</td>
            <td>${escapeHtml(row['Satuan Kerja'] || '-')}</td>
            <td>${escapeHtml(row['Jenis JF'] || '-')}</td>
            <td>${getStatusBadge(row['Status'])}</td>
            <td>${formatDate(row['Update Terakhir'])}</td>
            <td>${actionButtons}</td>
          </tr>
        `;
      })
      .join('');
  }

  renderPagination('admin', filteredData.length);
}

/**
 * Filter admin data
 */
function filterAdmin() {
  const searchInput = document.getElementById('adminSearch');
  const filterJFEl = document.getElementById('adminFilterJF');
  const filterStatusEl = document.getElementById('adminFilterStatus');
  const filterSatkerEl = document.getElementById('adminFilterSatker');

  const search = searchInput ? searchInput.value.toLowerCase() : '';
  const filterJF = filterJFEl ? filterJFEl.value : '';
  const filterStatus = filterStatusEl ? filterStatusEl.value : '';
  const filterSatker = filterSatkerEl ? filterSatkerEl.value : '';

  filteredData = allData.filter((row) => {
    const matchSearch =
      !search ||
      (row['Nama Lengkap dengan Gelar'] || '').toLowerCase().includes(search) ||
      (row['NIP'] || '').includes(search) ||
      (row['Satuan Kerja'] || '').toLowerCase().includes(search);

    const matchJF = !filterJF || row['Jenis JF'] === filterJF;
    const matchStatus = !filterStatus || row['Status'] === filterStatus;
    const matchSatker = !filterSatker || (row['Satuan Kerja'] || '').includes(filterSatker);

    return matchSearch && matchJF && matchStatus && matchSatker;
  });

  renderAdminTable();
}

/**
 * Show detail modal (lengkap dengan link semua dokumen)
 */
function showDetail(index) {
  const row = filteredData[index];
  if (!row) return;

  const dokumenFields = [
    { key: 'Dok_Foto_4x6', label: 'Foto Berwarna 4x6 cm', icon: 'fa-image' },
    { key: 'Dok_SK_Pangkat_2022_2023', label: 'SK Pangkat Terakhir', icon: 'fa-file-pdf' },
    { key: 'Dok_SK_Jabfung_2022_2023', label: 'SK Jabatan Fungsional', icon: 'fa-file-pdf' },
    { key: 'Dok_PAK_Konvensional_s_d_2022', label: 'PAK Konvensional', icon: 'fa-file-contract' },
  ];

  let dokumenHTML = '';
  for (const doc of dokumenFields) {
    if (row[doc.key]) {
      dokumenHTML += `
        <div style="grid-column: 1 / -1; padding: 12px; background: var(--light-bg); border-radius: 8px; margin-bottom: 8px;">
          <label style="font-size: 0.8rem; color: var(--text-light); display: block; margin-bottom: 8px;">
            <i class="fas ${doc.icon}"></i> ${doc.label}
          </label>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn btn-primary btn-sm" onclick="viewDocument('${escapeHtml(row[doc.key])}')">
              <i class="fas fa-eye"></i> Lihat
            </button>
            <a href="${escapeHtml(row[doc.key])}" target="_blank" class="btn btn-success btn-sm" download>
              <i class="fas fa-download"></i> Download
            </a>
          </div>
        </div>
      `;
    }
  }

  const html = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
      <div>
        <label style="font-size: 0.8rem; color: var(--text-light);">Nama Lengkap</label>
        <p style="font-weight: 600;">${escapeHtml(row['Nama Lengkap dengan Gelar'] || '-')}</p>
      </div>
      <div>
        <label style="font-size: 0.8rem; color: var(--text-light);">NIP</label>
        <p style="font-weight: 600;">${escapeHtml(row['NIP'] || '-')}</p>
      </div>
      <div>
        <label style="font-size: 0.8rem; color: var(--text-light);">Email</label>
        <p style="font-weight: 600;">${escapeHtml(row['Email'] || '-')}</p>
      </div>
      <div>
        <label style="font-size: 0.8rem; color: var(--text-light);">No HP</label>
        <p style="font-weight: 600;">${escapeHtml(row['NoHP'] || '-')}</p>
      </div>
      <div>
        <label style="font-size: 0.8rem; color: var(--text-light);">Satuan Kerja</label>
        <p style="font-weight: 600;">${escapeHtml(row['Satuan Kerja'] || '-')}</p>
      </div>
      <div>
        <label style="font-size: 0.8rem; color: var(--text-light);">Jenis JF</label>
        <p style="font-weight: 600;">${escapeHtml(row['Jenis JF'] || '-')}</p>
      </div>
      <div>
        <label style="font-size: 0.8rem; color: var(--text-light);">Jenjang JF</label>
        <p style="font-weight: 600;">${escapeHtml(row['Jenjang JF'] || '-')}</p>
      </div>
      <div>
        <label style="font-size: 0.8rem; color: var(--text-light);">Pangkat/Gol</label>
        <p style="font-weight: 600;">${escapeHtml(row['Pangkat/Gol'] || '-')}</p>
      </div>
      <div>
        <label style="font-size: 0.8rem; color: var(--text-light);">TMT Pangkat</label>
        <p style="font-weight: 600;">${formatDate(row['TMT Pangkat'])}</p>
      </div>
      <div>
        <label style="font-size: 0.8rem; color: var(--text-light);">TMT JF</label>
        <p style="font-weight: 600;">${formatDate(row['TMT JF'])}</p>
      </div>
      <div>
        <label style="font-size: 0.8rem; color: var(--text-light);">Masa Kerja Gol</label>
        <p style="font-weight: 600;">${escapeHtml(row['Masa Kerja Gol'] || '-')}</p>
      </div>
      <div>
        <label style="font-size: 0.8rem; color: var(--text-light);">Status</label>
        <p>${getStatusBadge(row['Status'])}</p>
      </div>
      <div style="grid-column: 1 / -1;">
        <label style="font-size: 0.8rem; color: var(--text-light);">Catatan Admin</label>
        <p style="font-weight: 600;">${escapeHtml(row['Catatan Admin'] || '-')}</p>
      </div>
      ${dokumenHTML}
    </div>
  `;

  const detailBody = document.getElementById('detailModalBody');
  if (detailBody) detailBody.innerHTML = html;
  openModal('detailModal');
}

/**
 * Open status modal
 */
function openStatusModal(index) {
  const row = filteredData[index];
  if (!row) {
    toastError('Data tidak ditemukan!');
    return;
  }

  if (!row._id) {
    toastError('ID record tidak valid (data mungkin lokal/demo). Reload halaman & coba lagi.');
    return;
  }

  statusTargetId = row._id;
  const statusSelect = document.getElementById('updateStatus');
  const catatanInput = document.getElementById('updateCatatan');
  if (statusSelect) statusSelect.value = row['Status'] || 'Menunggu';
  if (catatanInput) catatanInput.value = row['Catatan Admin'] || '';

  openModal('statusModal');
}

/**
 * Submit status update
 */
async function submitStatusUpdate() {
  if (!statusTargetId) {
    toastError('ID data tidak valid!');
    return;
  }

  const newStatus = document.getElementById('updateStatus').value;
  const catatan = document.getElementById('updateCatatan').value;

  const btn = document.querySelector('#statusModal .btn-primary');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Menyimpan...';
  }

  try {
    const result = await updateStatus(statusTargetId, newStatus, catatan);
    toastSuccess('Status berhasil diupdate!');

    // Update local data
    const index = allData.findIndex((row) => row._id === statusTargetId);
    if (index !== -1) {
      allData[index] = result;
    }

    closeModal('statusModal');
    loadAdminData();
  } catch (error) {
    console.error('[Status Update] Error:', error);
    toastError('Gagal merubah status: ' + (error.message || ''));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Simpan';
    }
  }
}

/**
 * Show edit modal - populate semua field
 */
function showEdit(index) {
  const row = filteredData[index];
  if (!row) {
    toastError('Data tidak ditemukan!');
    return;
  }

  if (!row._id) {
    toastError('ID record tidak valid (data mungkin lokal/demo). Reload halaman & coba lagi.');
    return;
  }

  editTargetId = row._id;

  // Set field values
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };

  setVal('editNama', row['Nama Lengkap dengan Gelar']);
  setVal('editNIP', row['NIP']);
  setVal('editPangkatGol', row['Pangkat/Gol']);
  setVal('editJenisJF', row['Jenis JF']);
  setVal('editJenjangJF', row['Jenjang JF']);
  setVal('editSatuanKerja', row['Satuan Kerja']);
  setVal('editTmtpangkat', row['TMT Pangkat']);
  setVal('editTmtjf', row['TMT JF']);
  setVal('editMasaKerjaGol', row['Masa Kerja Gol']);

  // Reset selected files
  adminEditSelectedFiles = { foto: null, skPangkat: null, skJabfung: null, pakKonvensional: null };

  // Reset file upload UI
  ['Foto', 'SKPangkat', 'SKJabfung', 'PAK'].forEach((type) => {
    const fileNameEl = document.getElementById('edit_fileName' + type);
    const uploadAreaEl = document.getElementById('edit_fileUploadArea' + type);
    if (fileNameEl) {
      fileNameEl.style.display = 'none';
      fileNameEl.textContent = '';
    }
    if (uploadAreaEl) uploadAreaEl.classList.remove('has-file');
  });

  openModal('editModal');
}

/**
 * Handle file select dari modal edit admin
 */
function handleEditFileSelect(input, type) {
  const file = input.files[0];
  if (!file) return;

  const config = fileConfig[type];
  if (!config) {
    toastError('Tipe file tidak dikenal');
    return;
  }

  // Validate type
  if (!config.accept.includes(file.type)) {
    const acceptStr = type === 'foto' ? 'JPG, JPEG, atau PNG' : 'PDF';
    toastError(`Hanya file ${acceptStr} yang diizinkan untuk ${config.name}!`);
    return;
  }

  // Validate size
  if (file.size > config.maxSize) {
    const maxSizeStr = type === 'foto' ? '2MB' : '1MB';
    toastError(`Ukuran file maksimal ${maxSizeStr} untuk ${config.name}!`);
    return;
  }

  // Store
  adminEditSelectedFiles[type] = file;

  // Update UI
  const fieldName = type.charAt(0).toUpperCase() + type.slice(1);
  const fileNameEl = document.getElementById('edit_fileName' + fieldName);
  const uploadAreaEl = document.getElementById('edit_fileUploadArea' + fieldName);

  if (fileNameEl) {
    fileNameEl.textContent = '✓ ' + file.name + ' (' + formatFileSize(file.size) + ')';
    fileNameEl.style.display = 'block';
  }
  if (uploadAreaEl) uploadAreaEl.classList.add('has-file');

  toastSuccess(`${config.name} siap diupload`);
}

function handleEditDragOver(event) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.add('drag-over');
}

function handleEditDragLeave(event) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.remove('drag-over');
}

function handleEditDrop(event, type) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.remove('drag-over');
  const files = event.dataTransfer.files;
  if (files.length > 0) {
    const fakeInput = { files: [files[0]] };
    handleEditFileSelect(fakeInput, type);
  }
}

/**
 * Submit edit - update data + upload dokumen baru (jika ada)
 */
async function submitEdit() {
  if (!editTargetId) {
    toastError('ID data tidak valid!');
    return;
  }

  const btn = document.querySelector('#editModal .btn-primary');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Menyimpan...';
  }

  try {
    const fields = {
      nama: document.getElementById('editNama').value,
      nip: document.getElementById('editNIP').value,
      pangkatGol: document.getElementById('editPangkatGol').value,
      jenisJF: document.getElementById('editJenisJF').value,
      jenjangJF: document.getElementById('editJenjangJF').value,
      satuanKerja: document.getElementById('editSatuanKerja').value,
      tmtPangkat: document.getElementById('editTmtpangkat').value,
      tmtJF: document.getElementById('editTmtjf').value,
      masaKerjaGol: document.getElementById('editMasaKerjaGol').value,
    };

    // 1. Update field data
    toastInfo('Menyimpan perubahan data...');
    let result = await adminEditPengajuan(editTargetId, fields);

    // 2. Upload dokumen baru (jika ada yang dipilih)
    const fileTypes = ['foto', 'skPangkat', 'skJabfung', 'pakKonvensional'];
    let uploadedCount = 0;

    for (const fileType of fileTypes) {
      if (adminEditSelectedFiles[fileType]) {
        const config = fileConfig[fileType];
        try {
          toastInfo(`Mengupload ${config.name}...`);
          const url = await uploadDocument(
            adminEditSelectedFiles[fileType],
            config.storagePath,
            fields.nip || editTargetId
          );
          await updateDocumentURL(editTargetId, config.dbField, url);
          uploadedCount++;
        } catch (uploadErr) {
          console.error('[Edit Upload] Error:', uploadErr);
          toastWarning(`Gagal upload ${config.name}: ${uploadErr.message}`);
        }
      }
    }

    // Reload full data dari server untuk mendapat state terbaru
    if (uploadedCount > 0) {
      toastInfo('Memuat ulang data dari server...');
      try {
        await loadDashboardData();
      } catch (e) {
        console.warn('[Edit] Reload gagal, tetap update lokal:', e.message);
      }
    } else {
      // Update local data dengan hasil edit
      const index = allData.findIndex((row) => row._id === editTargetId);
      if (index !== -1) {
        allData[index] = result;
      }
    }

    if (uploadedCount > 0) {
      toastSuccess(`Data berhasil diupdate & ${uploadedCount} dokumen diupload!`);
    } else {
      toastSuccess('Data berhasil diupdate!');
    }

    closeModal('editModal');
    loadAdminData();
  } catch (error) {
    console.error('[Edit Submit] Error:', error);
    toastError('Gagal mengupdate data: ' + (error.message || ''));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Simpan Perubahan';
    }
  }
}

/**
 * Open delete modal
 */
function openDeleteModal(id) {
  if (!id || id === 'undefined' || id === '') {
    toastError('ID data tidak valid!');
    return;
  }
  deleteTargetId = id;
  openModal('deleteModal');
}

/**
 * Confirm delete
 */
async function confirmDelete() {
  if (!deleteTargetId) {
    toastError('ID data tidak valid!');
    return;
  }

  const btn = document.querySelector('#deleteModal .btn-danger');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Menghapus...';
  }

  try {
    await deletePengajuan(deleteTargetId);
    toastSuccess('Data berhasil dihapus!');

    // Remove from local data
    allData = allData.filter((row) => row._id !== deleteTargetId);

    closeModal('deleteModal');
    loadAdminData();
  } catch (error) {
    console.error('[Delete] Error:', error);
    toastError('Gagal menghapus data: ' + (error.message || ''));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-trash"></i> Hapus';
    }
  }
}

/**
 * Refresh admin data - reload from server
 */
function refreshAdmin() {
  if (typeof loadDashboardData === 'function') {
    loadDashboardData().then(() => {
      loadAdminData();
    });
  }
  toastSuccess('Data diperbarui!');
}

/**
 * Export data to CSV
 */
function exportExcel() {
  if (filteredData.length === 0) {
    toastWarning('Tidak ada data untuk diexport');
    return;
  }

  const headers = [
    'No',
    'Nama Lengkap',
    'NIP',
    'Email',
    'No HP',
    'Pangkat/Gol',
    'Satuan Kerja',
    'Jenis JF',
    'Jenjang JF',
    'TMT Pangkat',
    'TMT JF',
    'Masa Kerja Gol',
    'Status',
    'Catatan Admin',
    'Update Terakhir',
  ];

  let csv = headers.join(',') + '\n';

  filteredData.forEach((row, index) => {
    const values = [
      index + 1,
      `"${row['Nama Lengkap dengan Gelar'] || ''}"`,
      `"${row['NIP'] || ''}"`,
      `"${row['Email'] || ''}"`,
      `"${row['NoHP'] || ''}"`,
      `"${row['Pangkat/Gol'] || ''}"`,
      `"${row['Satuan Kerja'] || ''}"`,
      `"${row['Jenis JF'] || ''}"`,
      `"${row['Jenjang JF'] || ''}"`,
      `"${row['TMT Pangkat'] || ''}"`,
      `"${row['TMT JF'] || ''}"`,
      `"${row['Masa Kerja Gol'] || ''}"`,
      `"${row['Status'] || ''}"`,
      `"${(row['Catatan Admin'] || '').replace(/"/g, '""')}"`,
      `"${row['Update Terakhir'] || ''}"`,
    ];
    csv += values.join(',') + '\n';
  });

  // BOM untuk Excel supaya UTF-8 terbaca
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PAK_Export_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  toastSuccess('Export CSV berhasil!');
}
