/* ============================================
 * PAKTI - Pembuatan PAK Integrasi
 * ============================================
 * Fitur: Pilih data pengajuan → generate PDF
 *        PAK Integrasi siap printout
 *
 * PDF dibuat via browser print (window.print)
 * dengan stylesheet print khusus (css/print-pak.css)
 *
 * Data pegawai langsung diambil dari tabel
 * pengajuan_pak di Supabase.
 * ============================================ */

let currentPAKData = null;

// Cache lokal untuk data pegawai yang sudah difetch
let pembuatanPAKData = [];

/**
 * Load halaman Pembuatan PAK Integrasi
 * Fetch data pegawai LANGSUNG dari tabel pengajuan_pak di Supabase
 */
async function loadPembuatanPAKData() {
  const select = document.getElementById('pakSelectNIP');
  const preview = document.getElementById('pakPreview');
  if (!select) return;

  // Reset preview
  if (preview) {
    preview.innerHTML =
      '<p style="text-align: center; color: var(--text-light); padding: 40px;">' +
      '<i class="fas fa-file-alt" style="font-size: 48px; margin-bottom: 12px;"></i><br>' +
      'Pilih pegawai untuk generate PAK Integrasi</p>';
  }

  // Cek apakah Supabase sudah dikonfigurasi
  if (!isSupabaseReady()) {
    select.innerHTML =
      '<option value="">⚠️ Supabase belum dikonfigurasi</option>';
    if (preview) {
      preview.innerHTML =
        '<div style="text-align: center; padding: 40px; color: var(--danger);">' +
        '<i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 12px;"></i>' +
        '<h3 style="margin-bottom: 8px;">Supabase Belum Dikonfigurasi</h3>' +
        '<p style="color: var(--text-medium); margin-bottom: 16px;">Edit file <code>js/config.js</code> dan isi:</p>' +
        '<p style="font-family: monospace; background: var(--light-bg); padding: 8px; border-radius: 4px; margin-bottom: 16px;">' +
        'SUPABASE_URL = \'https://xxx.supabase.co\'<br>' +
        'SUPABASE_ANON_KEY = \'xxx\'</p>' +
        '<p style="color: var(--text-light); font-size: 0.85rem;">Pastikan juga tabel <code>pengajuan_pak</code> sudah dibuat via <code>supabase/schema.sql</code></p>' +
        '</div>';
    }
    return;
  }

  // Show loading state di dropdown
  select.innerHTML =
    '<option value="">⏳ Memuat data pegawai dari Supabase...</option>';

  // Tampilkan info jumlah data (akan diupdate setelah fetch)
  updatePembuatanPAKCount('Memuat...');

  try {
    // Fetch LANGSUNG dari tabel pengajuan_pak di Supabase
    const data = await fetchAllPengajuan();

    if (!data || data.length === 0) {
      pembuatanPAKData = [];
      select.innerHTML = '<option value="">-- Belum ada data pegawai --</option>';

      if (preview) {
        preview.innerHTML =
          '<div style="text-align: center; padding: 40px; color: var(--warning);">' +
          '<i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 12px;"></i>' +
          '<h3 style="margin-bottom: 8px;">Belum Ada Data Pegawai</h3>' +
          '<p style="color: var(--text-medium); margin-bottom: 16px;">' +
          'Tidak ada data di tabel <code>pengajuan_pak</code>.<br>' +
          'Silakan tambah data pegawai terlebih dahulu via:' +
          '</p>' +
          '<div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">' +
          '<button class="btn btn-primary btn-sm" onclick="navigateTo(\'formulir\')"><i class="fas fa-plus"></i> Formulir Pengajuan</button>' +
          '<button class="btn btn-success btn-sm" onclick="navigateTo(\'admin\')"><i class="fas fa-file-csv"></i> Upload Massal CSV</button>' +
          '</div>' +
          '</div>';
      }
      updatePembuatanPAKCount('0 data');
      toastInfo('Belum ada data pegawai di database');
      return;
    }

    // Sort by name ascending
    pembuatanPAKData = [...data].sort((a, b) => {
      const namaA = (a['Nama Lengkap dengan Gelar'] || '').toLowerCase();
      const namaB = (b['Nama Lengkap dengan Gelar'] || '').toLowerCase();
      return namaA.localeCompare(namaB);
    });

    // Populate dropdown
    select.innerHTML =
      '<option value="">-- Pilih NIP / Nama Pegawai (' +
      pembuatanPAKData.length +
      ' data) --</option>' +
      pembuatanPAKData
        .map((row) => {
          const nip = row['NIP'] || '-';
          const nama = row['Nama Lengkap dengan Gelar'] || '-';
          const satker = row['Satuan Kerja'] || '-';
          const status = row['Status'] || 'Menunggu';
          const label = `${nip} - ${nama} (${satker}) [${status}]`;
          return `<option value="${escapeHtml(String(row._id || ''))}">${escapeHtml(label)}</option>`;
        })
        .join('');

    // Update count badge
    updatePembuatanPAKCount(pembuatanPAKData.length + ' data pegawai');

    // Sinkronkan juga ke allData (untuk konsistensi dengan modul lain)
    allData = [...data];
    if (typeof filteredData !== 'undefined') {
      filteredData = [...allData];
    }

    console.log('[Pembuatan PAK] ✅ Loaded', data.length, 'pegawai dari Supabase');
    toastSuccess(`Berhasil memuat ${data.length} data pegawai`);
  } catch (error) {
    console.error('[Pembuatan PAK] Load error:', error);
    select.innerHTML = '<option value="">❌ Gagal memuat data</option>';

    if (preview) {
      preview.innerHTML =
        '<div style="text-align: center; padding: 40px; color: var(--danger);">' +
        '<i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 12px;"></i>' +
        '<h3 style="margin-bottom: 8px;">Gagal Memuat Data</h3>' +
        '<p style="color: var(--text-medium); margin-bottom: 16px;">' +
        escapeHtml(error.message || 'Unknown error') +
        '</p>' +
        '<div style="background: #fef2f2; padding: 12px; border-radius: 8px; text-align: left; font-size: 0.85rem; max-width: 500px; margin: 0 auto;">' +
        '<strong>Possible causes:</strong>' +
        '<ul style="margin: 8px 0 0 20px; line-height: 1.8;">' +
        '<li>Supabase URL / anon key salah di <code>js/config.js</code></li>' +
        '<li>Tabel <code>pengajuan_pak</code> belum dibuat (run <code>schema.sql</code>)</li>' +
        '<li>RLS policies belum di-setup (run <code>policies.sql</code>)</li>' +
        '<li>Koneksi internet bermasalah</li>' +
        '</ul></div>' +
        '<button class="btn btn-primary btn-sm" style="margin-top: 16px;" onclick="loadPembuatanPAKData()">' +
        '<i class="fas fa-sync-alt"></i> Coba Lagi</button>' +
        '</div>';
    }
    updatePembuatanPAKCount('Error');
    toastError('Gagal memuat data: ' + (error.message || ''));
  }
}

