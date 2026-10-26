/* ============================================
 * PAKTI - Pembuatan PAK Integrasi (4 Dokumen)
 * ============================================
 * Generate 4 dokumen PAK dalam 1 PDF:
 * 1. Konvensional (Sheet 2) - Penetapan AK Konvensional
 * 2. Integrasi (Sheet 3) - Penyesuaian AK Konvensional ke Integrasi
 * 3. Kebutuhan AK (Sheet 4) - Perhitungan Kebutuhan Kekurangan AK
 * 4. PAK Integrasi (Sheet 5) - Penetapan AK Integrasi
 *
 * Data sumber: tabel data_master (Sheet DATA) di Supabase
 * Bukan dari pengajuan_pak (Formulir Pengajuan publik)
 * ============================================ */

let currentPAKData = null;
let pembuatanPAKData = [];

/**
 * Load halaman Pembuatan PAK Integrasi
 * Fetch data dari tabel data_master (BUKAN pengajuan_pak)
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

  if (!isSupabaseReady()) {
    select.innerHTML = '<option value="">⚠️ Supabase belum dikonfigurasi</option>';
    if (preview) {
      preview.innerHTML =
        '<div style="text-align: center; padding: 40px; color: var(--danger);">' +
        '<i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 12px;"></i>' +
        '<h3>Supabase Belum Dikonfigurasi</h3>' +
        '<p>Edit file <code>js/config.js</code> dan isi SUPABASE_URL + SUPABASE_ANON_KEY</p></div>';
    }
    return;
  }

  select.innerHTML = '<option value="">⏳ Memuat data dari tabel data_master...</option>';
  updatePembuatanPAKCount('Memuat...');

  try {
    // Fetch dari data_master, BUKAN dari pengajuan_pak
    const data = await fetchAllDataMaster();

    if (!data || data.length === 0) {
      pembuatanPAKData = [];
      select.innerHTML = '<option value="">-- Belum ada data di Data Master --</option>';
      if (preview) {
        preview.innerHTML =
          '<div style="text-align: center; padding: 40px; color: var(--warning);">' +
          '<i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 12px;"></i>' +
          '<h3>Belum Ada Data Master</h3>' +
          '<p>Tabel <code>data_master</code> kosong. Silakan input data di menu <strong>Data Master</strong>.</p>' +
          '<button class="btn btn-primary btn-sm" style="margin-top: 12px;" onclick="navigateTo(\'dataMaster\')">' +
          '<i class="fas fa-database"></i> Buka Data Master</button></div>';
      }
      updatePembuatanPAKCount('0 data');
      return;
    }

    pembuatanPAKData = [...data];

    select.innerHTML =
      '<option value="">-- Pilih Pegawai (' + pembuatanPAKData.length + ' data) --</option>' +
      pembuatanPAKData
        .map((row) => {
          const nip = row['NIP'] || '-';
          const nama = row['Nama Lengkap dengan Gelar'] || '-';
          const satker = row['Satuan Kerja'] || '-';
          const label = `${nip} - ${nama} (${satker})`;
          return `<option value="${escapeHtml(String(row._id || ''))}">${escapeHtml(label)}</option>`;
        })
        .join('');

    updatePembuatanPAKCount(pembuatanPAKData.length + ' data');
    toastSuccess(`Berhasil memuat ${data.length} data dari tabel data_master`);
  } catch (error) {
    console.error('[Pembuatan PAK] Load error:', error);
    select.innerHTML = '<option value="">❌ Gagal memuat data</option>';
    if (preview) {
      preview.innerHTML =
        '<div style="text-align: center; padding: 40px; color: var(--danger);">' +
        '<i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 12px;"></i>' +
        '<h3>Gagal Memuat Data</h3><p>' + escapeHtml(error.message || '') + '</p>' +
        '<button class="btn btn-primary btn-sm" style="margin-top: 12px;" onclick="loadPembuatanPAKData()">' +
        '<i class="fas fa-sync-alt"></i> Coba Lagi</button></div>';
    }
    updatePembuatanPAKCount('Error');
    toastError('Gagal memuat: ' + (error.message || ''));
  }
}

function updatePembuatanPAKCount(text) {
  const el = document.getElementById('pembuatanPAKCount');
  if (el) el.textContent = text;
}

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
 * Generate PAK Integrasi - 4 dokumen
 */
