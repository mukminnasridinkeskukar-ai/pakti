/* ============================================
 * PAKTI - Bulk Upload CSV Module
 * ============================================
 * Fitur: Upload massal data pengajuan via CSV
 *
 * Format CSV (lihat templates/template_upload_massal.csv):
 *   email,no_hp,nama,nip,no_karpeg,tempat_lahir,tanggal_lahir,
 *   pendidikan,jenis_kelamin,pangkat_gol,tmt_pangkat,
 *   jenis_jf,jenjang_jf,tmt_jf,masa_kerja_gol,satuan_kerja,
 *   status,catatan_admin
 *
 * HANYA 3 field yang wajib (sesuai schema.sql tabel pengajuan_pak):
 *   - email (TEXT NOT NULL)
 *   - nama  (TEXT NOT NULL)
 *   - nip   (TEXT UNIQUE NOT NULL, 18 digit angka)
 *
 * Field lain opsional (akan diisi default/empty oleh database)
 * ============================================ */

// Konfigurasi kolom CSV yang wajib & opsional (SESUAI SCHEMA)
const CSV_REQUIRED_FIELDS = [
  'email',
  'nama',
  'nip',
];

const CSV_OPTIONAL_FIELDS = [
  'no_hp',
  'no_karpeg',
  'tempat_lahir',
  'tanggal_lahir',
  'pendidikan',
  'jenis_kelamin',
  'pangkat_gol',
  'tmt_pangkat',
  'jenis_jf',
  'jenjang_jf',
  'tmt_jf',
  'masa_kerja_gol',
  'satuan_kerja',
  'status',
  'catatan_admin',
];

const CSV_ALL_FIELDS = [...CSV_REQUIRED_FIELDS, ...CSV_OPTIONAL_FIELDS];

// State untuk preview & tracking
let csvParsedRows = [];
let csvUploadInProgress = false;

/**
 * Buka modal upload massal CSV
 */
