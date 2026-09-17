/* ============================================
 * PAKTI - Dashboard Page Logic
 * ============================================ */

// Chart instances
let pieChart = null;
let barChart = null;
let lineChart = null;

// Global data
let allData = [];
let filteredData = [];
let currentPage = 1;

/**
 * Load dashboard data from Supabase
 */
async function loadDashboardData() {
  if (!isSupabaseReady()) {
    showConnectionErrorModal('Supabase belum dikonfigurasi. Edit js/config.js terlebih dahulu.');
    return;
  }

  toastInfo('Memuat data dari server...');

  try {
    allData = await fetchAllPengajuan();

    // Filter berdasarkan role user
    if (currentUser && currentUser.role !== 'admin' && currentUser.satuanKerja !== 'all') {
      allData = allData.filter((row) => row['Satuan Kerja'] === currentUser.satuanKerja);
    }

    filteredData = [...allData];

    updateStats();
    updateCharts();
    renderDashboardTable();

    toastSuccess(`Data berhasil dimuat (${allData.length} record)`);
  } catch (error) {
    console.error('[Dashboard] Load error:', error);
    toastError('Gagal memuat data: ' + (error.message || 'unknown'));
    showConnectionErrorModal(error.message || 'Gagal terhubung ke database');
  }
}

/**
 * Update stats cards
 */
function updateStats() {
  const total = allData.length;
  const ditolak = allData.filter((d) => d['Status'] === 'Ditolak').length;
  const perbaikan = allData.filter((d) => d['Status'] === 'Perbaikan').length;
  const terbit = allData.filter((d) => d['Status'] === 'Terbit').length;
  const pending = allData.filter((d) => !d['Status'] || d['Status'] === 'Menunggu').length;

  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setText('statTotal', total);
  setText('statPending', pending);
  setText('statPerbaikan', perbaikan);
  setText('statDitolak', ditolak);
  setText('statTerbit', terbit);

  // Tambah click handler untuk kartu stats (popup detail)
  setupStatCardClickHandlers();
}

/**
 * Setup click handlers untuk kartu stats
 * Saat diklik → tampilkan popup dengan data minimal (tanpa data sensitif)
 */
function setupStatCardClickHandlers() {
  const cards = document.querySelectorAll('.stat-card');
  cards.forEach((card) => {
    // Hapus handler lama (jika ada) dengan clone
    const newCard = card.cloneNode(true);
    card.parentNode.replaceChild(newCard, card);

    // Tambah cursor pointer & click handler
    newCard.style.cursor = 'pointer';
    newCard.addEventListener('click', function () {
      const type = this.classList.contains('total') ? 'total' :
                   this.classList.contains('pending') ? 'pending' :
                   this.classList.contains('perbaikan') ? 'perbaikan' :
                   this.classList.contains('ditolak') ? 'ditolak' :
                   this.classList.contains('terbit') ? 'terbit' : 'total';
      showStatCardPopup(type);
    });
  });
}

/**
 * Tampilkan popup detail untuk kartu stats
 * Hanya tampilkan data minimal (tanpa email, no HP, dokumen URL)
 */