function generatePAKIntegrasi() {
  const select = document.getElementById('pakSelectNIP');
  if (!select || !select.value) {
    toastWarning('Pilih pegawai terlebih dahulu!');
    return;
  }

  const row = pembuatanPAKData.find((r) => String(r._id) === String(select.value));
  if (!row) {
    toastError('Data tidak ditemukan! Coba refresh data.');
    return;
  }

  currentPAKData = row;

  // Generate 4 dokumen - setiap dokumen dibungkus .pak-page dengan data-orientation
  const doc1 = generateKonvensionalHTML(row);
  const doc2 = generateIntegrasiHTML(row);
  const doc3 = generateKebutuhanAKHTML(row);
  const doc4 = generatePAKIntegrasiHTML(row);

  // Gabung jadi 1 print area dengan page-break
  // Setiap .pak-page punya page indicator & orientation attribute
  const html = `
    <div class="pak-print-pages" id="pakPrintArea">
      <div class="pak-page" data-orientation="portrait" data-page-num="1">
        <div class="page-indicator">Halaman 1 / 4 — Konvensional</div>
        <div class="pak-content">${doc1}</div>
      </div>
      <div class="pak-page" data-orientation="portrait" data-page-num="2">
        <div class="page-indicator">Halaman 2 / 4 — Integrasi</div>
        <div class="pak-content">${doc2}</div>
      </div>
      <div class="pak-page" data-orientation="portrait" data-page-num="3">
        <div class="page-indicator">Halaman 3 / 4 — Kebutuhan AK</div>
        <div class="pak-content">${doc3}</div>
      </div>
      <div class="pak-page" data-orientation="portrait" data-page-num="4">
        <div class="page-indicator">Halaman 4 / 4 — PAK Integrasi</div>
        <div class="pak-content">${doc4}</div>
      </div>
    </div>
  `;

  const preview = document.getElementById('pakPreview');
  if (preview) preview.innerHTML = html;

  const printBtn = document.getElementById('pakPrintBtn');
  if (printBtn) printBtn.style.display = 'inline-flex';

  const previewBtn = document.getElementById('pakPreviewBtn');
  if (previewBtn) previewBtn.style.display = 'inline-flex';

  const editBtn = document.getElementById('pakEditBtn');
  if (editBtn) editBtn.style.display = 'inline-flex';

  const wordBtn = document.getElementById('pakWordBtn');
  if (wordBtn) wordBtn.style.display = 'inline-flex';

  // Auto-fit setiap halaman agar konten muat
  setTimeout(() => {
    autoFitAllPages();
    toastSuccess('4 dokumen PAK berhasil di-generate. Klik "Edit Dokumen" untuk mengedit langsung.');
  }, 100);

  if (preview) {
    preview.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/* ============================================
 * AUTO-FIT: Skala konten agar muat dalam 1 halaman A4
 * Tanpa overflow:hidden - menggunakan transform scale
 * ============================================ */
function autoFitAllPages() {
  const pages = document.querySelectorAll('#pakPreview .pak-page');
  pages.forEach((page) => {
    autoFitPage(page);
  });
}

function autoFitPage(pageEl) {
  if (!pageEl) return;

  const content = pageEl.querySelector('.pak-content');
  if (!content) return;

  // Reset transform dulu
  content.style.transform = 'none';
  content.style.transformOrigin = 'top left';

  // Beri delay supaya browser sempat render
  setTimeout(() => {
    const pageHeight = pageEl.clientHeight;
    const pageWidth = pageEl.clientWidth;
    const contentHeight = content.scrollHeight;
    const contentWidth = content.scrollWidth;

    // Hitung scale factor - pakai 95% dari ruang tersedia
    const paddingAllowance = 0.97; // 3% buffer
    const scaleByHeight = pageHeight / contentHeight;
    const scaleByWidth = pageWidth / contentWidth;
    let scale = Math.min(scaleByHeight, scaleByWidth, 1);

    // Jika content melebihi halaman, scale down
    if (scale < 1) {
      scale = scale * paddingAllowance;
      content.style.transform = `scale(${scale})`;
      content.style.transformOrigin = 'top left';
      // Set width agar sesuai dengan skala
      content.style.width = `${100 / scale}%`;
      console.log(`[AutoFit] Page scaled to ${(scale * 100).toFixed(1)}% (content: ${contentHeight}px, page: ${pageHeight}px)`);
    } else {
      // Sudah muat, tidak perlu scale
      content.style.transform = 'none';
      content.style.width = '100%';
    }
  }, 50);
}

/* ============================================
 * VALIDASI sebelum print
 * ============================================ */
function validateBeforePrint() {
  const errors = [];
  const warnings = [];

  // Cek apakah sudah di-generate
  const printArea = document.getElementById('pakPrintArea');
  if (!printArea) {
    errors.push('Dokumen belum di-generate. Klik "Generate 4 Dokumen PAK" terlebih dahulu.');
    return { valid: false, errors, warnings };
  }

  // Cek jumlah halaman = 4
  const pages = printArea.querySelectorAll('.pak-page');
  if (pages.length !== 4) {
    errors.push(`Jumlah halaman harus 4, saat ini: ${pages.length}`);
  }

  // Cek setiap halaman punya konten
  pages.forEach((page, idx) => {
    const content = page.querySelector('.pak-content');
    if (!content || content.innerHTML.trim() === '') {
      errors.push(`Halaman ${idx + 1} kosong`);
    } else {
      // Cek apakah ada tabel terpotong (scrollHeight > clientHeight setelah auto-fit)
      const tables = page.querySelectorAll('.pak-table');
      tables.forEach((tbl, tIdx) => {
        if (tbl.scrollHeight > page.clientHeight) {
          warnings.push(`Halaman ${idx + 1} - tabel ${tIdx + 1} mungkin terlalu panjang, akan di-scale otomatis`);
        }
      });
    }
  });

  // Cek data pegawai
  if (!currentPAKData) {
    errors.push('Data pegawai belum dipilih');
  } else {
    if (!currentPAKData['NIP']) warnings.push('NIP pegawai kosong');
    if (!currentPAKData['Nama Lengkap dengan Gelar']) warnings.push('Nama pegawai kosong');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/* ============================================
 * PRINT PREVIEW MODAL
 * ============================================ */
let currentPreviewPage = 1;
const TOTAL_PAK_PAGES = 4;
const PAGE_TITLES = [
  'Konvensional',
  'Integrasi',
  'Kebutuhan AK',
  'PAK Integrasi',
];

function openPrintPreview() {
  // Validasi dulu
  const validation = validateBeforePrint();
  if (!validation.valid) {
    toastError('Tidak bisa print: ' + validation.errors[0]);
    return;
  }

  // Tampilkan warning jika ada
  if (validation.warnings.length > 0) {
    console.warn('[Print Preview] Warnings:', validation.warnings);
  }

  // Buat modal preview
  let modal = document.getElementById('printPreviewModal');
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'printPreviewModal';
  modal.className = 'print-preview-modal active';

  // Clone dokumen dari preview ke modal
  const printArea = document.getElementById('pakPrintArea');
  const clonedContent = printArea ? printArea.innerHTML : '<p>Error: dokumen belum di-generate</p>';

  modal.innerHTML = `
    <div class="print-preview-header">
      <h3><i class="fas fa-print"></i> Print Preview — PAK Integrasi (4 Halaman)</h3>
      <div class="print-preview-nav">
        <button id="prevPageBtn" onclick="navigatePreviewPage(-1)" title="Halaman sebelumnya">
          <i class="fas fa-chevron-left"></i> Prev
        </button>
        <span class="print-preview-page-info" id="previewPageInfo">1 / 4</span>
        <button id="nextPageBtn" onclick="navigatePreviewPage(1)" title="Halaman berikutnya">
          Next <i class="fas fa-chevron-right"></i>
        </button>
      </div>
      <div class="print-preview-actions">
        <button class="btn-print" onclick="confirmPrintFromPreview()">
          <i class="fas fa-print"></i> Print / Save as PDF
        </button>
        <button class="btn-close" onclick="closePrintPreview()">
          <i class="fas fa-times"></i> Tutup
        </button>
      </div>
    </div>
    <div class="print-preview-body">
      ${clonedContent}
    </div>
    <div class="print-preview-validation ${validation.warnings.length === 0 ? 'valid' : ''}">
      <i class="fas fa-${validation.warnings.length === 0 ? 'check-circle' : 'info-circle'}"></i>
      ${validation.warnings.length === 0
        ? '<strong>Siap dicetak:</strong> 4 halaman A4, semua data lengkap.'
        : `<strong>Catatan:</strong> ${validation.warnings.length} hal yang perlu perhatian (lihat console). Sistem akan auto-scale konten agar muat.`
      }
    </div>
  `;

  document.body.appendChild(modal);

  // Setup: ambil semua .pak-page di modal, tampilkan hanya 1
  const modalPages = modal.querySelectorAll('.pak-page');
  modalPages.forEach((page, idx) => {
    page.classList.add('print-preview-page-container');
    page.classList.toggle('active', idx === 0);
  });

  // Hilangkan page indicator default (yg di luar)
  modal.querySelectorAll('.page-indicator').forEach((el) => {
    el.style.display = 'none';
  });

  currentPreviewPage = 1;
  updatePreviewPageInfo();

  // Re-apply auto-fit untuk pages di modal
  setTimeout(() => {
    const modalPageEls = modal.querySelectorAll('.pak-page');
    modalPageEls.forEach((p) => autoFitPage(p));
  }, 100);
}

function navigatePreviewPage(direction) {
  const newPage = currentPreviewPage + direction;
  if (newPage < 1 || newPage > TOTAL_PAK_PAGES) return;

  currentPreviewPage = newPage;
  updatePreviewPageInfo();

  // Update visible page
  const modal = document.getElementById('printPreviewModal');
  if (!modal) return;

  const pages = modal.querySelectorAll('.pak-page');
  pages.forEach((page, idx) => {
    page.classList.toggle('active', idx === currentPreviewPage - 1);
  });

  // Scroll ke atas
  const body = modal.querySelector('.print-preview-body');
  if (body) body.scrollTop = 0;
}

function updatePreviewPageInfo() {
  const info = document.getElementById('previewPageInfo');
  if (info) {
    info.textContent = `${currentPreviewPage} / ${TOTAL_PAK_PAGES} — ${PAGE_TITLES[currentPreviewPage - 1] || ''}`;
  }

  // Update prev/next button state
  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');
  if (prevBtn) prevBtn.disabled = currentPreviewPage === 1;
  if (nextBtn) nextBtn.disabled = currentPreviewPage === TOTAL_PAK_PAGES;
}

function closePrintPreview() {
  const modal = document.getElementById('printPreviewModal');
  if (modal) modal.remove();
}

function confirmPrintFromPreview() {
  closePrintPreview();
  // Beri delay sedikit supaya modal hilang dulu
  setTimeout(() => {
    printPAKIntegrasi();
  }, 200);
}

/**
 * Helper: Kop Surat (text-based + logo image)
 * Logo bisa diganti via editor (TinyMCE bisa edit gambar)
 */
function getKopSurat(instansi) {
  // Cek apakah ada logo custom di localStorage (dari upload di editor)
  let logoSrc = 'assets/kop-surat.png';
  try {
    const customLogo = localStorage.getItem('pakti_logo_kop');
    if (customLogo) logoSrc = customLogo;
  } catch (e) {}

  return `
    <div class="kop-surat">
      <div class="kop-logo-text">
        <img src="${escapeHtml(logoSrc)}" alt="Logo" class="kop-logo-img" style="width: 24mm; height: 28mm; object-fit: contain; border: 1px solid #000;" />
      </div>
      <div class="kop-text-block">
        <div class="kop-line1">PEMERINTAH KABUPATEN KUTAI KARTANEGARA</div>
        <div class="kop-line2">DINAS KESEHATAN</div>
        <div class="kop-line3">Jln. Cut Nyak Dien No. 33 Telp.(0541) 661082 Fax. (0541) 662258 Kode Pos 75512</div>
        <div class="kop-line3">Website : www.dinkes.kutaikartanegarakab.go.id E-mail: dinaskesehatan.kukar@gmail.com</div>
      </div>
    </div>
    <div class="kop-line-separator"></div>
  `;
}

/**
 * Helper: Format angka ke format Indonesia (koma sebagai desimal)
 */
function fmt(num) {
  const n = parseFloat(num) || 0;
  return n.toFixed(3).replace(/\./g, ',');
}

/**
 * Helper: Data perorangan (sama di semua dokumen)
 */
function getPersonalInfoTable(row) {
  const safe = (v) => escapeHtml(v || '-');
  const raw = row._raw || {};

  const ttl = raw.tempat_lahir
    ? `${raw.tempat_lahir}, ${formatTanggalIndo(raw.tanggal_lahir)}`
    : formatTanggalIndo(raw.tanggal_lahir || '');
  const tmtPangkat = formatTanggalIndo(raw.tmt_pangkat || '');
  const tmtJf = formatTanggalIndo(raw.tmt_jf || '');

  return `
    <tr><td class="section-header" colspan="5">I. KETERANGAN PERORANGAN</td></tr>
    <tr><td class="col-no">1</td><td class="col-label">NAMA</td><td class="col-value" colspan="3">: ${safe(row['Nama Lengkap dengan Gelar'])}</td></tr>
    <tr><td class="col-no">2</td><td class="col-label">NIP/NRK</td><td class="col-value" colspan="3">: ${safe(row['NIP'])}</td></tr>
    <tr><td class="col-no">3</td><td class="col-label">NOMOR SERI KARPEG</td><td class="col-value" colspan="3">: ${safe(row['No Karpeg'])}</td></tr>
    <tr><td class="col-no">4</td><td class="col-label">PANGKAT/GOLONGAN RUANG/TMT</td><td class="col-value" colspan="3">: ${safe(row['Pangkat/Gol'])} ${tmtPangkat ? '/ ' + escapeHtml(tmtPangkat) : ''}</td></tr>
    <tr><td class="col-no">5</td><td class="col-label">TEMPAT/TANGGAL LAHIR</td><td class="col-value" colspan="3">: ${safe(ttl)}</td></tr>
    <tr><td class="col-no">6</td><td class="col-label">JENIS KELAMIN</td><td class="col-value" colspan="3">: ${safe(row['Jenis Kelamin'])}</td></tr>
    <tr><td class="col-no">7</td><td class="col-label">PENDIDIKAN</td><td class="col-value" colspan="3">: ${safe(row.Pendidikan)}</td></tr>
    <tr><td class="col-no">8</td><td class="col-label">JABATAN/TMT</td><td class="col-value" colspan="3">: ${safe(row['Jenis JF'])} ${tmtJf ? '/ ' + escapeHtml(tmtJf) : ''}</td></tr>
    <tr><td class="col-no">9</td><td class="col-label">MASA KERJA GOLONGAN</td><td class="col-value" colspan="3">: ${safe(row['Masa Kerja Gol'])}</td></tr>
    <tr><td class="col-no">10</td><td class="col-label">UNIT KERJA</td><td class="col-value" colspan="3">: ${safe(row['Satuan Kerja'])}</td></tr>
  `;
}

/**
 * Helper: Format tanggal ke format Indonesia panjang (untuk dokumen resmi)
 * Contoh: 2025-01-15 -> 15 Januari 2025
 */
function formatTanggalIndo(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${String(d.getDate()).padStart(2, '0')} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
  } catch (e) {
    return String(dateStr);
  }
}

/**
 * Helper: Tanda tangan pejabat
 */
function getTtdBlock(row) {
  const safe = (v) => escapeHtml(v || '');
  const tanggal = row.tanggalPenetapan ? formatTanggalIndo(row.tanggalPenetapan) : formatTanggalIndo(new Date().toISOString());
  return `
    <div class="ttd-block">
      <p>Ditetapkan di : ${safe(row.lokasiPenetapan || 'Tenggarong')}</p>
      <p>Tanggal : ${escapeHtml(tanggal)}</p>
      <p style="margin-top: 8px;">Pejabat Penilai Kinerja,</p>
      <div class="ttd-space"></div>
      <p><strong>${safe(row.namaPejabat) || '(..............................)'}</strong></p>
      <p>NIP. ${safe(row.nipPejabat) || '..............................'}</p>
    </div>
  `;
}

/* ============================================
 * DOKUMEN 1: KONVENSIONAL
 * ============================================ */
function generateKonvensionalHTML(row) {
  const akLamaP = row.akLamaPendidikan || 0;
  const akBaruP = row.akBaruPendidikan || 0;
  const akLamaT = row.akLamaTugasPokok || 0;
  const akBaruT = row.akBaruTugasPokok || 0;
  const akLamaPg = row.akLamaPengembangan || 0;
  const akBaruPg = row.akBaruPengembangan || 0;
  const akLamaPn = row.akLamaPenunjang || 0;
  const akBaruPn = row.akBaruPenunjang || 0;

  const jmlUtamaLama = akLamaP + akLamaT + akLamaPg;
  const jmlUtamaBaru = akBaruP + akBaruT + akBaruPg;
  const jmlUtamaTotal = jmlUtamaLama + jmlUtamaBaru;

  const totalLama = jmlUtamaLama + akLamaPn;
  const totalBaru = jmlUtamaBaru + akBaruPn;
  const grandTotal = totalLama + totalBaru;

  return `
    ${getKopSurat()}
    <div class="doc-title-block">
      <div class="doc-title-main">PENETAPAN ANGKA KREDIT KONVENSIONAL</div>
      <div class="doc-title-num">NOMOR: ${escapeHtml(row.periodePenilaian || '-')}</div>
    </div>
    <table style="width:100%; margin-bottom: 4mm;">
      <tr>
        <td style="text-align: left;">Instansi : ${escapeHtml(row.Instansi || 'Dinas Kesehatan Kab. Kutai Kartanegara')}</td>
        <td style="text-align: right;">Periode penilaian : ${escapeHtml(row.periodePenilaian || '-')}</td>
      </tr>
    </table>
    <table class="pak-table">
      ${getPersonalInfoTable(row)}
      <tr><td class="section-header" colspan="5">II. PENETAPAN ANGKA KREDIT</td></tr>
      <tr class="ak-header-row">
        <th class="col-no">&nbsp;</th><th class="col-label">&nbsp;</th>
        <th class="col-ak">LAMA</th><th class="col-ak">BARU</th><th class="col-ak">JUMLAH</th>
      </tr>
      <tr><td class="col-no">1</td><td class="col-label"><strong>Unsur Utama</strong></td><td></td><td></td><td></td></tr>
      <tr><td></td><td class="col-label-indent">A. Pendidikan</td>
        <td class="col-ak">${fmt(akLamaP)}</td><td class="col-ak">${fmt(akBaruP)}</td><td class="col-ak">${fmt(akLamaP + akBaruP)}</td></tr>
      <tr><td></td><td class="col-label-indent">B. Tugas Pokok</td>
        <td class="col-ak">${fmt(akLamaT)}</td><td class="col-ak">${fmt(akBaruT)}</td><td class="col-ak">${fmt(akLamaT + akBaruT)}</td></tr>
      <tr><td></td><td class="col-label-indent">C. Pengembangan Profesi</td>
        <td class="col-ak">${fmt(akLamaPg)}</td><td class="col-ak">${fmt(akBaruPg)}</td><td class="col-ak">${fmt(akLamaPg + akBaruPg)}</td></tr>
      <tr class="subtotal-row"><td></td><td class="col-label"><em>Jumlah</em></td>
        <td class="col-ak">${fmt(jmlUtamaLama)}</td><td class="col-ak">${fmt(jmlUtamaBaru)}</td><td class="col-ak">${fmt(jmlUtamaTotal)}</td></tr>
      <tr><td class="col-no">2</td><td class="col-label">Unsur Penunjang</td>
        <td class="col-ak">${fmt(akLamaPn)}</td><td class="col-ak">${fmt(akBaruPn)}</td><td class="col-ak">${fmt(akLamaPn + akBaruPn)}</td></tr>
      <tr class="subtotal-row"><td></td><td class="col-label"><em>Jumlah</em></td>
        <td class="col-ak">${fmt(akLamaPn)}</td><td class="col-ak">${fmt(akBaruPn)}</td><td class="col-ak">${fmt(akLamaPn + akBaruPn)}</td></tr>
      <tr class="total-row"><td colspan="2"><strong>Total</strong></td>
        <td class="col-ak"><strong>${fmt(totalLama)}</strong></td>
        <td class="col-ak"><strong>${fmt(totalBaru)}</strong></td>
        <td class="col-ak"><strong>${fmt(grandTotal)}</strong></td></tr>
    </table>
    ${getTtdBlock(row)}
  `;
}

/* ============================================
 * DOKUMEN 2: INTEGRASI
 * ============================================ */
function generateIntegrasiHTML(row) {
  const totalKonvensional =
    (row.akLamaPendidikan || 0) + (row.akBaruPendidikan || 0) +
    (row.akLamaTugasPokok || 0) + (row.akBaruTugasPokok || 0) +
    (row.akLamaPengembangan || 0) + (row.akBaruPengembangan || 0) +
    (row.akLamaPenunjang || 0) + (row.akBaruPenunjang || 0);

  const nilaiDasar = row.nilaiDasar || 0;
  const akDinilaikan = totalKonvensional - nilaiDasar;

  return `
    ${getKopSurat()}
    <div class="doc-title-block">
      <div class="doc-title-main">FORMULIR PERHITUNGAN DAN AKUMULASI<br>ANGKA KREDIT PADA PENILAIAN INTEGRASI</div>
    </div>
    <div style="text-align: center; font-weight: bold; margin-bottom: 4mm;">JABATAN FUNGSIONAL YANG DINILAI</div>
    <table class="pak-table">
      ${getPersonalInfoTable(row)}
      <tr><td class="section-header" colspan="5">II. PERHITUNGAN PENYESUAIAN ANGKA KREDIT INTEGRASI</td></tr>
      <tr><td class="section-sub-header" colspan="5">JUMLAH ANGKA KREDIT YANG DIPEROLEH</td></tr>
      <tr class="ak-header-row">
        <th class="col-no">&nbsp;</th>
        <th class="col-label">JUMLAH AK KONVENSIONAL</th>
        <th class="col-ak" colspan="2">NILAI DASAR</th>
        <th class="col-ak">AK YANG DINILAIKAN</th>
      </tr>
      <tr>
        <td class="col-no">1</td>
        <td class="col-ak">${fmt(totalKonvensional)}</td>
        <td class="col-ak" colspan="2">${fmt(nilaiDasar)}</td>
        <td class="col-ak"><strong>${fmt(akDinilaikan)}</strong></td>
      </tr>
    </table>
    ${getTtdBlock(row)}
  `;
}

/* ============================================
 * DOKUMEN 3: KEBUTUHAN AK
 * ============================================ */
function generateKebutuhanAKHTML(row) {
  const akP = (row.akLamaPendidikan || 0) + (row.akBaruPendidikan || 0);
  const akT = (row.akLamaTugasPokok || 0) + (row.akBaruTugasPokok || 0);
  const akPg = (row.akLamaPengembangan || 0) + (row.akBaruPengembangan || 0);
  const akPn = (row.akLamaPenunjang || 0) + (row.akBaruPenunjang || 0);

  const totalKonv = akP + akT + akPg + akPn;
  const akTugasJabatan = totalKonv - (akPg + akPn);
  const totalIntegrasi = akTugasJabatan + 0 + akPn;
  const akMinPangkat = row.akMinimalPangkat || 0;
  const akMinJenjang = row.akMinimalJenjang || 0;
  const akMinPengembangan = row.akMinimalPengembangan || 0;

  return `
    ${getKopSurat()}
    <div class="doc-title-block">
      <div class="doc-title-main">FORMULIR PERHITUNGAN KEBUTUHAN<br>KEKURANGAN ANGKA KREDIT</div>
      <div class="doc-title-num">NOMOR: ${escapeHtml(row.periodePenilaian || '-')}</div>
    </div>
    <table style="width:100%; margin-bottom: 4mm;">
      <tr>
        <td style="text-align: left;">Instansi : ${escapeHtml(row.Instansi || 'Dinas Kesehatan Kab. Kutai Kartanegara')}</td>
        <td style="text-align: right;">Periode penilaian : ${escapeHtml(row.periodePenilaian || '-')}</td>
      </tr>
    </table>
    <table class="pak-table">
      ${getPersonalInfoTable(row)}
      <tr><td class="section-header" colspan="5">II. PERHITUNGAN PENYESUAIAN ANGKA KREDIT DARI KONVENSIONAL KE INTEGRASI</td></tr>
      <tr class="ak-header-row">
        <th class="col-no">&nbsp;</th>
        <th class="col-label">ANGKA KREDIT KONVENSIONAL</th>
        <th class="col-ak" colspan="2">ANGKA KREDIT INTEGRASI</th>
        <th class="col-ak">&nbsp;</th>
      </tr>
      <tr><td class="col-no">1</td><td class="col-label">Pendidikan</td><td class="col-ak">${fmt(akP)}</td>
        <td class="col-label">Tugas Jabatan</td><td class="col-ak">${fmt(akTugasJabatan)}</td></tr>
      <tr><td class="col-no">2</td><td class="col-label">Tugas Pokok</td><td class="col-ak">${fmt(akT)}</td>
        <td class="col-label">Pengembangan Profesi</td><td class="col-ak">${fmt(0)}</td></tr>
      <tr><td class="col-no">3</td><td class="col-label">Pengembangan Profesi</td><td class="col-ak">${fmt(akPg)}</td>
        <td class="col-label">Penunjang</td><td class="col-ak">${fmt(akPn)}</td></tr>
      <tr><td class="col-no">4</td><td class="col-label">Unsur Penunjang</td><td class="col-ak">${fmt(akPn)}</td>
        <td></td><td></td></tr>
      <tr class="total-row"><td colspan="2"><strong>JUMLAH</strong></td><td class="col-ak"><strong>${fmt(totalKonv)}</strong></td>
        <td><strong>JUMLAH</strong></td><td class="col-ak"><strong>${fmt(totalIntegrasi)}</strong></td></tr>
    </table>
    ${getTtdBlock(row)}
  `;
}

/* ============================================
 * DOKUMEN 4: PAK INTEGRASI
 * ============================================ */
function generatePAKIntegrasiHTML(row) {
  const akTugasJabatan = (row.akLamaTugasPokok || 0) + (row.akBaruTugasPokok || 0);
  const akPengembangan = (row.akLamaPengembangan || 0) + (row.akBaruPengembangan || 0);
  const akPenunjang = (row.akLamaPenunjang || 0) + (row.akBaruPenunjang || 0);
  const totalAK = akTugasJabatan + akPengembangan + akPenunjang;

  const akMinPangkat = row.akMinimalPangkat || 0;
  const akMinJenjang = row.akMinimalJenjang || 0;
  const akMinPengembangan = row.akMinimalPengembangan || 0;

  const kekuranganPangkat = akMinPangkat - totalAK;
  const kekuranganJenjang = akMinJenjang - totalAK;
  const kekuranganPengembangan = akMinPengembangan - akPengembangan;

  return `
    ${getKopSurat()}
    <div class="doc-title-block">
      <div class="doc-title-main">PENETAPAN ANGKA KREDIT INTEGRASI</div>
      <div class="doc-title-num">NOMOR: ${escapeHtml(row.periodePenilaian || '-')}</div>
    </div>
    <table style="width:100%; margin-bottom: 4mm;">
      <tr>
        <td style="text-align: left;">Instansi : ${escapeHtml(row.Instansi || 'Dinas Kesehatan Kab. Kutai Kartanegara')}</td>
        <td style="text-align: right;">Periode penilaian : ${escapeHtml(row.periodePenilaian || '-')}</td>
      </tr>
    </table>
    <table class="pak-table">
      ${getPersonalInfoTable(row)}
      <tr><td class="section-header" colspan="6">II. PENETAPAN ANGKA KREDIT</td></tr>
      <tr class="ak-header-row">
        <th class="col-no">&nbsp;</th><th class="col-label">&nbsp;</th>
        <th class="col-ak">LAMA</th><th class="col-ak">BARU</th><th class="col-ak">JUMLAH</th><th class="col-ak">PERALIHAN</th>
      </tr>
      <tr><td class="col-no">1</td><td class="col-label">Angka Kredit dasar yang diberikan</td>
        <td class="col-ak"></td><td class="col-ak"></td><td class="col-ak"></td><td class="col-ak"></td></tr>
      <tr><td class="col-no">2</td><td class="col-label">Angka Kredit yang diperoleh dari Pengalaman</td>
        <td class="col-ak"></td><td class="col-ak"></td><td class="col-ak"></td><td class="col-ak"></td></tr>
      <tr><td class="col-no">3</td><td class="col-label">Angka Kredit dari Kegiatan Tugas Jabatan</td>
        <td class="col-ak">0</td><td class="col-ak">${fmt(akTugasJabatan)}</td><td class="col-ak">${fmt(akTugasJabatan)}</td><td class="col-ak"></td></tr>
      <tr><td class="col-no">4</td><td class="col-label">Angka Kredit dari pengembangan profesi</td>
        <td class="col-ak">0</td><td class="col-ak">${fmt(akPengembangan)}</td><td class="col-ak">${fmt(akPengembangan)}</td><td class="col-ak"></td></tr>
      <tr><td class="col-no">5</td><td class="col-label">Angka Kredit dari Kegiatan Penunjang</td>
        <td class="col-ak">0</td><td class="col-ak">${fmt(akPenunjang)}</td><td class="col-ak">${fmt(akPenunjang)}</td><td class="col-ak"></td></tr>
      <tr class="total-row"><td colspan="2"><strong>TOTAL ANGKA KREDIT</strong></td>
        <td class="col-ak"><strong>0</strong></td>
        <td class="col-ak"><strong>${fmt(totalAK)}</strong></td>
        <td class="col-ak"><strong>${fmt(totalAK)}</strong></td>
        <td class="col-ak"></td></tr>
      <tr><td class="section-header" colspan="6">III. KETERANGAN</td></tr>
      <tr class="ak-header-row">
        <th class="col-label" colspan="2">URAIAN</th>
        <th class="col-ak">Pangkat</th>
        <th class="col-ak">Jenjang Jabatan</th>
        <th class="col-ak" colspan="2">Pengembangan Profesi</th>
      </tr>
      <tr><td class="col-label" colspan="2">Angka Kredit minimal untuk kenaikan pangkat / jenjang</td>
        <td class="col-ak">${fmt(akMinPangkat)}</td>
        <td class="col-ak">${fmt(akMinJenjang)}</td>
        <td class="col-ak" colspan="2">${fmt(akMinPengembangan)}</td></tr>
      <tr><td class="col-label" colspan="2"><strong>Kekurangan/Kelebihan Angka Kredit yang dicapai untuk kenaikan pangkat/jenjang</strong></td>
        <td class="col-ak"><strong>${fmt(Math.abs(kekuranganPangkat))}</strong></td>
        <td class="col-ak"><strong>${fmt(Math.abs(kekuranganJenjang))}</strong></td>
        <td class="col-ak" colspan="2"><strong>${fmt(Math.abs(kekuranganPengembangan))}</strong></td></tr>
    </table>
    ${row.rekomendasi ? `<div style="margin-top: 4mm; font-weight: bold;">III. ${escapeHtml(row.rekomendasi)}</div>` : ''}
    ${getTtdBlock(row)}
  `;
}

function printPAKIntegrasi() {
  // 1. Validasi sebelum print
  const validation = validateBeforePrint();
  if (!validation.valid) {
    toastError('Tidak bisa print: ' + validation.errors[0]);
    return;
  }

  // 2. Tampilkan warning jika ada
  if (validation.warnings.length > 0) {
    console.warn('[Print] Warnings:', validation.warnings);
  }

  // 3. Ambil print area
  const printArea = document.getElementById('pakPrintArea');
  if (!printArea) {
    toastWarning('Generate PAK terlebih dahulu!');
    return;
  }

  // 4. Re-apply auto-fit untuk memastikan konten muat
  const pages = printArea.querySelectorAll('.pak-page');
  pages.forEach((p) => autoFitPage(p));

  // 5. Clone ke wrapper print
  const printWrapper = document.createElement('div');
  printWrapper.id = 'pakPrintWrapper';
  printWrapper.className = 'pak-print-wrapper';
  printWrapper.innerHTML = printArea.innerHTML;

  // Hapus wrapper lama jika ada
  const oldWrapper = document.getElementById('pakPrintWrapper');
  if (oldWrapper) oldWrapper.remove();

  document.body.appendChild(printWrapper);
  document.body.classList.add('printing-pak');

  // 6. Beri delay untuk render sebelum print
  setTimeout(() => {
    window.print();

    // 7. Cleanup setelah print dialog selesai
    setTimeout(() => {
      document.body.classList.remove('printing-pak');
      const w = document.getElementById('pakPrintWrapper');
      if (w) w.remove();
    }, 500);
  }, 400);
}

function resetPAKForm() {
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

  const previewBtn = document.getElementById('pakPreviewBtn');
  if (previewBtn) previewBtn.style.display = 'none';

  const editBtn = document.getElementById('pakEditBtn');
  if (editBtn) editBtn.style.display = 'none';

  const wordBtn = document.getElementById('pakWordBtn');
  if (wordBtn) wordBtn.style.display = 'none';

  currentPAKData = null;
  toastInfo('Form direset');
}

function printoutAdminData() {
  document.body.classList.add('printing-admin');
  setTimeout(() => {
    window.print();
    document.body.classList.remove('printing-admin');
  }, 300);
}

/* ============================================
 * EXPORT WORD A4 (.doc) - Template Resmi
 * ============================================
 * Menghasilkan file .doc (Word HTML) dengan halaman A4 portrait
 * (21cm x 29.7cm, margin 2cm), Times New Roman, 4 halaman dokumen:
 * 1. Penetapan AK Konvensional
 * 2. Formulir Penyesuaian AK ke Integrasi
 * 3. Formulir Perhitungan Kebutuhan AK
 * 4. Penetapan AK Integrasi
 * Template mengikuti dokumen resmi PAK (kop surat, tabel, tanda tangan).
 * ============================================ */

const WORD_BULAN_INDO = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/**
 * Ambil logo kop sebagai dataURL (untuk embed di Word)
 * Prioritas: logo custom dari localStorage -> assets/kop-surat.png
 */
async function getKopLogoDataUrl() {
  try {
    const customLogo = localStorage.getItem('pakti_logo_kop');
    if (customLogo && customLogo.startsWith('data:image')) return customLogo;
  } catch (e) { /* ignore */ }

  try {
    const resp = await fetch('assets/kop-surat.png');
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('[Word Export] Logo tidak dapat dimuat:', e);
    return null;
  }
}

/**
 * CSS dasar untuk dokumen Word (A4, Times New Roman)
 */
function wordBaseCss() {
  return `
    @page WordSection1 { size: 21.0cm 29.7cm; margin: 2cm 1.8cm 2cm 1.8cm; mso-page-orientation: portrait; mso-header-margin: 1cm; mso-footer-margin: 1cm; }
    div.WordSection1 { page: WordSection1; }
    body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #000; }
    p { margin: 0 0 2pt 0; }
    table { border-collapse: collapse; }
    .pak-w-table td { border: 1px solid #000; padding: 3px 5px; font-size: 9pt; vertical-align: top; line-height: 1.25; word-wrap: break-word; }
    .pak-w-section-header { background: #E0E0E0; font-weight: bold; text-align: left; }
    .pak-w-sub-header { background: #F0F0F0; font-weight: bold; text-align: center; }
    .pak-w-ak-header { background: #F5F5F5; text-align: center; font-weight: bold; font-size: 8.5pt; }
    .pak-w-col-no { width: 6%; text-align: center; }
    .pak-w-col-label { width: 38%; }
    .pak-w-col-label-indent { width: 38%; padding-left: 22px; }
    .pak-w-col-ak { text-align: center; width: 14%; }
    .pak-w-total td { background: #E8E8E8; font-weight: bold; text-align: center; }
    .pak-w-total td:first-child { text-align: left; }
    .pak-w-subtotal td { font-style: italic; }
    .pak-w-doc-title { font-size: 12pt; font-weight: bold; text-align: center; text-decoration: underline; }
    .pak-w-doc-num { font-size: 10pt; text-align: center; }
    .kop-text { font-size: 11pt; text-align: center; line-height: 1.2; }
    .kop-text .kop-l1 { font-weight: bold; font-size: 13pt; }
    .kop-text .kop-l2 { font-weight: bold; font-size: 14pt; letter-spacing: 2px; }
    .kop-text .kop-l3 { font-size: 8.5pt; }
  `;
}

/**
 * Kop surat versi Word
 */
function wordKopSurat(logoDataUrl) {
  const logoHtml = logoDataUrl
    ? `<img src="${logoDataUrl}" width="68" height="79" style="width:68pt;height:79pt;" alt="Logo">`
    : `<div style="width:68pt;height:79pt;border:1px solid #000;text-align:center;">LOGO</div>`;

  return `
    <table width="100%" style="border-collapse:collapse;" cellpadding="0" cellspacing="0">
      <tr>
        <td style="width:15%; border:none; text-align:center; vertical-align:middle;">${logoHtml}</td>
        <td class="kop-text" style="border:none; text-align:center; vertical-align:middle;">
          <div class="kop-l1">PEMERINTAH KABUPATEN KUTAI KARTANEGARA</div>
          <div class="kop-l2">DINAS KESEHATAN</div>
          <div class="kop-l3">Jln. Cut Nyak Dien No. 33 Telp.(0541) 661082 Fax. (0541) 662258 Kode Pos 75512</div>
          <div class="kop-l3">Website : www.dinkes.kutaikartanegarakab.go.id E-mail: dinaskesehatan.kukar@gmail.com</div>
        </td>
        <td style="width:15%; border:none;">&nbsp;</td>
      </tr>
    </table>
    <div style="border-bottom: 3px double #000; font-size: 1pt;">&nbsp;</div>
    <p style="font-size:2pt;">&nbsp;</p>
  `;
}

/**
 * Tabel Keterangan Perorangan versi Word
 */
function wordPersonalTable(row) {
  const safe = (v) => escapeHtml(v || '-');
  const raw = row._raw || {};

  const ttl = raw.tempat_lahir
    ? `${raw.tempat_lahir}, ${formatTanggalIndo(raw.tanggal_lahir)}`
    : formatTanggalIndo(raw.tanggal_lahir || '');
  const tmtPangkat = formatTanggalIndo(raw.tmt_pangkat || '');
  const tmtJf = formatTanggalIndo(raw.tmt_jf || '');

  return `
    <tr><td class="pak-w-section-header" colspan="3">I. KETERANGAN PERORANGAN</td></tr>
    <tr><td class="pak-w-col-no">1</td><td class="pak-w-col-label">NAMA</td><td>: ${safe(row['Nama Lengkap dengan Gelar'])}</td></tr>
    <tr><td class="pak-w-col-no">2</td><td class="pak-w-col-label">NIP/NRK</td><td>: ${safe(row['NIP'])}</td></tr>
    <tr><td class="pak-w-col-no">3</td><td class="pak-w-col-label">NOMOR SERI KARPEG</td><td>: ${safe(row['No Karpeg'])}</td></tr>
    <tr><td class="pak-w-col-no">4</td><td class="pak-w-col-label">PANGKAT/GOLONGAN RUANG/TMT</td><td>: ${safe(row['Pangkat/Gol'])}${tmtPangkat ? ' / ' + escapeHtml(tmtPangkat) : ''}</td></tr>
    <tr><td class="pak-w-col-no">5</td><td class="pak-w-col-label">TEMPAT/TANGGAL LAHIR</td><td>: ${safe(ttl)}</td></tr>
    <tr><td class="pak-w-col-no">6</td><td class="pak-w-col-label">JENIS KELAMIN</td><td>: ${safe(row['Jenis Kelamin'])}</td></tr>
    <tr><td class="pak-w-col-no">7</td><td class="pak-w-col-label">PENDIDIKAN</td><td>: ${safe(row.Pendidikan)}</td></tr>
    <tr><td class="pak-w-col-no">8</td><td class="pak-w-col-label">JABATAN/TMT</td><td>: ${safe(row['Jenis JF'])}${tmtJf ? ' / ' + escapeHtml(tmtJf) : ''}</td></tr>
    <tr><td class="pak-w-col-no">9</td><td class="pak-w-col-label">MASA KERJA GOLONGAN</td><td>: ${safe(row['Masa Kerja Gol'])}</td></tr>
    <tr><td class="pak-w-col-no">10</td><td class="pak-w-col-label">UNIT KERJA</td><td>: ${safe(row['Satuan Kerja'])}</td></tr>
  `;
}

/**
 * Tanda tangan versi Word
 */
function wordTtdBlock(row) {
  const safe = (v) => escapeHtml(v || '');
  const tanggal = row.tanggalPenetapan ? formatTanggalIndo(row.tanggalPenetapan) : formatTanggalIndo(new Date().toISOString());
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-top:12pt;">
      <tr>
        <td width="50%" style="border:none;">&nbsp;</td>
        <td width="50%" style="border:none; font-size:9pt; line-height:1.4;">
          <p>Ditetapkan di : ${safe(row.lokasiPenetapan || 'Tenggarong')}</p>
          <p>Tanggal : ${escapeHtml(tanggal)}</p>
          <p style="margin-top:8pt;">Pejabat Penilai Kinerja,</p>
          <p style="height:40pt;">&nbsp;</p>
          <p><strong>${safe(row.namaPejabat) || '(..............................)'}</strong></p>
          <p>NIP. ${safe(row.nipPejabat) || '..............................'}</p>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Tabel Instansi & Periode versi Word
 */
function wordInstansiRow(row) {
  const safe = (v) => escapeHtml(v || '-');
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-bottom:6pt;">
      <tr>
        <td style="border:none; font-size:9pt;">Instansi : ${safe(row.Instansi || 'Dinas Kesehatan Kab. Kutai Kartanegara')}</td>
        <td style="border:none; font-size:9pt; text-align:right;">Periode penilaian : ${safe(row.periodePenilaian)}</td>
      </tr>
    </table>
  `;
}

/**
 * Word halaman: judul dokumen
 */
function wordTitle(main, nomor) {
  return `
    <p class="pak-w-doc-title">${escapeHtml(main)}</p>
    ${nomor ? `<p class="pak-w-doc-num">NOMOR : ${escapeHtml(nomor)}</p>` : ''}
    <p style="font-size:6pt;">&nbsp;</p>
  `;
}

/**
 * Word Dokumen 1: Konvensional
 */
function wordDoc1(row) {
  const akLamaP = row.akLamaPendidikan || 0;
  const akBaruP = row.akBaruPendidikan || 0;
  const akLamaT = row.akLamaTugasPokok || 0;
  const akBaruT = row.akBaruTugasPokok || 0;
  const akLamaPg = row.akLamaPengembangan || 0;
  const akBaruPg = row.akBaruPengembangan || 0;
  const akLamaPn = row.akLamaPenunjang || 0;
  const akBaruPn = row.akBaruPenunjang || 0;

  const jmlUtamaLama = akLamaP + akLamaT + akLamaPg;
  const jmlUtamaBaru = akBaruP + akBaruT + akBaruPg;
  const totalLama = jmlUtamaLama + akLamaPn;
  const totalBaru = jmlUtamaBaru + akBaruPn;
  const grandTotal = totalLama + totalBaru;

  return `
    ${wordKopSurat(getKopLogoDataUrlSync())}
    ${wordTitle('PENETAPAN ANGKA KREDIT KONVENSIONAL', row.periodePenilaian)}
    ${wordInstansiRow(row)}
    <table width="100%" class="pak-w-table" cellpadding="0" cellspacing="0">
      ${wordPersonalTable(row)}
      <tr><td class="pak-w-section-header" colspan="5">II. PENETAPAN ANGKA KREDIT</td></tr>
      <tr>
        <td class="pak-w-ak-header" style="width:6%;">&nbsp;</td>
        <td class="pak-w-ak-header" style="width:38%;">&nbsp;</td>
        <td class="pak-w-ak-header" style="width:18%;">LAMA</td>
        <td class="pak-w-ak-header" style="width:18%;">BARU</td>
        <td class="pak-w-ak-header" style="width:20%;">JUMLAH</td>
      </tr>
      <tr><td class="pak-w-col-no">1</td><td class="pak-w-col-label"><strong>Unsur Utama</strong></td><td></td><td></td><td></td></tr>
      <tr><td></td><td class="pak-w-col-label-indent">A. Pendidikan</td>
        <td class="pak-w-col-ak">${fmt(akLamaP)}</td><td class="pak-w-col-ak">${fmt(akBaruP)}</td><td class="pak-w-col-ak">${fmt(akLamaP + akBaruP)}</td></tr>
      <tr><td></td><td class="pak-w-col-label-indent">B. Tugas Pokok</td>
        <td class="pak-w-col-ak">${fmt(akLamaT)}</td><td class="pak-w-col-ak">${fmt(akBaruT)}</td><td class="pak-w-col-ak">${fmt(akLamaT + akBaruT)}</td></tr>
      <tr><td></td><td class="pak-w-col-label-indent">C. Pengembangan Profesi</td>
        <td class="pak-w-col-ak">${fmt(akLamaPg)}</td><td class="pak-w-col-ak">${fmt(akBaruPg)}</td><td class="pak-w-col-ak">${fmt(akLamaPg + akBaruPg)}</td></tr>
      <tr class="pak-w-subtotal"><td></td><td class="pak-w-col-label"><em>Jumlah</em></td>
        <td class="pak-w-col-ak">${fmt(jmlUtamaLama)}</td><td class="pak-w-col-ak">${fmt(jmlUtamaBaru)}</td><td class="pak-w-col-ak">${fmt(jmlUtamaLama + jmlUtamaBaru)}</td></tr>
      <tr><td class="pak-w-col-no">2</td><td class="pak-w-col-label">Unsur Penunjang</td>
        <td class="pak-w-col-ak">${fmt(akLamaPn)}</td><td class="pak-w-col-ak">${fmt(akBaruPn)}</td><td class="pak-w-col-ak">${fmt(akLamaPn + akBaruPn)}</td></tr>
      <tr class="pak-w-subtotal"><td></td><td class="pak-w-col-label"><em>Jumlah</em></td>
        <td class="pak-w-col-ak">${fmt(akLamaPn)}</td><td class="pak-w-col-ak">${fmt(akBaruPn)}</td><td class="pak-w-col-ak">${fmt(akLamaPn + akBaruPn)}</td></tr>
      <tr class="pak-w-total"><td colspan="2"><strong>Total</strong></td>
        <td class="pak-w-col-ak"><strong>${fmt(totalLama)}</strong></td>
        <td class="pak-w-col-ak"><strong>${fmt(totalBaru)}</strong></td>
        <td class="pak-w-col-ak"><strong>${fmt(grandTotal)}</strong></td></tr>
    </table>
    ${wordTtdBlock(row)}
  `;
}

/**
 * Word Dokumen 2: Integrasi (Penyesuaian AK)
 */
function wordDoc2(row) {
  const totalKonvensional =
    (row.akLamaPendidikan || 0) + (row.akBaruPendidikan || 0) +
    (row.akLamaTugasPokok || 0) + (row.akBaruTugasPokok || 0) +
    (row.akLamaPengembangan || 0) + (row.akBaruPengembangan || 0) +
    (row.akLamaPenunjang || 0) + (row.akBaruPenunjang || 0);

  const nilaiDasar = row.nilaiDasar || 0;
  const akDinilaikan = totalKonvensional - nilaiDasar;

  return `
    ${wordKopSurat(getKopLogoDataUrlSync())}
    ${wordTitle('FORMULIR PERHITUNGAN DAN AKUMULASI<br>ANGKA KREDIT PADA PENILAIAN INTEGRASI', '')}
    <p style="text-align:center; font-weight:bold; margin-bottom:6pt;">JABATAN FUNGSIONAL YANG DINILAI</p>
    <table width="100%" class="pak-w-table" cellpadding="0" cellspacing="0">
      ${wordPersonalTable(row)}
      <tr><td class="pak-w-section-header" colspan="5">II. PERHITUNGAN PENYESUAIAN ANGKA KREDIT INTEGRASI</td></tr>
      <tr><td class="pak-w-sub-header" colspan="5">JUMLAH ANGKA KREDIT YANG DIPEROLEH</td></tr>
      <tr>
        <td class="pak-w-ak-header" style="width:6%;">&nbsp;</td>
        <td class="pak-w-ak-header" style="width:34%;">JUMLAH AK KONVENSIONAL</td>
        <td class="pak-w-ak-header" style="width:20%;" colspan="2">NILAI DASAR</td>
        <td class="pak-w-ak-header" style="width:20%;">AK YANG DINILAIKAN</td>
      </tr>
      <tr>
        <td class="pak-w-col-no">1</td>
        <td class="pak-w-col-ak">${fmt(totalKonvensional)}</td>
        <td class="pak-w-col-ak" colspan="2">${fmt(nilaiDasar)}</td>
        <td class="pak-w-col-ak"><strong>${fmt(akDinilaikan)}</strong></td>
      </tr>
    </table>
    ${wordTtdBlock(row)}
  `;
}

/**
 * Word Dokumen 3: Kebutuhan AK
 */
function wordDoc3(row) {
  const akP = (row.akLamaPendidikan || 0) + (row.akBaruPendidikan || 0);
  const akT = (row.akLamaTugasPokok || 0) + (row.akBaruTugasPokok || 0);
  const akPg = (row.akLamaPengembangan || 0) + (row.akBaruPengembangan || 0);
  const akPn = (row.akLamaPenunjang || 0) + (row.akBaruPenunjang || 0);

  const totalKonv = akP + akT + akPg + akPn;
  const akTugasJabatan = totalKonv - (akPg + akPn);
  const totalIntegrasi = akTugasJabatan + 0 + akPn;

  return `
    ${wordKopSurat(getKopLogoDataUrlSync())}
    ${wordTitle('FORMULIR PERHITUNGAN KEBUTUHAN<br>KEKURANGAN ANGKA KREDIT', row.periodePenilaian)}
    ${wordInstansiRow(row)}
    <table width="100%" class="pak-w-table" cellpadding="0" cellspacing="0">
      ${wordPersonalTable(row)}
      <tr><td class="pak-w-section-header" colspan="5">II. PERHITUNGAN PENYESUAIAN ANGKA KREDIT DARI KONVENSIONAL KE INTEGRASI</td></tr>
      <tr>
        <td class="pak-w-ak-header" style="width:6%;">&nbsp;</td>
        <td class="pak-w-ak-header" style="width:28%;">ANGKA KREDIT KONVENSIONAL</td>
        <td class="pak-w-ak-header" style="width:32%;" colspan="2">ANGKA KREDIT INTEGRASI</td>
        <td class="pak-w-ak-header" style="width:14%;">&nbsp;</td>
      </tr>
      <tr><td class="pak-w-col-no">1</td><td class="pak-w-col-label">Pendidikan</td><td class="pak-w-col-ak">${fmt(akP)}</td>
        <td class="pak-w-col-label">Tugas Jabatan</td><td class="pak-w-col-ak">${fmt(akTugasJabatan)}</td></tr>
      <tr><td class="pak-w-col-no">2</td><td class="pak-w-col-label">Tugas Pokok</td><td class="pak-w-col-ak">${fmt(akT)}</td>
        <td class="pak-w-col-label">Pengembangan Profesi</td><td class="pak-w-col-ak">${fmt(0)}</td></tr>
      <tr><td class="pak-w-col-no">3</td><td class="pak-w-col-label">Pengembangan Profesi</td><td class="pak-w-col-ak">${fmt(akPg)}</td>
        <td class="pak-w-col-label">Penunjang</td><td class="pak-w-col-ak">${fmt(akPn)}</td></tr>
      <tr><td class="pak-w-col-no">4</td><td class="pak-w-col-label">Unsur Penunjang</td><td class="pak-w-col-ak">${fmt(akPn)}</td>
        <td></td><td></td></tr>
      <tr class="pak-w-total"><td colspan="2"><strong>JUMLAH</strong></td><td class="pak-w-col-ak"><strong>${fmt(totalKonv)}</strong></td>
        <td><strong>JUMLAH</strong></td><td class="pak-w-col-ak"><strong>${fmt(totalIntegrasi)}</strong></td></tr>
    </table>
    ${wordTtdBlock(row)}
  `;
}

/**
 * Word Dokumen 4: PAK Integrasi
 */
function wordDoc4(row) {
  const akTugasJabatan = (row.akLamaTugasPokok || 0) + (row.akBaruTugasPokok || 0);
  const akPengembangan = (row.akLamaPengembangan || 0) + (row.akBaruPengembangan || 0);
  const akPenunjang = (row.akLamaPenunjang || 0) + (row.akBaruPenunjang || 0);
  const totalAK = akTugasJabatan + akPengembangan + akPenunjang;

  const akMinPangkat = row.akMinimalPangkat || 0;
  const akMinJenjang = row.akMinimalJenjang || 0;
  const akMinPengembangan = row.akMinimalPengembangan || 0;

  const kekuranganPangkat = akMinPangkat - totalAK;
  const kekuranganJenjang = akMinJenjang - totalAK;
  const kekuranganPengembangan = akMinPengembangan - akPengembangan;

  return `
    ${wordKopSurat(getKopLogoDataUrlSync())}
    ${wordTitle('PENETAPAN ANGKA KREDIT INTEGRASI', row.periodePenilaian)}
    ${wordInstansiRow(row)}
    <table width="100%" class="pak-w-table" cellpadding="0" cellspacing="0">
      ${wordPersonalTable(row)}
      <tr><td class="pak-w-section-header" colspan="6">II. PENETAPAN ANGKA KREDIT</td></tr>
      <tr>
        <td class="pak-w-ak-header" style="width:5%;">&nbsp;</td>
        <td class="pak-w-ak-header" style="width:31%;">&nbsp;</td>
        <td class="pak-w-ak-header" style="width:14%;">LAMA</td>
        <td class="pak-w-ak-header" style="width:14%;">BARU</td>
        <td class="pak-w-ak-header" style="width:14%;">JUMLAH</td>
        <td class="pak-w-ak-header" style="width:14%;">PERALIHAN</td>
      </tr>
      <tr><td class="pak-w-col-no">1</td><td class="pak-w-col-label">Angka Kredit dasar yang diberikan</td>
        <td class="pak-w-col-ak"></td><td class="pak-w-col-ak"></td><td class="pak-w-col-ak"></td><td class="pak-w-col-ak"></td></tr>
      <tr><td class="pak-w-col-no">2</td><td class="pak-w-col-label">Angka Kredit yang diperoleh dari Pengalaman</td>
        <td class="pak-w-col-ak"></td><td class="pak-w-col-ak"></td><td class="pak-w-col-ak"></td><td class="pak-w-col-ak"></td></tr>
      <tr><td class="pak-w-col-no">3</td><td class="pak-w-col-label">Angka Kredit dari Kegiatan Tugas Jabatan</td>
        <td class="pak-w-col-ak">0</td><td class="pak-w-col-ak">${fmt(akTugasJabatan)}</td><td class="pak-w-col-ak">${fmt(akTugasJabatan)}</td><td class="pak-w-col-ak"></td></tr>
      <tr><td class="pak-w-col-no">4</td><td class="pak-w-col-label">Angka Kredit dari pengembangan profesi</td>
        <td class="pak-w-col-ak">0</td><td class="pak-w-col-ak">${fmt(akPengembangan)}</td><td class="pak-w-col-ak">${fmt(akPengembangan)}</td><td class="pak-w-col-ak"></td></tr>
      <tr><td class="pak-w-col-no">5</td><td class="pak-w-col-label">Angka Kredit dari Kegiatan Penunjang</td>
        <td class="pak-w-col-ak">0</td><td class="pak-w-col-ak">${fmt(akPenunjang)}</td><td class="pak-w-col-ak">${fmt(akPenunjang)}</td><td class="pak-w-col-ak"></td></tr>
      <tr class="pak-w-total"><td colspan="2"><strong>TOTAL ANGKA KREDIT</strong></td>
        <td class="pak-w-col-ak"><strong>0</strong></td>
        <td class="pak-w-col-ak"><strong>${fmt(totalAK)}</strong></td>
        <td class="pak-w-col-ak"><strong>${fmt(totalAK)}</strong></td>
        <td class="pak-w-col-ak"></td></tr>
      <tr><td class="pak-w-section-header" colspan="6">III. KETERANGAN</td></tr>
      <tr>
        <td class="pak-w-ak-header" colspan="2" style="width:36%;">URAIAN</td>
        <td class="pak-w-ak-header" style="width:14%;">Pangkat</td>
        <td class="pak-w-ak-header" style="width:14%;">Jenjang Jabatan</td>
        <td class="pak-w-ak-header" style="width:28%;" colspan="2">Pengembangan Profesi</td>
      </tr>
      <tr><td class="pak-w-col-label" colspan="2">Angka Kredit minimal untuk kenaikan pangkat / jenjang</td>
        <td class="pak-w-col-ak">${fmt(akMinPangkat)}</td>
        <td class="pak-w-col-ak">${fmt(akMinJenjang)}</td>
        <td class="pak-w-col-ak" colspan="2">${fmt(akMinPengembangan)}</td></tr>
      <tr><td class="pak-w-col-label" colspan="2"><strong>Kekurangan/Kelebihan Angka Kredit yang dicapai untuk kenaikan pangkat/jenjang</strong></td>
        <td class="pak-w-col-ak"><strong>${fmt(Math.abs(kekuranganPangkat))}</strong></td>
        <td class="pak-w-col-ak"><strong>${fmt(Math.abs(kekuranganJenjang))}</strong></td>
        <td class="pak-w-col-ak" colspan="2"><strong>${fmt(Math.abs(kekuranganPengembangan))}</strong></td></tr>
    </table>
    ${row.rekomendasi ? `<p style="margin-top:8pt; font-weight:bold;">${escapeHtml(row.rekomendasi)}</p>` : ''}
    ${wordTtdBlock(row)}
  `;
}

/**
 * Cache logo dataURL saat export (diambil sekali per proses export)
 */
let _wordLogoCache = null;
function getKopLogoDataUrlSync() {
  return _wordLogoCache || '';
}

/**
 * Rakit HTML lengkap dokumen Word (4 halaman A4)
 */
function buildWordHtml(row, logoDataUrl) {
  _wordLogoCache = logoDataUrl;

  const pageBreak = '<br clear="all" style="mso-special-character:line-break; page-break-before:always;">';

  const page1 = wordDoc1(row);
  const page2 = wordDoc2(row);
  const page3 = wordDoc3(row);
  const page4 = wordDoc4(row);

  const nipSafe = String(row['NIP'] || '').replace(/[^a-zA-Z0-9]/g, '');
  const namaSafe = String(row['Nama Lengkap dengan Gelar'] || 'PAK').replace(/[^a-zA-Z0-9 ]/g, '').trim();

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<title>PAK Integrasi ${escapeHtml(namaSafe)}</title>
<!--[if gte mso 9]><xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml><![endif]-->
<style>${wordBaseCss()}</style>
</head>
<body>
<div class="WordSection1">
${page1}
${pageBreak}
${page2}
${pageBreak}
${page3}
${pageBreak}
${page4}
</div>
</body>
</html>`;

  return { html, fileName: `PAK_Integrasi_${nipSafe || 'dokumen'}_${namaSafe.replace(/\s+/g, '_')}.doc` };
}

/**
 * Download PAK Integrasi sebagai Word A4 (.doc)
 */
async function downloadPAKWord() {
  const select = document.getElementById('pakSelectNIP');
  let row = currentPAKData;

  if (!row && select && select.value) {
    row = pembuatanPAKData.find((r) => String(r._id) === String(select.value));
  }

  if (!row) {
    toastWarning('Generate PAK terlebih dahulu (pilih pegawai, lalu klik "Generate 4 Dokumen PAK")!');
    return;
  }

  const btn = document.getElementById('pakWordBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Menyiapkan Word...';
  }

  try {
    // Ambil logo untuk embed (sekali per export)
    _wordLogoCache = await getKopLogoDataUrl();

    const { html, fileName } = buildWordHtml(row, _wordLogoCache);

    // BOM UTF-8 agar karakter Indonesia terbaca benar di Word
    const blob = new Blob(['\ufeff' + html], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    toastSuccess('Dokumen Word (A4) berhasil diunduh: ' + fileName);
  } catch (error) {
    console.error('[Word Export] Error:', error);
    toastError('Gagal membuat dokumen Word: ' + (error.message || ''));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-file-word"></i> Download Word (A4)';
    }
  }
}

/* ============================================
 * UPLOAD DOKUMEN PAK INTEGRASI TERBIT
 * ============================================
 * Upload dokumen PAK Integrasi yang sudah terbit:
 * 1. File diupload ke Supabase Storage (folder pak_integrasi/)
 * 2. Public URL otomatis ditulis ke kolom pak_integrasi_terbit
 *    pada tabel pengajuan_pak, dicocokkan berdasarkan NIP
 * 3. Opsional: sekaligus set status pengajuan menjadi 'Terbit'
 * ============================================ */

const PAK_UPLOAD_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const PAK_UPLOAD_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
const PAK_UPLOAD_EXT = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];

let pakUploadFile = null;
let pakUploadLockedNip = null;

/**
 * Buka modal Upload Dokumen PAK Terbit
 * @param {string} targetNip - (opsional) NIP tujuan dari tabel status (locked)
 * @param {string} targetNama - (opsional) nama pegawai untuk display
 */
async function openPakUploadModal(targetNip, targetNama) {
  if (!isSupabaseReady()) {
    toastError('Supabase belum dikonfigurasi. Edit js/config.js');
    return;
  }

  pakUploadLockedNip = targetNip || null;
  pakUploadFile = null;

  let modal = document.getElementById('pakUploadModal');
  if (modal) modal.remove();

  // Dropdown pegawai dari Data Master (jika tidak ada target terkunci)
  let pegawaiSelectHTML = '';
  if (targetNip) {
    pegawaiSelectHTML = `
      <div class="form-group">
        <label class="form-label">Pegawai Tujuan</label>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px;">
          <strong>${escapeHtml(targetNama || targetNip)}</strong>
          <span style="color: var(--text-medium);">&nbsp;&bull;&nbsp;NIP ${escapeHtml(targetNip)}</span>
          <i class="fas fa-lock" style="color: var(--success); margin-left: 6px;" title="NIP terkunci dari baris tabel"></i>
        </div>
      </div>
    `;
  } else {
    const options = pembuatanPAKData
      .map((row) => {
        const nip = row.NIP || '-';
        const nama = row['Nama Lengkap dengan Gelar'] || '-';
        return `<option value="${escapeHtml(String(nip))}">${escapeHtml(String(nip))} - ${escapeHtml(nama)}</option>`;
      })
      .join('');

    pegawaiSelectHTML = `
      <div class="form-group">
        <label class="form-label">Pilih Pegawai (dari Data Master) <span class="required">*</span></label>
        <select class="form-select" id="pakUploadNipSelect" style="width: 100%;" onchange="refreshPakUploadStatusInfo()">
          <option value="">-- Pilih Pegawai --</option>
          ${options}
        </select>
        <p style="margin: 6px 0 0 0; font-size: 0.75rem; color: var(--text-light);">
          <i class="fas fa-link"></i> Dokumen akan dicocokkan ke tabel <code>pengajuan_pak</code> berdasarkan NIP pegawai ini.
        </p>
      </div>
    `;
  }

  modal = document.createElement('div');
  modal.id = 'pakUploadModal';
  modal.className = 'modal-overlay active';
  modal.style.cssText = 'display: flex;';

  modal.innerHTML = `
    <div class="modal" style="max-width: 760px; max-height: 90vh; overflow-y: auto;">
      <div class="modal-header">
        <h3 class="modal-title"><i class="fas fa-cloud-upload-alt"></i> Upload Dokumen PAK Integrasi Terbit</h3>
        <button class="modal-close" onclick="closePakUploadModal()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">

        <div style="background: #f0f9ff; padding: 12px; border-radius: 8px; margin-bottom: 16px; border-left: 4px solid var(--primary-blue); font-size: 0.82rem;">
          <strong><i class="fas fa-info-circle"></i> Alur otomatis:</strong>
          File diupload ke Storage (folder <code>pak-integrasi/</code>) &rarr; link dokumen otomatis masuk ke kolom
          <code>pak_integrasi_terbit</code> pada tabel <code>pengajuan_pak</code> (sesuai NIP) &rarr;
          langsung tampil &amp; dapat diunduh di menu publik <strong>Cek PAK Terbit</strong>.
        </div>

        ${pegawaiSelectHTML}

        <!-- Info status pengajuan pegawai terpilih -->
        <div id="pakUploadStatusInfo" style="margin-bottom: 16px;"></div>

        <!-- Checkbox set status Terbit -->
        <div class="form-group" style="margin-bottom: 16px;">
          <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer; font-size: 0.85rem;">
            <input type="checkbox" id="pakUploadSetStatus" checked style="margin-top: 3px;">
            <span>Set status pengajuan menjadi <strong>"Terbit"</strong> sekaligus (disarankan)</span>
          </label>
        </div>

        <!-- Upload area -->
        <div class="file-upload-item" style="margin-bottom: 16px;">
          <label class="file-upload-label">Dokumen PAK Integrasi Terbit <span class="required">*</span></label>
          <div class="file-upload-wrapper">
            <div class="file-upload-area" id="pakUploadArea"
                 ondrop="handlePakUploadDrop(event)"
                 ondragover="handlePakUploadDragOver(event)"
                 ondragleave="handlePakUploadDragLeave(event)"
                 onclick="document.getElementById('pakUploadFileInput').click()">
              <i class="fas fa-file-upload"></i>
              <p>Klik atau drag &amp; drop dokumen di sini</p>
              <span>Format: PDF, DOC, DOCX, JPG, PNG | Maksimal: 10MB</span>
            </div>
            <input type="file" id="pakUploadFileInput" style="display: none;"
                   accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                   onchange="handlePakUploadFileSelect(this)">
            <div id="pakUploadFileInfo" style="display: none; margin-top: 10px; padding: 10px 14px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; font-size: 0.85rem; align-items: center; justify-content: space-between; gap: 8px;">
              <span id="pakUploadFileName"></span>
              <button type="button" class="btn btn-danger btn-sm btn-icon" onclick="clearPakUploadFile(event)" title="Hapus file terpilih">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>

      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" id="pakUploadSubmitBtn" onclick="uploadPakIntegrasiTerbitFile()" disabled style="background: #16a34a;">
          <i class="fas fa-cloud-upload-alt"></i> Upload &amp; Terbitkan
        </button>
        <button class="btn btn-warning" onclick="closePakUploadModal()">
          <i class="fas fa-times"></i> Batal
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closePakUploadModal();
  });

  // Muat info status pengajuan untuk target awal
  await refreshPakUploadStatusInfo();
}

function closePakUploadModal() {
  const modal = document.getElementById('pakUploadModal');
  if (modal) modal.remove();
  pakUploadFile = null;
  pakUploadLockedNip = null;
}

/**
 * Ambil NIP target saat ini (locked atau dari dropdown)
 */
function getPakUploadTargetNip() {
  if (pakUploadLockedNip) return pakUploadLockedNip;
  const select = document.getElementById('pakUploadNipSelect');
  return select ? select.value : '';
}

/**
 * Tampilkan info status pengajuan pegawai terpilih
 * (apakah NIP ada di pengajuan_pak, status, dan dokumen terbit saat ini)
 */
async function refreshPakUploadStatusInfo() {
  const infoEl = document.getElementById('pakUploadStatusInfo');
  const submitBtn = document.getElementById('pakUploadSubmitBtn');
  if (!infoEl) return;

  const nip = getPakUploadTargetNip();
  if (!nip) {
    infoEl.innerHTML =
      '<div style="padding: 12px; background: #fffbeb; border-left: 4px solid var(--warning); border-radius: 8px; font-size: 0.82rem;">' +
      '<i class="fas fa-exclamation-circle"></i> Pilih pegawai terlebih dahulu untuk memeriksa data pengajuan.</div>';
    if (submitBtn) submitBtn.disabled = true;
    return;
  }

  infoEl.innerHTML = '<div style="text-align: center; padding: 12px;"><span class="loading-spinner"></span> Memeriksa data pengajuan (NIP ' + escapeHtml(String(nip)) + ')...</div>';

  try {
    const pengajuan = await fetchByNIP(String(nip));

    if (!pengajuan) {
      infoEl.innerHTML =
        '<div style="padding: 12px; background: #fef2f2; border-left: 4px solid var(--danger); border-radius: 8px; font-size: 0.82rem;">' +
        '<strong style="color: var(--danger);"><i class="fas fa-times-circle"></i> NIP tidak ditemukan di tabel pengajuan_pak.</strong><br>' +
        'Dokumen tidak dapat dipasangkan. Pastikan pegawai sudah mengajukan via Formulir Pengajuan ' +
        'atau tambahkan datanya di tabel pengajuan_pak terlebih dahulu.</div>';
      if (submitBtn) submitBtn.disabled = true;
      return;
    }

    const currentUrl = pengajuan['PAK_Integrasi_Terbit'] || '';
    const status = pengajuan.Status || 'Menunggu';

    infoEl.innerHTML =
      '<div style="padding: 12px; background: #f0fdf4; border-left: 4px solid var(--success); border-radius: 8px; font-size: 0.82rem;">' +
      '<strong style="color: var(--success);"><i class="fas fa-check-circle"></i> Data pengajuan ditemukan.</strong><br>' +
      'Nama: <strong>' + escapeHtml(pengajuan['Nama Lengkap dengan Gelar'] || '-') + '</strong><br>' +
      'Status saat ini: ' + getStatusBadge(status) + '<br>' +
      (currentUrl
        ? 'Dokumen terbit saat ini: <a href="' + escapeHtml(currentUrl) + '" target="_blank" style="color: var(--primary-blue); word-break: break-all;">' + escapeHtml(extractFileName(currentUrl)) + '</a> <em>(akan diganti jika upload baru)</em>'
        : 'Belum ada dokumen PAK Integrasi terbit.') +
      '</div>';
    if (submitBtn) submitBtn.disabled = !pakUploadFile;
  } catch (error) {
    console.error('[Pembuatan PAK] Gagal cek status pengajuan:', error);
    infoEl.innerHTML =
      '<div style="padding: 12px; background: #fef2f2; border-left: 4px solid var(--danger); border-radius: 8px; font-size: 0.82rem;">' +
      '<strong style="color: var(--danger);">Gagal memeriksa data pengajuan:</strong> ' + escapeHtml(error.message || '') + '</div>';
    if (submitBtn) submitBtn.disabled = true;
  }
}

/**
 * Handler pilih file (input + drag&drop)
 */
function handlePakUploadFileSelect(input) {
  const file = input && input.files ? input.files[0] : null;
  if (!file) return;
  setPakUploadFile(file);
}

function setPakUploadFile(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();

  if (!PAK_UPLOAD_EXT.includes(ext)) {
    toastError('Format file tidak didukung. Gunakan PDF, DOC, DOCX, JPG, atau PNG.');
    return;
  }

  if (file.size > PAK_UPLOAD_MAX_SIZE) {
    toastError('Ukuran file maksimal 10MB (terbaca: ' + formatFileSize(file.size) + ')');
    return;
  }

  pakUploadFile = file;

  const area = document.getElementById('pakUploadArea');
  const info = document.getElementById('pakUploadFileInfo');
  const name = document.getElementById('pakUploadFileName');
  const submitBtn = document.getElementById('pakUploadSubmitBtn');

  if (area) area.classList.add('has-file');
  if (info) info.style.display = 'flex';
  if (name) name.innerHTML = '<i class="fas fa-file-alt"></i> <strong>' + escapeHtml(file.name) + '</strong> (' + formatFileSize(file.size) + ')';
  if (submitBtn) submitBtn.disabled = false;

  toastInfo('File siap diupload: ' + file.name);
}

function clearPakUploadFile(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  pakUploadFile = null;

  const input = document.getElementById('pakUploadFileInput');
  if (input) input.value = '';

  const area = document.getElementById('pakUploadArea');
  const info = document.getElementById('pakUploadFileInfo');
  const submitBtn = document.getElementById('pakUploadSubmitBtn');

  if (area) area.classList.remove('has-file');
  if (info) info.style.display = 'none';
  if (submitBtn) submitBtn.disabled = !getPakUploadTargetNip();
}

function handlePakUploadDragOver(event) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.add('drag-over');
}

function handlePakUploadDragLeave(event) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.remove('drag-over');
}

function handlePakUploadDrop(event) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.remove('drag-over');
  const files = event.dataTransfer && event.dataTransfer.files;
  if (files && files.length > 0) {
    setPakUploadFile(files[0]);
  }
}

/**
 * Proses utama: upload file + update kolom pak_integrasi_terbit by NIP
 */
async function uploadPakIntegrasiTerbitFile() {
  const nip = getPakUploadTargetNip();

  if (!nip) {
    toastError('Pilih pegawai terlebih dahulu!');
    return;
  }

  if (!pakUploadFile) {
    toastError('Pilih dokumen yang akan diupload!');
    return;
  }

  const setStatus = document.getElementById('pakUploadSetStatus')?.checked || false;

  const btn = document.getElementById('pakUploadSubmitBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Mengupload...';
  }

  try {
    // 1. Pastikan NIP ada di pengajuan_pak
    const pengajuan = await fetchByNIP(String(nip));
    if (!pengajuan) {
      throw new Error('NIP ' + nip + ' tidak ditemukan di tabel pengajuan_pak. Dokumen tidak dapat dipasangkan.');
    }

    // 2. Upload file ke Storage (folder pak_integrasi)
    toastInfo('Mengupload dokumen ke Storage...');
    const url = await uploadDocument(pakUploadFile, 'pak_integrasi', nip);

    // 3. Update kolom pak_integrasi_terbit by NIP (otomatis)
    toastInfo('Memasangkan dokumen ke data pengajuan (NIP ' + nip + ')...');
    const result = await updatePakIntegrasiTerbitByNip(String(nip), url, setStatus);

    if (result.updated === 0) {
      toastWarning('Dokumen terupload ke Storage, tetapi tidak ada baris pengajuan_pak yang cocok untuk NIP ' + nip + '. URL: ' + url);
    } else {
      toastSuccess(
        'Dokumen PAK Integrasi berhasil diterbitkan!' +
        (setStatus ? ' Status pengajuan diubah menjadi "Terbit".' : '')
      );
    }

    // 4. Refresh tabel status terbit jika sudah dimuat
    closePakUploadModal();
    const statusWrap = document.getElementById('pakTerbitStatusWrap');
    if (statusWrap && statusWrap.dataset.loaded === '1') {
      await loadPakTerbitStatus();
    }
  } catch (error) {
    console.error('[Pembuatan PAK] Upload error:', error);
    toastError('Gagal upload: ' + (error.message || ''));
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload &amp; Terbitkan';
    }
  }
}

/* ============================================
 * MONITORING: STATUS DOKUMEN PAK INTEGRASI TERBIT
 * ============================================ */

let pakTerbitStatusRows = [];
let pakTerbitStatusSearch = '';

/**
 * Muat & render tabel status dokumen terbit (dari pengajuan_pak)
 */
async function loadPakTerbitStatus() {
  const wrap = document.getElementById('pakTerbitStatusWrap');
  if (!wrap) return;

  if (!isSupabaseReady()) {
    wrap.innerHTML = '<p style="text-align:center; color: var(--danger); padding: 24px;">Supabase belum dikonfigurasi.</p>';
    return;
  }

  wrap.innerHTML = '<p style="text-align: center; padding: 24px;"><span class="loading-spinner"></span> Memuat status dokumen terbit...</p>';

  try {
    pakTerbitStatusRows = await fetchPengajuanTerbitStatus();
    renderPakTerbitStatusTable();
    wrap.dataset.loaded = '1';
  } catch (error) {
    console.error('[Pembuatan PAK] Gagal memuat status terbit:', error);
    wrap.innerHTML =
      '<p style="text-align:center; color: var(--danger); padding: 24px;">' +
      '<i class="fas fa-exclamation-triangle" style="font-size: 28px; margin-bottom: 8px;"></i><br>' +
      'Gagal memuat: ' + escapeHtml(error.message || '') + '</p>';
  }
}

function filterPakTerbitStatus() {
  const input = document.getElementById('pakTerbitStatusSearch');
  pakTerbitStatusSearch = input ? input.value.toLowerCase() : '';
  renderPakTerbitStatusTable();
}

/**
 * Render tabel monitoring status terbit
 */
function renderPakTerbitStatusTable() {
  const wrap = document.getElementById('pakTerbitStatusWrap');
  if (!wrap) return;

  const rows = pakTerbitStatusRows.filter((r) => {
    if (!pakTerbitStatusSearch) return true;
    const nama = String(r.nama || '').toLowerCase();
    const nip = String(r.nip || '').toLowerCase();
    return nama.includes(pakTerbitStatusSearch) || nip.includes(pakTerbitStatusSearch);
  });

  const totalDoc = pakTerbitStatusRows.filter((r) => r.pak_integrasi_terbit).length;

  const rowsHTML = rows.length === 0
    ? '<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--text-light);">Tidak ada data.</td></tr>'
    : rows
        .map((r, i) => {
          const url = r.pak_integrasi_terbit || '';
          const encUrl = encodeURIComponent(url);
          return `
            <tr style="border-bottom: 1px solid var(--border-color);">
              <td style="padding: 8px;">${i + 1}</td>
              <td style="padding: 8px;"><strong>${escapeHtml(r.nama || '-')}</strong></td>
              <td style="padding: 8px;">${escapeHtml(r.nip || '-')}</td>
              <td style="padding: 8px;">${escapeHtml(r.satuan_kerja || '-')}</td>
              <td style="padding: 8px;">${getStatusBadge(r.status || 'Menunggu')}</td>
              <td style="padding: 8px;">
                ${url
                  ? '<span style="color: var(--success); font-size: 0.78rem;"><i class="fas fa-check-circle"></i> ' + escapeHtml(extractFileName(url)) + '</span>'
                  : '<span style="color: var(--text-light); font-size: 0.78rem;"><i class="fas fa-minus-circle"></i> Belum ada</span>'}
              </td>
              <td style="padding: 8px;">
                <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                  ${url ? `
                    <button class="btn btn-primary btn-sm btn-icon" onclick="previewPAKIntegrasiDoc('${encUrl}')" title="Preview dokumen">
                      <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-success btn-sm btn-icon" onclick="downloadPAKIntegrasiDoc('${encUrl}')" title="Download dokumen">
                      <i class="fas fa-download"></i>
                    </button>
                    <button class="btn btn-danger btn-sm btn-icon" onclick="hapusDokumenTerbit('${escapeHtml(String(r.nip || ''))}', '${escapeHtml(String(r.nama || ''))}')" title="Hapus dokumen terbit">
                      <i class="fas fa-trash"></i>
                    </button>
                  ` : `
                    <button class="btn btn-primary btn-sm btn-icon" style="background: #16a34a;" onclick="openPakUploadModal('${escapeHtml(String(r.nip || ''))}', '${escapeHtml(String(r.nama || ''))}')" title="Upload dokumen terbit untuk NIP ini">
                      <i class="fas fa-cloud-upload-alt"></i>
                    </button>
                  `}
                </div>
              </td>
            </tr>
          `;
        })
        .join('');

  wrap.innerHTML = `
    <div style="padding: 12px 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
      <div style="font-size: 0.82rem; color: var(--text-medium);">
        <i class="fas fa-database"></i> Total pengajuan: <strong>${pakTerbitStatusRows.length}</strong>
        &bull; Dokumen terbit: <strong style="color: var(--success);">${totalDoc}</strong>
        &bull; Belum terbit: <strong style="color: var(--warning);">${pakTerbitStatusRows.length - totalDoc}</strong>
      </div>
      <div class="search-wrapper" style="max-width: 280px;">
        <i class="fas fa-search"></i>
        <input type="text" class="search-input" id="pakTerbitStatusSearch" placeholder="Cari nama atau NIP..." value="${escapeHtml(pakTerbitStatusSearch)}" oninput="filterPakTerbitStatus()">
      </div>
    </div>
    <div style="overflow-x: auto;">
      <table style="min-width: 100%;">
        <thead>
          <tr>
            <th style="padding: 10px 8px;">No</th>
            <th style="padding: 10px 8px;">Nama</th>
            <th style="padding: 10px 8px;">NIP</th>
            <th style="padding: 10px 8px;">Satuan Kerja</th>
            <th style="padding: 10px 8px;">Status</th>
            <th style="padding: 10px 8px;">Dokumen Terbit</th>
            <th style="padding: 10px 8px;">Aksi</th>
          </tr>
        </thead>
        <tbody>${rowsHTML}</tbody>
      </table>
    </div>
  `;
}

/**
 * Hapus dokumen PAK Integrasi terbit (kosongkan kolom pak_integrasi_terbit)
 */
async function hapusDokumenTerbit(nip, nama) {
  if (!nip) return;

  const confirmed = await confirmDialog(
    'Hapus dokumen PAK Integrasi terbit untuk:\n' +
    nama + ' (NIP ' + nip + ')?\n\n' +
    'Kolom pak_integrasi_terbit akan dikosongkan (dokumen di Storage tidak ikut terhapus).'
  );
  if (!confirmed) return;

  try {
    await updatePakIntegrasiTerbitByNip(String(nip), null, false);
    toastSuccess('Dokumen terbit berhasil dihapus dari data pengajuan.');
    await loadPakTerbitStatus();
  } catch (error) {
    console.error('[Pembuatan PAK] Gagal hapus dokumen terbit:', error);
    toastError('Gagal menghapus: ' + (error.message || ''));
  }
}
