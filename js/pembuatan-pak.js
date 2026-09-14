/* ============================================
 * PAKTI - Pembuatan PAK Integrasi
 * ============================================
 * Fitur: Pilih data pengajuan → generate PDF
 *        PAK Integrasi siap printout
 *
 * PDF dibuat via browser print (window.print)
 * dengan stylesheet print khusus (css/print-pak.css)
 * ============================================ */

let currentPAKData = null;

/**
 * Load halaman Pembuatan PAK Integrasi
 */
function loadPembuatanPAKData() {
  const select = document.getElementById('pakSelectNIP');
  if (!select) return;

  // Populate dropdown dengan semua data pengajuan
  const sortedData = [...allData].sort((a, b) => {
    const namaA = (a['Nama Lengkap dengan Gelar'] || '').toLowerCase();
    const namaB = (b['Nama Lengkap dengan Gelar'] || '').toLowerCase();
    return namaA.localeCompare(namaB);
  });

  select.innerHTML =
    '<option value="">-- Pilih NIP / Nama Pegawai --</option>' +
    sortedData
      .map((row) => {
        const label = `${row['NIP'] || '-'} - ${row['Nama Lengkap dengan Gelar'] || '-'} (${row['Satuan Kerja'] || '-'})`;
        return `<option value="${escapeHtml(String(row._id || ''))}">${escapeHtml(label)}</option>`;
      })
      .join('');

  // Reset preview
  const preview = document.getElementById('pakPreview');
  if (preview) preview.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 40px;"><i class="fas fa-file-alt" style="font-size: 48px; margin-bottom: 12px;"></i><br>Pilih pegawai untuk generate PAK Integrasi</p>';
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

  const row = allData.find((r) => String(r._id) === String(select.value));
  if (!row) {
    toastError('Data tidak ditemukan!');
    return;
  }

  currentPAKData = row;

  // Ambil nilai input angka kredit (jika diisi)
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

  // Status PAK (Terbit / Belum)
  const isTerbit = row['Status'] === 'Terbit';

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
      isTerbit,
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
  // supaya tidak terkena CSS admin panel yang menyembunyikan elemen
  const printWrapper = document.createElement('div');
  printWrapper.id = 'pakPrintWrapper';
  printWrapper.className = 'pak-print-wrapper';
  printWrapper.innerHTML = printArea.innerHTML;

  // Hapus wrapper lama jika ada
  const oldWrapper = document.getElementById('pakPrintWrapper');
  if (oldWrapper) oldWrapper.remove();

  document.body.appendChild(printWrapper);
  document.body.classList.add('printing-pak');

  // Tunggu render, lalu print
  setTimeout(() => {
    window.print();

    // Cleanup setelah print dialog selesai
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
  if (preview) preview.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 40px;"><i class="fas fa-file-alt" style="font-size: 48px; margin-bottom: 12px;"></i><br>Pilih pegawai untuk generate PAK Integrasi</p>';

  const printBtn = document.getElementById('pakPrintBtn');
  if (printBtn) printBtn.style.display = 'none';

  currentPAKData = null;
  toastInfo('Form direset');
}

/**
 * Printout seluruh data admin (print halaman)
 */
function printoutAdminData() {
  // Print halaman dengan filter print css
  document.body.classList.add('printing-admin');
  setTimeout(() => {
    window.print();
    document.body.classList.remove('printing-admin');
  }, 300);
}