/**
 * Update badge jumlah data di header halaman
 */
function updatePembuatanPAKCount(text) {
  const countEl = document.getElementById('pembuatanPAKCount');
  if (countEl) countEl.textContent = text;
}

/**
 * Refresh data pegawai dari Supabase
 */
async function refreshPembuatanPAKData() {
  const btn = document.getElementById('pakRefreshBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memuat...';
  }

  await loadPembuatanPAKData();

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Data';
  }
}

/**
 * Generate PAK dari data terpilih
 */
function generatePAKIntegrasi() {
  const select = document.getElementById('pakSelectNIP');
  if (!select || !select.value) {
    toastWarning('Pilih pegawai terlebih dahulu!');
    return;
  }

  // Cari di pembuatanPAKData (data yang sudah difetch)
  let row = pembuatanPAKData.find((r) => String(r._id) === String(select.value));

  // Fallback ke allData jika tidak ketemu
  if (!row) {
    row = allData.find((r) => String(r._id) === String(select.value));
  }

  if (!row) {
    toastError('Data pegawai tidak ditemukan! Coba refresh data.');
    return;
  }

  currentPAKData = row;

  // Ambil nilai input angka kredit
  const getNum = (id) => {
    const el = document.getElementById(id);
    if (!el || !el.value) return 0;
    const n = parseFloat(el.value.replace(',', '.'));
    return isNaN(n) ? 0 : n;
  };

  const akLamaPendidikan = getNum('akLamaPendidikan');
  const akBaruPendidikan = getNum('akBaruPendidikan');
  const akLamaTugasPokok = getNum('akLamaTugasPokok');
  const akBaruTugasPokok = getNum('akBaruTugasPokok');
  const akLamaPengembangan = getNum('akLamaPengembangan');
  const akBaruPengembangan = getNum('akBaruPengembangan');
  const akLamaPenunjang = getNum('akLamaPenunjang');
  const akBaruPenunjang = getNum('akBaruPenunjang');

  const akMinimalPangkat = getNum('akMinimalPangkat');
  const akMinimalJenjang = getNum('akMinimalJenjang');
  const akMinimalPengembangan = getNum('akMinimalPengembangan');

  const penilaianPeriode = document.getElementById('pakPeriodePenilaian')?.value || '';
  const tanggalPenetapan = document.getElementById('pakTanggalPenetapan')?.value || '';
  const lokasiPenetapan = document.getElementById('pakLokasiPenetapan')?.value || 'Tenggarong';
  const namaPejabat = document.getElementById('pakNamaPejabat')?.value || '';
  const nipPejabat = document.getElementById('pakNipPejabat')?.value || '';
  const rekomendasi = document.getElementById('pakRekomendasi')?.value || '';

  // Hitung total
  const totalLama = akLamaPendidikan + akLamaTugasPokok + akLamaPengembangan + akLamaPenunjang;
  const totalBaru = akBaruPendidikan + akBaruTugasPokok + akBaruPengembangan + akBaruPenunjang;
  const totalJumlah = totalLama + totalBaru;

  // Generate HTML untuk print
  const html = generatePAKHTML(
    row,
    {
      akLamaPendidikan,
      akBaruPendidikan,
      akLamaTugasPokok,
      akBaruTugasPokok,
      akLamaPengembangan,
      akBaruPengembangan,
      akLamaPenunjang,
      akBaruPenunjang,
      totalLama,
      totalBaru,
      totalJumlah,
      akMinimalPangkat,
      akMinimalJenjang,
      akMinimalPengembangan,
      kekuranganPangkat: Math.abs(totalJumlah - akMinimalPangkat),
      kekuranganJenjang: Math.abs(totalJumlah - akMinimalJenjang),
      kekuranganPengembangan: akMinimalPengembangan - (akLamaPengembangan + akBaruPengembangan),
    },
    {
      penilaianPeriode,
      tanggalPenetapan,
      lokasiPenetapan,
      namaPejabat,
      nipPejabat,
      rekomendasi,
    }
  );

  const preview = document.getElementById('pakPreview');
  if (preview) preview.innerHTML = html;

  // Tampilkan tombol print
  const printBtn = document.getElementById('pakPrintBtn');
  if (printBtn) printBtn.style.display = 'inline-flex';

  toastSuccess('PAK Integrasi berhasil di-generate. Klik tombol Print untuk mencetak.');

  // Scroll ke preview
  if (preview) {
    preview.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * Generate HTML untuk PAK Integrasi (printable)
 */
function generatePAKHTML(row, ak, meta) {
  const safeRow = (val) => escapeHtml(val || '-');

  // Kop Surat
  const kopInstansi = `
    <table class="kop-table">
      <tr>
        <td class="kop-logo">
          <div class="kop-emblem">⚖</div>
        </td>
        <td class="kop-text">
          <div class="kop-line1">PEMERINTAH KABUPATEN KUTAI KARTANEGARA</div>
          <div class="kop-line2">DINAS KESEHATAN</div>
          <div class="kop-line3">Jalan Cut Nyak Dien No. 33, Tenggarong, Kutai Kartanegara 75513</div>
          <div class="kop-line3">Telepon: (0541) 6610005 | Email: sdmkdinkeskukar2024@gmail.com</div>
        </td>
      </tr>
    </table>
    <div class="kop-line"></div>
  `;

  return `
    <div class="pak-document" id="pakPrintArea">
      ${kopInstansi}

      <div class="doc-title">
        <h2>PENETAPAN ANGKA KREDIT INTEGRASI</h2>
        ${meta.penilaianPeriode ? `<p>Periode Penilaian: ${escapeHtml(meta.penilaianPeriode)}</p>` : ''}
      </div>

      <table class="pak-table section-i">
        <tr>
          <td class="section-header" colspan="3">I. KETERANGAN PERORANGAN</td>
        </tr>
        <tr>
          <td class="col-no">1</td>
          <td class="col-label">NAMA</td>
          <td class="col-value">: ${safeRow(row['Nama Lengkap dengan Gelar'])}</td>
        </tr>
        <tr>
          <td class="col-no">2</td>
          <td class="col-label">NIP / NRK</td>
          <td class="col-value">: ${safeRow(row['NIP'])}</td>
        </tr>
        <tr>
          <td class="col-no">3</td>
          <td class="col-label">NOMOR SERI KARPEG</td>
          <td class="col-value">: ${safeRow(row['No Karpeg'])}</td>
        </tr>
        <tr>
          <td class="col-no">4</td>
          <td class="col-label">PANGKAT / GOLONGAN RUANG</td>
          <td class="col-value">: ${safeRow(row['Pangkat/Gol'])}</td>
        </tr>
        <tr>
          <td class="col-no">5</td>
          <td class="col-label">TEMPAT / TANGGAL LAHIR</td>
          <td class="col-value">: ${safeRow(row['Tempat & Tanggal Lahir'])}</td>
        </tr>
        <tr>
          <td class="col-no">6</td>
          <td class="col-label">JENIS KELAMIN</td>
          <td class="col-value">: ${safeRow(row['Jenis Kelamin'])}</td>
        </tr>
        <tr>
          <td class="col-no">7</td>
          <td class="col-label">PENDIDIKAN</td>
          <td class="col-value">: ${safeRow(row['Pendidikan'])}</td>
        </tr>
        <tr>
          <td class="col-no">8</td>
          <td class="col-label">JABATAN / TMT</td>
          <td class="col-value">: ${safeRow(row['Jenis JF'])} - ${safeRow(row['Jenjang JF'])} (TMT: ${safeRow(row['TMT JF'])})</td>
        </tr>
        <tr>
          <td class="col-no">9</td>
          <td class="col-label">MASA KERJA GOLONGAN</td>
          <td class="col-value">: ${safeRow(row['Masa Kerja Gol'])}</td>
        </tr>
        <tr>
          <td class="col-no">10</td>
          <td class="col-label">UNIT KERJA</td>
          <td class="col-value">: ${safeRow(row['Satuan Kerja'])}</td>
        </tr>
      </table>

      <table class="pak-table section-ii">
        <tr>
          <td class="section-header" colspan="5">II. PENETAPAN ANGKA KREDIT</td>
        </tr>
        <tr class="ak-header-row">
          <th class="col-no">NO</th>
          <th class="col-label">UNSUR</th>
          <th class="col-ak">LAMA</th>
          <th class="col-ak">BARU</th>
          <th class="col-ak">JUMLAH</th>
        </tr>
        <tr>
          <td class="col-no">1</td>
          <td class="col-label">Angka Kredit Pendidikan</td>
          <td class="col-ak">${ak.akLamaPendidikan.toFixed(2)}</td>
          <td class="col-ak">${ak.akBaruPendidikan.toFixed(2)}</td>
          <td class="col-ak"><strong>${(ak.akLamaPendidikan + ak.akBaruPendidikan).toFixed(2)}</strong></td>
        </tr>
        <tr>
          <td class="col-no">2</td>
          <td class="col-label">Angka Kredit Tugas Pokok / Jabatan</td>
          <td class="col-ak">${ak.akLamaTugasPokok.toFixed(2)}</td>
          <td class="col-ak">${ak.akBaruTugasPokok.toFixed(2)}</td>
          <td class="col-ak"><strong>${(ak.akLamaTugasPokok + ak.akBaruTugasPokok).toFixed(2)}</strong></td>
        </tr>
        <tr>
          <td class="col-no">3</td>
          <td class="col-label">Angka Kredit Pengembangan Profesi</td>
          <td class="col-ak">${ak.akLamaPengembangan.toFixed(2)}</td>
          <td class="col-ak">${ak.akBaruPengembangan.toFixed(2)}</td>
          <td class="col-ak"><strong>${(ak.akLamaPengembangan + ak.akBaruPengembangan).toFixed(2)}</strong></td>
        </tr>
        <tr>
          <td class="col-no">4</td>
          <td class="col-label">Angka Kredit Penunjang</td>
          <td class="col-ak">${ak.akLamaPenunjang.toFixed(2)}</td>
          <td class="col-ak">${ak.akBaruPenunjang.toFixed(2)}</td>
          <td class="col-ak"><strong>${(ak.akLamaPenunjang + ak.akBaruPenunjang).toFixed(2)}</strong></td>
        </tr>
        <tr class="ak-total-row">
          <td colspan="2"><strong>TOTAL ANGKA KREDIT</strong></td>
          <td class="col-ak"><strong>${ak.totalLama.toFixed(2)}</strong></td>
          <td class="col-ak"><strong>${ak.totalBaru.toFixed(2)}</strong></td>
          <td class="col-ak"><strong>${ak.totalJumlah.toFixed(2)}</strong></td>
        </tr>
      </table>

      <table class="pak-table section-iii">
        <tr>
          <td class="section-header" colspan="3">III. KETERANGAN</td>
        </tr>
        <tr class="ak-header-row">
          <th class="col-label">URAIAN</th>
          <th class="col-ak">KEBUTUHAN</th>
          <th class="col-ak">KEKURANGAN / KELEBIHAN</th>
        </tr>
        <tr>
          <td class="col-label">Angka Kredit minimal untuk kenaikan Pangkat</td>
          <td class="col-ak">${ak.akMinimalPangkat.toFixed(2)}</td>
          <td class="col-ak">${ak.kekuranganPangkat.toFixed(2)}</td>
        </tr>
        <tr>
          <td class="col-label">Angka Kredit minimal untuk kenaikan Jenjang Jabatan</td>
          <td class="col-ak">${ak.akMinimalJenjang.toFixed(2)}</td>
          <td class="col-ak">${ak.kekuranganJenjang.toFixed(2)}</td>
        </tr>
        <tr>
          <td class="col-label">Angka Kredit minimal Pengembangan Profesi</td>
          <td class="col-ak">${ak.akMinimalPengembangan.toFixed(2)}</td>
          <td class="col-ak">${ak.kekuranganPengembangan.toFixed(2)}</td>
        </tr>
      </table>

      ${meta.rekomendasi ? `
        <div class="rekomendasi-box">
          <strong>REKOMENDASI:</strong><br>
          ${escapeHtml(meta.rekomendasi).replace(/\n/g, '<br>')}
        </div>
      ` : ''}

      <table class="ttd-table">
        <tr>
          <td class="ttd-cell">
            <p>Ditetapkan di : ${escapeHtml(meta.lokasiPenetapan)}</p>
            <p>Tanggal : ${escapeHtml(meta.tanggalPenetapan || formatDate(new Date().toISOString()))}</p>
            <p style="margin-top: 8px;">Pejabat Penilai Kinerja,</p>
            <div class="ttd-space"></div>
            <p><strong>${escapeHtml(meta.namaPejabat) || '(..............................)'}</strong></p>
            <p>NIP. ${escapeHtml(meta.nipPejabat) || '..............................'}</p>
          </td>
        </tr>
      </table>

      <div class="doc-footer">
        <p>Dokumen ini dihasilkan secara elektronik oleh Sistem PAKTI (Pengelolaan Angka Kredit Integrasi)</p>
        <p>Pemerintah Kabupaten Kutai Kartanegara &copy; ${new Date().getFullYear()}</p>
      </div>
    </div>
  `;
}

/**
 * Print PAK Integrasi
 */
function printPAKIntegrasi() {
  const printArea = document.getElementById('pakPrintArea');
  if (!printArea) {
    toastWarning('Generate PAK terlebih dahulu!');
    return;
  }

  // Clone PAK document ke body untuk print
  const printWrapper = document.createElement('div');
  printWrapper.id = 'pakPrintWrapper';
  printWrapper.className = 'pak-print-wrapper';
  printWrapper.innerHTML = printArea.innerHTML;

  // Hapus wrapper lama jika ada
  const oldWrapper = document.getElementById('pakPrintWrapper');
  if (oldWrapper) oldWrapper.remove();

  document.body.appendChild(printWrapper);
  document.body.classList.add('printing-pak');

  setTimeout(() => {
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-pak');
      const w = document.getElementById('pakPrintWrapper');
      if (w) w.remove();
    }, 500);
  }, 300);
}

