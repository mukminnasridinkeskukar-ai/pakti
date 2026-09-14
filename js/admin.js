/* ============================================
 * PAKTI - Admin Panel Logic
 * ============================================ */

let deleteTargetId = null;
let editTargetId = null;
let statusTargetId = null;

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
        const actionButtons = isAdmin
          ? `<div style="display: flex; gap: 6px;">
              <button class="btn btn-primary btn-sm btn-icon" onclick="showEdit(${start + index})" title="Edit">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-warning btn-sm btn-icon" onclick="openStatusModal(${start + index})" title="Update Status">
                <i class="fas fa-tasks"></i>
              </button>
              <button class="btn btn-danger btn-sm btn-icon" onclick="openDeleteModal('${escapeHtml(row._id || '')}')" title="Hapus">
                <i class="fas fa-trash"></i>
              </button>
            </div>`
          : '<span style="color: var(--text-light)">View Only</span>';

        return `
          <tr>
            <td>${start + index + 1}</td>
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
 * Show detail modal
 */
function showDetail(index) {
  const row = filteredData[index];
  if (!row) return;

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
        <p style="font-weight: 600;">${escapeHtml(row['TMT Pangkat'] || '-')}</p>
      </div>
      <div>
        <label style="font-size: 0.8rem; color: var(--text-light);">TMT JF</label>
        <p style="font-weight: 600;">${escapeHtml(row['TMT JF'] || '-')}</p>
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
      ${
        row['Dok_Foto_4x6']
          ? `
      <div style="grid-column: 1 / -1;">
        <label style="font-size: 0.8rem; color: var(--text-light);">Dokumen Foto</label>
        <br>
        <button class="btn btn-primary btn-sm" onclick="viewDocument('${escapeHtml(row['Dok_Foto_4x6'])}')">
          <i class="fas fa-file-image"></i> Lihat Foto
        </button>
      </div>
      `
          : ''
      }
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
  if (!row) return;

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
  if (btn) btn.disabled = true;

  try {
    await updateStatus(statusTargetId, newStatus, catatan);
    toastSuccess('Status berhasil diupdate!');

    // Update local data
    const index = allData.findIndex((row) => row._id === statusTargetId);
    if (index !== -1) {
      allData[index]['Status'] = newStatus;
      allData[index]['Catatan Admin'] = catatan;
      allData[index]['Update Terakhir'] = new Date().toISOString();
    }

    closeModal('statusModal');
    loadAdminData();
  } catch (error) {
    console.error('[Status Update] Error:', error);
    toastError('Gagal merubah status: ' + (error.message || ''));
  } finally {
    if (btn) btn.disabled = false;
  }
}

/**
 * Show edit modal
 */
function showEdit(index) {
  const row = filteredData[index];
  if (!row) return;

  editTargetId = row._id;
  document.getElementById('editNama').value = row['Nama Lengkap dengan Gelar'] || '';
  document.getElementById('editNIP').value = row['NIP'] || '';
  document.getElementById('editPangkatGol').value = row['Pangkat/Gol'] || '';
  document.getElementById('editJenisJF').value = row['Jenis JF'] || '';
  document.getElementById('editJenjangJF').value = row['Jenjang JF'] || '';
  document.getElementById('editSatuanKerja').value = row['Satuan Kerja'] || '';
  document.getElementById('editTmtpangkat').value = row['TMT Pangkat'] || '';
  document.getElementById('editTmtjf').value = row['TMT JF'] || '';
  document.getElementById('editMasaKerjaGol').value = row['Masa Kerja Gol'] || '';

  openModal('editModal');
}

/**
 * Submit edit
 */
async function submitEdit() {
  if (!editTargetId) {
    toastError('ID data tidak valid!');
    return;
  }

  const btn = document.querySelector('#editModal .btn-primary');
  if (btn) btn.disabled = true;

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

  try {
    const result = await adminEditPengajuan(editTargetId, fields);
    toastSuccess('Data berhasil diupdate!');

    // Update local data
    const index = allData.findIndex((row) => row._id === editTargetId);
    if (index !== -1) {
      allData[index] = result;
    }

    closeModal('editModal');
    loadAdminData();
  } catch (error) {
    console.error('[Edit Submit] Error:', error);
    toastError('Gagal mengupdate data: ' + (error.message || ''));
  } finally {
    if (btn) btn.disabled = false;
  }
}

/**
 * Open delete modal
 */
function openDeleteModal(id) {
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
  if (btn) btn.disabled = true;

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
    if (btn) btn.disabled = false;
  }
}

/**
 * Refresh admin data
 */
function refreshAdmin() {
  loadDashboardData(); // Reload from server
  toastSuccess('Data diperbarui!');
}

/**
 * Export data to CSV
 */
function exportExcel() {
  let csv = 'No,Nama Lengkap,NIP,Pangkat/Gol,Satuan Kerja,Jenis JF,Jenjang JF,Status,Catatan\n';
  filteredData.forEach((row, index) => {
    csv +=
      `${index + 1},"${row['Nama Lengkap dengan Gelar'] || ''}","${row['NIP'] || ''}","${row['Pangkat/Gol'] || ''}","${row['Satuan Kerja'] || ''}","${row['Jenis JF'] || ''}","${row['Jenjang JF'] || ''}","${row['Status'] || ''}","${row['Catatan Admin'] || ''}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PAK_Export_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  toastSuccess('Export berhasil!');
}