function showStatCardPopup(type) {
  let title = '';
  let filterFn;
  let badgeColor = '';

  switch (type) {
    case 'total':
      title = 'Total Pengajuan';
      filterFn = () => true;
      badgeColor = 'var(--government-blue)';
      break;
    case 'pending':
      title = 'Pengajuan Menunggu';
      filterFn = (d) => !d['Status'] || d['Status'] === 'Menunggu';
      badgeColor = 'var(--warning)';
      break;
    case 'perbaikan':
      title = 'Pengajuan Perbaikan';
      filterFn = (d) => d['Status'] === 'Perbaikan';
      badgeColor = '#ea580c';
      break;
    case 'ditolak':
      title = 'Pengajuan Ditolak';
      filterFn = (d) => d['Status'] === 'Ditolak';
      badgeColor = 'var(--danger)';
      break;
    case 'terbit':
      title = 'Pengajuan Terbit';
      filterFn = (d) => d['Status'] === 'Terbit';
      badgeColor = 'var(--success)';
      break;
    default:
      return;
  }

  const filteredData = allData.filter(filterFn);
  const count = filteredData.length;

  // Buat modal popup
  let modal = document.getElementById('statCardPopupModal');
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'statCardPopupModal';
  modal.className = 'modal-overlay active';
  modal.style.cssText = 'display: flex;';

  // Data minimal yang ditampilkan (TIDAK ada email, no HP, dokumen URL)
  const tableRows = filteredData.slice(0, 50).map((row, idx) => {
    const statusBadge = getStatusBadge(row['Status']);
    const nomorReg = row['NomorRegister'] || '-';
    const nama = row['Nama Lengkap dengan Gelar'] || '-';
    const nip = row['NIP'] || '-';
    const satker = row['Satuan Kerja'] || '-';
    const jenisJF = row['Jenis JF'] || '-';
    const tanggal = formatDate(row['Timestamp']);

    return `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 8px; text-align: center;">${idx + 1}</td>
        <td style="padding: 8px; font-family: monospace; font-size: 0.78rem;">${escapeHtml(nomorReg)}</td>
        <td style="padding: 8px;"><strong>${escapeHtml(nama)}</strong></td>
        <td style="padding: 8px; font-family: monospace; font-size: 0.78rem;">${escapeHtml(nip)}</td>
        <td style="padding: 8px;">${escapeHtml(satker)}</td>
        <td style="padding: 8px;">${escapeHtml(jenisJF)}</td>
        <td style="padding: 8px;">${statusBadge}</td>
        <td style="padding: 8px; font-size: 0.78rem;">${escapeHtml(tanggal)}</td>
      </tr>
    `;
  }).join('');

  modal.innerHTML = `
    <div class="modal" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
      <div class="modal-header">
        <h3 class="modal-title">
          <i class="fas fa-chart-bar" style="color: ${badgeColor};"></i>
          ${escapeHtml(title)} — ${count} data
        </h3>
        <button class="modal-close" onclick="document.getElementById('statCardPopupModal').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body" style="padding: 0;">
        ${count === 0 ? `
          <div style="text-align: center; padding: 60px 20px;">
            <i class="fas fa-inbox" style="font-size: 60px; color: var(--text-light); margin-bottom: 16px;"></i>
            <h3 style="color: var(--text-medium);">Tidak ada data</h3>
            <p style="color: var(--text-light);">Belum ada pengajuan dengan status ini.</p>
          </div>
        ` : `
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; min-width: 800px;">
              <thead>
                <tr style="background: #f1f5f9; position: sticky; top: 0;">
                  <th style="padding: 10px; text-align: center; border-bottom: 2px solid var(--border-color); font-size: 0.75rem; text-transform: uppercase;">No</th>
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid var(--border-color); font-size: 0.75rem; text-transform: uppercase;">No. Register</th>
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid var(--border-color); font-size: 0.75rem; text-transform: uppercase;">Nama</th>
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid var(--border-color); font-size: 0.75rem; text-transform: uppercase;">NIP</th>
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid var(--border-color); font-size: 0.75rem; text-transform: uppercase;">Satuan Kerja</th>
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid var(--border-color); font-size: 0.75rem; text-transform: uppercase;">Jenis JF</th>
                  <th style="padding: 10px; text-align: center; border-bottom: 2px solid var(--border-color); font-size: 0.75rem; text-transform: uppercase;">Status</th>
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid var(--border-color); font-size: 0.75rem; text-transform: uppercase;">Tanggal</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
          ${filteredData.length > 50 ? `
            <div style="text-align: center; padding: 12px; color: var(--text-light); font-size: 0.82rem; font-style: italic; background: var(--light-bg);">
              Menampilkan 50 dari ${count} data. Lihat detail lengkap di menu Dashboard Data.
            </div>
          ` : ''}
        `}
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" onclick="document.getElementById('statCardPopupModal').remove()">
          <i class="fas fa-check"></i> Tutup
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener('click', function (e) {
    if (e.target === modal) modal.remove();
  });
}

/**
 * Update charts (Chart.js)
 */
function updateCharts() {
  // Pie Chart - Status
  const statusCounts = {
    Menunggu: 0,
    Perbaikan: 0,
    Ditolak: 0,
    Terbit: 0,
  };
  allData.forEach((d) => {
    const status = d['Status'] || 'Menunggu';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  const pieCanvas = document.getElementById('pieChart');
  if (pieCanvas) {
    if (pieChart) pieChart.destroy();
    pieChart = new Chart(pieCanvas, {
      type: 'doughnut',
      data: {
        labels: Object.keys(statusCounts),
        datasets: [
          {
            data: Object.values(statusCounts),
            backgroundColor: ['#f59e0b', '#f97316', '#ef4444', '#10b981'],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
        },
      },
    });
  }

  // Bar Chart - Jenis JF
  const jfCounts = {};
  allData.forEach((d) => {
    const jf = d['Jenis JF'] || 'Tidak Diketahui';
    jfCounts[jf] = (jfCounts[jf] || 0) + 1;
  });

  const barCanvas = document.getElementById('barChart');
  if (barCanvas) {
    if (barChart) barChart.destroy();
    barChart = new Chart(barCanvas, {
      type: 'bar',
      data: {
        labels: Object.keys(jfCounts),
        datasets: [
          {
            label: 'Jumlah',
            data: Object.values(jfCounts),
            backgroundColor: '#1a73e8',
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }

  // Line Chart - Pengajuan per Bulan
  const bulanCounts = {};
  allData.forEach((d) => {
    if (!d['Timestamp']) return;
    const date = new Date(d['Timestamp']);
    if (isNaN(date.getTime())) return;
    const bulan = date.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
    bulanCounts[bulan] = (bulanCounts[bulan] || 0) + 1;
  });

  const lineCanvas = document.getElementById('lineChart');
  if (lineCanvas) {
    if (lineChart) lineChart.destroy();
    lineChart = new Chart(lineCanvas, {
      type: 'line',
      data: {
        labels: Object.keys(bulanCounts),
        datasets: [
          {
            label: 'Jumlah Pengajuan',
            data: Object.values(bulanCounts),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }
}

/**
 * Render dashboard table with pagination
 */
function renderDashboardTable() {
  currentPage = 1;
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageData = filteredData.slice(start, end);

  const tbody = document.getElementById('dashboardTableBody');
  if (!tbody) return;

  if (pageData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px;">
          <i class="fas fa-inbox" style="font-size: 40px; color: var(--text-light); margin-bottom: 12px;"></i>
          <p>Tidak ada data</p>
        </td>
      </tr>
    `;
  } else {
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
  }

  renderPagination('dashboard', filteredData.length);
}

/**
 * Filter dashboard data
 */
function filterDashboard() {
  const searchInput = document.getElementById('dashboardSearch');
  const filterJFEl = document.getElementById('dashboardFilterJF');
  const filterStatusEl = document.getElementById('dashboardFilterStatus');

  const search = searchInput ? searchInput.value.toLowerCase() : '';
  const filterJF = filterJFEl ? filterJFEl.value : '';
  const filterStatus = filterStatusEl ? filterStatusEl.value : '';

  filteredData = allData.filter((row) => {
    const matchSearch =
      !search ||
      (row['Nama Lengkap dengan Gelar'] || '').toLowerCase().includes(search) ||
      (row['NIP'] || '').includes(search) ||
      (row['Satuan Kerja'] || '').toLowerCase().includes(search);

    const matchJF = !filterJF || row['Jenis JF'] === filterJF;
    const matchStatus = !filterStatus || row['Status'] === filterStatus;

    return matchSearch && matchJF && matchStatus;
  });

  renderDashboardTable();
}

/**
 * Refresh dashboard
 */
function refreshDashboard() {
  loadDashboardData();
  toastSuccess('Data diperbarui!');
}