/**
 * Reset form input PAK
 */
function resetPAKForm() {
  const inputs = [
    'akLamaPendidikan', 'akBaruPendidikan',
    'akLamaTugasPokok', 'akBaruTugasPokok',
    'akLamaPengembangan', 'akBaruPengembangan',
    'akLamaPenunjang', 'akBaruPenunjang',
    'akMinimalPangkat', 'akMinimalJenjang', 'akMinimalPengembangan',
    'pakPeriodePenilaian', 'pakTanggalPenetapan', 'pakLokasiPenetapan',
    'pakNamaPejabat', 'pakNipPejabat', 'pakRekomendasi',
  ];
  inputs.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  const select = document.getElementById('pakSelectNIP');
  if (select) select.value = '';

  const preview = document.getElementById('pakPreview');
  if (preview) {
    preview.innerHTML =
      '<p style="text-align: center; color: var(--text-light); padding: 40px;">' +
      '<i class="fas fa-file-alt" style="font-size: 48px; margin-bottom: 12px;"></i><br>' +
      'Pilih pegawai untuk generate PAK Integrasi</p>';
  }

  const printBtn = document.getElementById('pakPrintBtn');
  if (printBtn) printBtn.style.display = 'none';

  currentPAKData = null;
  toastInfo('Form direset');
}

/**
 * Printout seluruh data admin (print halaman)
 */
function printoutAdminData() {
  document.body.classList.add('printing-admin');
  setTimeout(() => {
    window.print();
    document.body.classList.remove('printing-admin');
  }, 300);
}