function openBulkUploadModal() {
  let modal = document.getElementById('bulkUploadModal');
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'bulkUploadModal';
  modal.className = 'modal-overlay active';
  modal.style.cssText = 'display: flex;';

  modal.innerHTML = `
    <div class="modal" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
      <div class="modal-header">
        <h3 class="modal-title"><i class="fas fa-file-csv"></i> Upload Massal CSV</h3>
        <button class="modal-close" onclick="closeBulkUploadModal()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">

        <!-- Section: Download Template -->
        <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid var(--primary-blue);">
          <h4 style="color: var(--government-blue); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-download"></i> Download Template CSV
          </h4>
          <p style="color: var(--text-medium); font-size: 0.85rem; margin-bottom: 12px;">
            Unduh template CSV, isi data sesuai format, lalu upload kembali.
          </p>
          <button class="btn btn-primary btn-sm" onclick="downloadCsvTemplate()">
            <i class="fas fa-file-download"></i> Download Template
          </button>
        </div>

        <!-- Info Format -->
        <div style="background: #fffbeb; padding: 12px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid var(--warning); font-size: 0.82rem;">
          <strong><i class="fas fa-info-circle"></i> Field Wajib (3):</strong> email, nama, nip (18 digit)
          <br><strong>Field Opsional (15):</strong> no_hp, no_karpeg, tempat_lahir, tanggal_lahir (YYYY-MM-DD), pendidikan, jenis_kelamin, pangkat_gol, tmt_pangkat (YYYY-MM-DD), jenis_jf, jenjang_jf, tmt_jf (YYYY-MM-DD), masa_kerja_gol, satuan_kerja, status, catatan_admin
          <br><strong style="color: var(--danger);">Penting:</strong> Jika nilai mengandung koma (contoh: "Ns. Mukmin, S.Kep"), harus diapit tanda kutip ganda ("...").
        </div>

        <!-- Section: Upload File -->
        <div class="file-upload-item" style="margin-bottom: 20px;">
          <label class="file-upload-label">Upload File CSV</label>
          <div class="file-upload-wrapper">
            <div class="file-upload-area" id="bulkUploadArea"
                 ondrop="handleCsvDrop(event)"
                 ondragover="handleCsvDragOver(event)"
                 ondragleave="handleCsvDragLeave(event)"
                 onclick="document.getElementById('bulkCsvInput').click()">
              <i class="fas fa-file-csv"></i>
              <p>Klik atau drag file CSV di sini</p>
              <span>Format: .csv | Maksimal: 5MB</span>
            </div>
            <input type="file" id="bulkCsvInput" accept=".csv,text/csv" style="display: none;"
                   onchange="handleCsvFileSelect(this)">
            <div class="file-name" id="bulkCsvFileName" style="display: none;"></div>
          </div>
        </div>

        <!-- Section: Preview Data -->
        <div id="csvPreviewSection" style="display: none; margin-bottom: 20px;">
          <h4 style="color: var(--text-dark); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
            <span><i class="fas fa-table"></i> Preview Data</span>
            <span id="csvPreviewCount" style="font-size: 0.85rem; color: var(--text-medium); font-weight: normal;"></span>
          </h4>

          <div id="csvValidationSummary" style="margin-bottom: 12px;"></div>

          <div style="max-height: 300px; overflow: auto; border: 1px solid var(--border-color); border-radius: 8px;">
            <table style="min-width: 100%; font-size: 0.78rem;">
              <thead id="csvPreviewHead"></thead>
              <tbody id="csvPreviewBody"></tbody>
            </table>
          </div>
        </div>

        <!-- Section: Progress Upload -->
        <div id="csvUploadProgress" style="display: none; margin-bottom: 20px;">
          <h4 style="color: var(--text-dark); margin-bottom: 12px;">
            <i class="fas fa-spinner fa-spin"></i> Sedang mengupload...
          </h4>
          <div style="background: var(--light-bg); border-radius: 8px; padding: 12px; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.85rem;">
              <span id="csvProgressText">Memproses...</span>
              <span id="csvProgressPercent">0%</span>
            </div>
            <div style="width: 100%; height: 8px; background: var(--border-color); border-radius: 4px; overflow: hidden;">
              <div id="csvProgressBar" style="height: 100%; background: var(--primary-blue); width: 0%; transition: width 0.3s;"></div>
            </div>
          </div>
          <div id="csvUploadResults" style="font-size: 0.85rem;"></div>
        </div>

      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" id="csvProcessBtn" onclick="processBulkUpload()" disabled>
          <i class="fas fa-upload"></i> Upload ke Database
        </button>
        <button class="btn btn-warning" onclick="closeBulkUploadModal()">
          <i class="fas fa-times"></i> Tutup
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeBulkUploadModal();
  });

  csvParsedRows = [];
}

function closeBulkUploadModal() {
  const modal = document.getElementById('bulkUploadModal');
  if (modal) modal.remove();
  csvParsedRows = [];
}

/**
 * Escape nilai untuk CSV (handle koma, kutip, newline)
 */
function escapeCsvValue(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  // Jika mengandung koma, kutip ganda, atau newline → apit dengan double quotes
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    // Escape double quote dengan menambah double quote (RFC 4180)
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * Download template CSV
 * Template sesuai schema.sql tabel pengajuan_pak
 */
function downloadCsvTemplate() {
  const headers = CSV_ALL_FIELDS.join(',');

  // Sample data - SEMUA nilai yang mengandung koma HARUS di-quote
  const sampleRows = [
    [
      'contoh1@dinkes.go.id',
      '081234567890',
      'Ns. Mukmin Nasri, S.Kep',  // ← ada koma, akan di-quote
      '197001012020011001',
      'PEP-2024-001',
      'Tenggarong',
      '1970-01-01',
      'S1',
      'Laki-laki',
      'Penata Muda - III/a Ahli Pertama',
      '2020-01-01',
      'Perawat',
      'Pertama',
      '2020-07-01',
      '05 Tahun 03 Bulan',
      'UPTD Puskesmas Samboja',
      'Menunggu',
      ''
    ],
    [
      'contoh2@dinkes.go.id',
      '081234567891',
      'dr. Budi Santoso, Sp.A',  // ← ada koma, akan di-quote
      '198005122010012002',
      'PEP-2024-002',
      'Samarinda',
      '1980-05-12',
      'Spesialis',
      'Laki-laki',
      'Penata - III/c Ahli Muda',
      '2018-01-01',
      'Dokter',
      'Muda',
      '2018-07-01',
      '07 Tahun 02 Bulan',
      'RSUD Aji Muhammad Parikesit',
      'Terbit',
      'SK PAK diterbitkan'
    ],
  ];

  let csv = headers + '\n';
  sampleRows.forEach((row) => {
    csv += row.map(escapeCsvValue).join(',') + '\n';
  });

  // BOM untuk Excel supaya UTF-8 terbaca benar
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'template_upload_massal_pakti.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  toastSuccess('Template CSV berhasil diunduh!');
}

/**
 * Handle CSV file select
 */
function handleCsvFileSelect(input) {
  const file = input.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    toastError('Ukuran file maksimal 5MB!');
    return;
  }

  if (!file.name.toLowerCase().endsWith('.csv')) {
    toastError('File harus berekstensi .csv');
    return;
  }

  const fileNameEl = document.getElementById('bulkCsvFileName');
  const uploadAreaEl = document.getElementById('bulkUploadArea');

  if (fileNameEl) {
    fileNameEl.textContent = '✓ ' + file.name + ' (' + formatFileSize(file.size) + ')';
    fileNameEl.style.display = 'block';
  }
  if (uploadAreaEl) uploadAreaEl.classList.add('has-file');

  const reader = new FileReader();
  reader.onload = function (e) {
    parseCsvContent(e.target.result);
  };
  reader.onerror = function () {
    toastError('Gagal membaca file CSV');
  };
  reader.readAsText(file, 'UTF-8');
}

function handleCsvDragOver(event) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.add('drag-over');
}

function handleCsvDragLeave(event) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.remove('drag-over');
}

function handleCsvDrop(event) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.remove('drag-over');
  const files = event.dataTransfer.files;
  if (files.length > 0) {
    document.getElementById('bulkCsvInput').files = files;
    handleCsvFileSelect({ files: files });
  }
}

/**
 * Parse CSV content ke array of objects
 * Support: quoted values (RFC 4180), escaped quotes, newlines in quotes
 */
function parseCsvContent(text) {
  csvParsedRows = [];

  if (!text || text.trim() === '') {
    toastError('CSV kosong');
    return;
  }

  // Hapus BOM kalau ada
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  // Parse baris dengan parser RFC 4180 (handle quoted values dengan koma & newline)
  const rows = parseCsvRFC4180(text);

  if (rows.length < 2) {
    toastError('CSV hanya berisi header, tidak ada data');
    return;
  }

  // Parse header
  const headers = rows[0].map((h) => (h || '').trim().toLowerCase());

  // Validasi: pastikan minimal 3 field wajib ada
  const missingHeaders = CSV_REQUIRED_FIELDS.filter((f) => !headers.includes(f));
  if (missingHeaders.length > 0) {
    toastError('Header CSV tidak lengkap. Kolom wajib: ' + missingHeaders.join(', '));
    return;
  }

  // Parse rows
  let validCount = 0;
  let invalidCount = 0;

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];

    // Skip baris kosong
    if (!values || values.every((v) => !v || v.trim() === '')) {
      continue;
    }

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] || '').trim();
    });

    const errors = validateCsvRow(row, i + 1);
    row._errors = errors;
    row._rowNum = i + 1;

    if (errors.length === 0) {
      validCount++;
    } else {
      invalidCount++;
    }

    csvParsedRows.push(row);
  }

  if (csvParsedRows.length === 0) {
    toastError('Tidak ada baris data yang terbaca');
    return;
  }

  renderCsvPreview(headers, validCount, invalidCount);

  const btn = document.getElementById('csvProcessBtn');
  if (btn) {
    btn.disabled = validCount === 0;
    btn.innerHTML = '<i class="fas fa-upload"></i> Upload ' + validCount + ' Data ke Database';
  }

  toastInfo('Parsed: ' + validCount + ' valid, ' + invalidCount + ' invalid dari ' + csvParsedRows.length + ' baris');
}

/**
 * Parser CSV RFC 4180 yang benar
 * Handle:
 * - Nilai dengan koma di dalam tanda kutip: "Ns. Mukmin, S.Kep"
 * - Nilai dengan tanda kutip ganda di dalam: "nama ""quoted"""
 * - Newline di dalam tanda kutip
 */
function parseCsvRFC4180(text) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote "" → "
          currentField += '"';
          i += 2;
        } else {
          // End quote
          inQuotes = false;
          i++;
        }
      } else {
        currentField += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
        i++;
      } else if (char === '\r' && nextChar === '\n') {
        // CRLF
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i += 2;
      } else if (char === '\n') {
        // LF
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
      } else if (char === '\r') {
        // CR (old Mac)
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
      } else {
        currentField += char;
        i++;
      }
    }
  }

  // Last field/row
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Validasi satu baris CSV - SESUAI SCHEMA pengajuan_pak
 * Hanya 3 field wajib: email, nama, nip
 */
function validateCsvRow(row, rowNum) {
  const errors = [];

  // === FIELD WAJIB (sesuai NOT NULL di schema.sql) ===
  // email - wajib, format email valid
  if (!row.email) {
    errors.push('email wajib diisi');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    errors.push('format email tidak valid: ' + row.email);
  }

  // nama - wajib
  if (!row.nama) {
    errors.push('nama wajib diisi');
  }

  // nip - wajib, 18 digit angka (UNIQUE)
  if (!row.nip) {
    errors.push('nip wajib diisi');
  } else if (!/^\d{18}$/.test(row.nip)) {
    errors.push('nip harus 18 digit angka (terbaca: "' + row.nip + '")');
  }

  // === FIELD OPSIONAL - validasi format jika diisi ===
  // tanggal_lahir, tmt_pangkat, tmt_jf - format YYYY-MM-DD
  for (const dateField of ['tanggal_lahir', 'tmt_pangkat', 'tmt_jf']) {
    if (row[dateField] && !/^\d{4}-\d{2}-\d{2}$/.test(row[dateField])) {
      errors.push(dateField + ' harus format YYYY-MM-DD (terbaca: "' + row[dateField] + '")');
    }
  }

  // jenis_kelamin - jika diisi, harus Laki-laki/Perempuan
  if (row.jenis_kelamin && !['Laki-laki', 'Perempuan'].includes(row.jenis_kelamin)) {
    errors.push('jenis_kelamin harus "Laki-laki" atau "Perempuan" (terbaca: "' + row.jenis_kelamin + '")');
  }

  // status - jika diisi, harus salah satu dari CHECK constraint
  if (
    row.status &&
    !['', 'Menunggu', 'Perbaikan', 'Ditolak', 'Terbit'].includes(row.status)
  ) {
    errors.push('status harus salah satu: Menunggu/Perbaikan/Ditolak/Terbit (terbaca: "' + row.status + '")');
  }

  return errors;
}

/**
 * Render preview CSV
 */
function renderCsvPreview(headers, validCount, invalidCount) {
  const section = document.getElementById('csvPreviewSection');
  const summary = document.getElementById('csvValidationSummary');
  const head = document.getElementById('csvPreviewHead');
  const body = document.getElementById('csvPreviewBody');
  const countEl = document.getElementById('csvPreviewCount');

  if (section) section.style.display = 'block';

  if (countEl) {
    countEl.textContent =
      csvParsedRows.length + ' baris | ' + validCount + ' valid | ' + invalidCount + ' error';
  }

  if (summary) {
    summary.innerHTML =
      '<div style="display: flex; gap: 10px; flex-wrap: wrap; padding: 12px; background: ' +
      (invalidCount > 0 ? '#fef3c7' : '#d1fae5') +
      '; border-radius: 8px; font-size: 0.85rem;">' +
      '<span style="color: #065f46;"><i class="fas fa-check-circle"></i> Valid: <strong>' +
      validCount +
      '</strong></span>' +
      '<span style="color: #92400e;"><i class="fas fa-exclamation-triangle"></i> Invalid: <strong>' +
      invalidCount +
      '</strong></span>' +
      '<span style="color: #475569;"><i class="fas fa-database"></i> Total: <strong>' +
      csvParsedRows.length +
      '</strong></span>' +
      '</div>';
  }

  // Kolom yang ditampilkan di preview (5 kolom utama + status)
  const displayCols = ['nip', 'nama', 'satuan_kerja', 'jenis_jf', 'status'];
  const previewRows = csvParsedRows.slice(0, 50);

  if (head) {
    head.innerHTML =
      '<tr>' +
      displayCols
        .map(
          (c) =>
            '<th style="padding: 8px; background: #f1f5f9; border-bottom: 2px solid var(--border-color); text-align: left; text-transform: uppercase; font-size: 0.75rem;">' +
            c +
            '</th>'
        )
        .join('') +
      '<th style="padding: 8px; background: #f1f5f9; text-transform: uppercase; font-size: 0.75rem;">Status Validasi</th></tr>';
  }

  if (body) {
    body.innerHTML = previewRows
      .map((row) => {
        let errorTooltip = '';
        if (row._errors.length > 0) {
          errorTooltip = row._errors.join('&#10;'); // newline untuk tooltip
        }

        return (
          '<tr style="border-bottom: 1px solid var(--border-color);">' +
          displayCols
            .map((c) => '<td style="padding: 8px;">' + escapeHtml(row[c] || '-') + '</td>')
            .join('') +
          '<td style="padding: 8px;">' +
          (row._errors.length === 0
            ? '<span style="color: var(--success);"><i class="fas fa-check"></i> OK</span>'
            : '<span style="color: var(--danger); cursor: help;" title="' +
              errorTooltip +
              '"><i class="fas fa-times"></i> ' +
              row._errors.length +
              ' error</span>') +
          '</td></tr>'
        );
      })
      .join('');

    if (csvParsedRows.length > 50) {
      body.innerHTML +=
        '<tr><td colspan="' +
        (displayCols.length + 1) +
        '" style="padding: 12px; text-align: center; color: var(--text-light); font-style: italic;">... dan ' +
        (csvParsedRows.length - 50) +
        ' baris lainnya (akan diproses semua saat upload)</td></tr>';
    }
  }
}

/**
 * Process bulk upload - insert semua data valid ke database
 */
async function processBulkUpload() {
  if (csvUploadInProgress) {
    toastWarning('Upload sedang berjalan, tunggu sebentar...');
    return;
  }

  const validRows = csvParsedRows.filter((r) => r._errors.length === 0);
  if (validRows.length === 0) {
    toastError('Tidak ada data valid untuk diupload');
    return;
  }

  if (!isSupabaseReady()) {
    toastError('Supabase belum dikonfigurasi. Edit js/config.js');
    return;
  }

  const confirmed = await confirmDialog(
    'Anda akan mengupload ' + validRows.length + ' data ke database.\n\n' +
      'Pastikan:\n' +
      '• Data sudah benar\n' +
      '• NIP tidak duplikat dengan data existing\n\n' +
      'Klik OK untuk lanjut, Cancel untuk batal.'
  );
  if (!confirmed) return;

  csvUploadInProgress = true;
  const btn = document.getElementById('csvProcessBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Mengupload...';
  }

  const progressSection = document.getElementById('csvUploadProgress');
  if (progressSection) progressSection.style.display = 'block';

  let successCount = 0;
  let failCount = 0;
  const failedRows = [];

  // Cek NIP existing untuk hindari duplikat
  const existingNips = new Set(
    allData.map((r) => r['NIP']).filter(Boolean)
  );

  for (let i = 0; i < validRows.length; i++) {
    const row = validRows[i];

    const percent = Math.round(((i + 1) / validRows.length) * 100);
    updateCsvProgress(percent, 'Memproses baris ' + (i + 1) + '/' + validRows.length + ': ' + row.nama);

    // Cek duplikat NIP
    if (existingNips.has(row.nip)) {
      failCount++;
      failedRows.push({ row: row._rowNum, nip: row.nip, error: 'NIP sudah terdaftar' });
      continue;
    }

    try {
      const formData = {
        email: row.email,
        noHP: row.no_hp || '',
        nama: row.nama.toUpperCase(),
        nip: row.nip,
        noKarpeg: row.no_karpeg || '',
        tempatLahir: row.tempat_lahir || '',
        tanggalLahir: row.tanggal_lahir || '',
        pendidikan: row.pendidikan || '',
        jenisKelamin: row.jenis_kelamin || '',
        pangkatGol: row.pangkat_gol || '',
        tmtPangkat: row.tmt_pangkat || '',
        jenisJF: row.jenis_jf || '',
        jenjangJF: row.jenjang_jf || '',
        tmtJF: row.tmt_jf || '',
        masaKerjaGol: row.masa_kerja_gol || '',
        satuanKerja: row.satuan_kerja || '',
      };

      const result = await insertPengajuan(formData);
      if (result && result._id) {
        // Set status & catatan jika ada di CSV
        if (row.status && row.status !== 'Menunggu') {
          try {
            await updateStatus(result._id, row.status, row.catatan_admin || '');
          } catch (e) {
            console.warn('Gagal set status:', e.message);
          }
        }
        successCount++;
        existingNips.add(row.nip);
      } else {
        failCount++;
        failedRows.push({ row: row._rowNum, nip: row.nip, error: 'Insert gagal (response kosong)' });
      }
    } catch (err) {
      failCount++;
      failedRows.push({ row: row._rowNum, nip: row.nip, error: err.message || 'Unknown error' });
    }

    // Yield ke UI supaya tidak freeze
    if (i % 5 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  updateCsvProgress(100, 'Selesai!');

  const resultsEl = document.getElementById('csvUploadResults');
  if (resultsEl) {
    let html =
      '<div style="padding: 12px; background: ' +
      (failCount > 0 ? '#fef3c7' : '#d1fae5') +
      '; border-radius: 8px; margin-top: 8px;">' +
      '<div style="font-size: 0.9rem; margin-bottom: 6px;">' +
      '<i class="fas fa-check-circle" style="color: var(--success);"></i> ' +
      '<strong>Berhasil: ' + successCount + '</strong> data</div>';

    if (failCount > 0) {
      html +=
        '<div style="font-size: 0.9rem; margin-bottom: 6px;">' +
        '<i class="fas fa-times-circle" style="color: var(--danger);"></i> ' +
        '<strong>Gagal: ' + failCount + '</strong> data</div>' +
        '<details style="margin-top: 8px; font-size: 0.8rem;">' +
        '<summary style="cursor: pointer; color: var(--primary-blue);">Lihat detail error</summary>' +
        '<div style="margin-top: 8px; max-height: 150px; overflow-y: auto;">' +
        failedRows
          .map(
            (f) =>
              '<div style="padding: 4px 0; border-bottom: 1px solid var(--border-color);">Baris ' +
              f.row +
              ' (NIP: ' + escapeHtml(f.nip) + '): ' + escapeHtml(f.error) + '</div>'
          )
          .join('') +
        '</div></details>';
    }

    html += '</div>';
    resultsEl.innerHTML = html;
  }

  toastSuccess('Upload selesai! ' + successCount + ' berhasil, ' + failCount + ' gagal.');

  if (successCount > 0) {
    setTimeout(() => {
      loadDashboardData();
    }, 1000);
  }

  csvUploadInProgress = false;
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-check"></i> Selesai';
  }
}

function updateCsvProgress(percent, text) {
  const bar = document.getElementById('csvProgressBar');
  const percentEl = document.getElementById('csvProgressPercent');
  const textEl = document.getElementById('csvProgressText');

  if (bar) bar.style.width = percent + '%';
  if (percentEl) percentEl.textContent = percent + '%';
  if (textEl) textEl.textContent = text;
}
