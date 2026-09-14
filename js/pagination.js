/* ============================================
 * PAKTI - Pagination Helper
 * ============================================ */

/**
 * Render pagination controls
 */
function renderPagination(type, totalItems) {
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const end = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  const infoEl = document.getElementById(type + 'PaginationInfo');
  if (infoEl) {
    infoEl.textContent = `Menampilkan ${totalItems > 0 ? start : 0} - ${end} dari ${totalItems} data`;
  }

  const controlsEl = document.getElementById(type + 'Pagination');
  if (!controlsEl) return;

  let buttons = '';

  // Previous button
  buttons += `<button class="pagination-btn" onclick="changePage('${type}', ${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
    <i class="fas fa-chevron-left"></i>
  </button>`;

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      buttons += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="changePage('${type}', ${i})">${i}</button>`;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      buttons += `<span style="padding: 0 8px;">...</span>`;
    }
  }

  // Next button
  buttons += `<button class="pagination-btn" onclick="changePage('${type}', ${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
    <i class="fas fa-chevron-right"></i>
  </button>`;

  controlsEl.innerHTML = buttons;
}

/**
 * Change page
 */
function changePage(type, page) {
  currentPage = page;
  const start = (page - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageData = filteredData.slice(start, end);

  const tbodyId = type + 'TableBody';
  const tbody = document.getElementById(tbodyId);
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
  } else if (type === 'dashboard') {
    tbody.innerHTML = pageData
      .map(
        (row, index) => `
        <tr>
          <td>${start + index + 1}</td>
          <td><strong>${escapeHtml(row['Nama Lengkap dengan Gelar'] || '-')}</strong></td>
          <td>${escapeHtml(row['NIP'] || '-')}</td>
          <td>${escapeHtml(row['Satuan Kerja'] || '-')}</td>
          <td>${escapeHtml(row['Jenis JF'] || '-')}</td>
          <td>${escapeHtml(row['Jenjang JF'] || '-')}</td>
          <td>${getStatusBadge(row['Status'])}</td>
          <td>${formatDate(row['Timestamp'])}</td>
        </tr>
      `
      )
      .join('');
  } else if (type === 'tracking') {
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
  } else if (type === 'admin') {
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

  renderPagination(type, filteredData.length);
}
