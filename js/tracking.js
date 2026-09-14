/* ============================================
 * PAKTI - Tracking Page Logic
 * ============================================ */

function loadTrackingData() {
  filteredData = [...allData];
  renderTrackingTable();
}

/**
 * Render tracking table
 */
function renderTrackingTable() {
  currentPage = 1;
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageData = filteredData.slice(start, end);

  const tbody = document.getElementById('trackingTableBody');
  if (!tbody) return;

  if (pageData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px;">
          <i class="fas fa-inbox" style="font-size: 40px; color: var(--text-light); margin-bottom: 12px;"></i>
          <p>Tidak ada data</p>
        </td>
      </tr>
    `;
  } else {
    const isAdmin = isCurrentUserAdmin();

    tbody.innerHTML = pageData
      .map((row, index) => {
        const actionCell = isAdmin
          ? `<td>
              <button class="btn btn-primary btn-sm" onclick="showDetail(${start + index})">
                <i class="fas fa-eye"></i> Detail
              </button>
            </td>`
          : '';
        return `
          <tr>
            <td>${start + index + 1}</td>
            <td><strong>${escapeHtml(row['Nama Lengkap dengan Gelar'] || '-')}</strong></td>
            <td>${escapeHtml(row['Satuan Kerja'] || '-')}</td>
            <td>${escapeHtml(row['Jenis JF'] || '-')}</td>
            <td>${getStatusBadge(row['Status'])}</td>
            <td>${escapeHtml(row['Catatan Admin'] || '-')}</td>
            ${actionCell}
          </tr>`;
      })
      .join('');
  }

  toggleAdminColumns();
  renderPagination('tracking', filteredData.length);
}

/**
 * Filter tracking data
 */
function filterTracking() {
  const searchInput = document.getElementById('trackingSearch');
  const filterStatusEl = document.getElementById('trackingFilterStatus');
  const filterSatkerEl = document.getElementById('trackingFilterSatker');

  const search = searchInput ? searchInput.value.toLowerCase() : '';
  const filterStatus = filterStatusEl ? filterStatusEl.value : '';
  const filterSatker = filterSatkerEl ? filterSatkerEl.value : '';

  filteredData = allData.filter((row) => {
    const matchSearch =
      !search || (row['Nama Lengkap dengan Gelar'] || '').toLowerCase().includes(search);
    const matchStatus = !filterStatus || row['Status'] === filterStatus;
    const matchSatker =
      !filterSatker || (row['Satuan Kerja'] || '').includes(filterSatker);
    return matchSearch && matchStatus && matchSatker;
  });

  renderTrackingTable();
}

/**
 * Toggle admin-only columns visibility
 */
function toggleAdminColumns() {
  if (isCurrentUserAdmin()) {
    document.body.classList.add('is-admin');
  } else {
    document.body.classList.remove('is-admin');
  }
}
