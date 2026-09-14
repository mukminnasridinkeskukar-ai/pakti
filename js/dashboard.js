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
