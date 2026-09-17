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
 * Helper: Kop Surat (pakai image asli)
 * Image: assets/kop-surat.png (841x169 px, aspect ratio ~5:1)
 */
/**
 * Helper: Kop Surat (text-based, sesuai referensi PDF)
 */
function getKopSurat(instansi) {
  return `
    <div class="kop-surat">
      <div class="kop-logo-text">
        <div class="kop-logo-box">⚖</div>
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
  return `
    <tr><td class="section-header" colspan="5">I. KETERANGAN PERORANGAN</td></tr>
    <tr><td class="col-no">1</td><td class="col-label">NAMA</td><td class="col-value" colspan="3">: ${safe(row['Nama Lengkap dengan Gelar'])}</td></tr>
    <tr><td class="col-no">2</td><td class="col-label">NIP/NRK</td><td class="col-value" colspan="3">: ${safe(row['NIP'])}</td></tr>
    <tr><td class="col-no">3</td><td class="col-label">NOMOR SERI KARPEG</td><td class="col-value" colspan="3">: ${safe(row['No Karpeg'])}</td></tr>
    <tr><td class="col-no">4</td><td class="col-label">PANGKAT/GOLONGAN RUANG/TMT</td><td class="col-value" colspan="3">: ${safe(row['Pangkat/Gol'])} ${row['TMT Pangkat'] ? '/ ' + escapeHtml(row['TMT Pangkat']) : ''}</td></tr>
    <tr><td class="col-no">5</td><td class="col-label">TEMPAT/TANGGAL LAHIR</td><td class="col-value" colspan="3">: ${safe(row['Tempat & Tanggal Lahir'])}</td></tr>
    <tr><td class="col-no">6</td><td class="col-label">JENIS KELAMIN</td><td class="col-value" colspan="3">: ${safe(row['Jenis Kelamin'])}</td></tr>
    <tr><td class="col-no">7</td><td class="col-label">PENDIDIKAN</td><td class="col-value" colspan="3">: ${safe(row.Pendidikan)}</td></tr>
    <tr><td class="col-no">8</td><td class="col-label">JABATAN/TMT</td><td class="col-value" colspan="3">: ${safe(row['Jenis JF'])} ${row['TMT JF'] ? '/ ' + escapeHtml(row['TMT JF']) : ''}</td></tr>
    <tr><td class="col-no">9</td><td class="col-label">MASA KERJA GOLONGAN</td><td class="col-value" colspan="3">: ${safe(row['Masa Kerja Gol'])}</td></tr>
    <tr><td class="col-no">10</td><td class="col-label">UNIT KERJA</td><td class="col-value" colspan="3">: ${safe(row['Satuan Kerja'])}</td></tr>
  `;
}

/**
 * Helper: Tanda tangan pejabat
 */
function getTtdBlock(row) {
  const safe = (v) => escapeHtml(v || '');
  return `
    <div class="ttd-block">
      <p>Ditetapkan di : ${safe(row.lokasiPenetapan || 'Tenggarong')}</p>
      <p>Tanggal : ${escapeHtml(row.tanggalPenetapan || formatDate(new Date().toISOString()))}</p>
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
