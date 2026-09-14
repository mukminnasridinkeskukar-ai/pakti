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
 * ============================================ */

// Konfigurasi kolom CSV yang wajib & opsional
const CSV_REQUIRED_FIELDS = [
  'email',
  'nama',
  'nip',
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
];

const CSV_OPTIONAL_FIELDS = [
  'no_hp',
  'no_karpeg',
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
  // Buat modal dinamis
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

  // Click outside untuk close
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeBulkUploadModal();
  });

  // Reset state
  csvParsedRows = [];
}

function closeBulkUploadModal() {
  const modal = document.getElementById('bulkUploadModal');
  if (modal) modal.remove();
  csvParsedRows = [];
}

/**
 * Download template CSV
 */
function downloadCsvTemplate() {
  // Gunakan template yang sudah ada di folder templates/
  // Atau generate inline supaya tidak perlu fetch (works di file://)
  const headers = CSV_ALL_FIELDS.join(',');
  const sampleRows = [
    ['contoh1@dinkes.go.id', '081234567890', 'Ns. Mukmin Nasri, S.Kep', '197001012020011001', 'PEP-2024-001', 'Tenggarong', '1970-01-01', 'S1', 'Laki-laki', 'Penata Muda - III/a Ahli Pertama', '2020-01-01', 'Perawat', 'Pertama', '2020-07-01', '05 Tahun 03 Bulan', 'UPTD Puskesmas Samboja', 'Menunggu', ''],
    ['contoh2@dinkes.go.id', '081234567891', 'dr. Budi Santoso, Sp.A', '198005122010012002', 'PEP-2024-002', 'Samarinda', '1980-05-12', 'Spesialis', 'Laki-laki', 'Penata - III/c Ahli Muda', '2018-01-01', 'Dokter', 'Muda', '2018-07-01', '07 Tahun 02 Bulan', 'RSUD Aji Muhammad Parikesit', 'Terbit', 'SK PAK diterbitkan'],
  ];

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  let csv = headers + '\n';
  sampleRows.forEach((row) => {
    csv += row.map(escapeCsv).join(',') + '\n';
  });

  // BOM untuk Excel
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

  // Parse CSV
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
 */
function parseCsvContent(text) {
  csvParsedRows = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');

  if (lines.length < 2) {
    toastError('CSV kosong atau hanya berisi header');
    return;
  }

  // Parse header
  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());

  // Validasi header wajib
  const missingHeaders = CSV_REQUIRED_FIELDS.filter((f) => !headers.includes(f));
  if (missingHeaders.length > 0) {
    toastError('Header CSV tidak lengkap. Kolom wajib: ' + missingHeaders.join(', '));
    return;
  }

  // Parse rows
  let validCount = 0;
  let invalidCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] || '').trim();
    });

    // Validasi
    const errors = validateCsvRow(row, i);
    row._errors = errors;
    row._rowNum = i + 1;

    if (errors.length === 0) {
      validCount++;
    } else {
      invalidCount++;
    }

    csvParsedRows.push(row);
  }

  renderCsvPreview(headers, validCount, invalidCount);

  const btn = document.getElementById('csvProcessBtn');
  if (btn) {
    btn.disabled = validCount === 0;
    btn.innerHTML = `<i class="fas fa-upload"></i> Upload ${validCount} Data ke Database`;
  }

  toastInfo(`Parsed: ${validCount} valid, ${invalidCount} invalid dari ${csvParsedRows.length} baris`);
}

/**
 * Parse CSV line (handle quoted values)
 */
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Validasi satu baris CSV
 */
function validateCsvRow(row, idx) {
  const errors = [];

  // Cek field wajib tidak kosong
  for (const field of CSV_REQUIRED_FIELDS) {
    if (!row[field]) {
      errors.push(`${field} wajib diisi`);
    }
  }

  // Validasi NIP: 18 digit
  if (row.nip && !/^\d{18}$/.test(row.nip)) {
    errors.push('NIP harus 18 digit angka');
  }

  // Validasi email format
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    errors.push('Format email tidak valid');
  }

  // Validasi tanggal_lahir & tmt format YYYY-MM-DD
  for (const dateField of ['tanggal_lahir', 'tmt_pangkat', 'tmt_jf']) {
    if (row[dateField] && !/^\d{4}-\d{2}-\d{2}$/.test(row[dateField])) {
      errors.push(`${dateField} harus format YYYY-MM-DD`);
    }
  }

  // Validasi status
  if (row.status && !['', 'Menunggu', 'Perbaikan', 'Ditolak', 'Terbit'].includes(row.status)) {
    errors.push('status harus: Menunggu/Perbaikan/Ditolak/Terbit');
  }

  // Validasi jenis_kelamin
  if (row.jenis_kelamin && !['Laki-laki', 'Perempuan'].includes(row.jenis_kelamin)) {
    errors.push('jenis_kelamin harus: Laki-laki/Perempuan');
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
    countEl.textContent = `${csvParsedRows.length} baris | ${validCount} valid | ${invalidCount} error`;
  }

  if (summary) {
    summary.innerHTML = `
      <div style="display: flex; gap: 10px; flex-wrap: wrap; padding: 12px; background: ${
        invalidCount > 0 ? '#fef3c7' : '#d1fae5'
      }; border-radius: 8px; font-size: 0.85rem;">
        <span style="color: #065f46;"><i class="fas fa-check-circle"></i> Valid: <strong>${validCount}</strong></span>
        <span style="color: #92400e;"><i class="fas fa-exclamation-triangle"></i> Invalid: <strong>${invalidCount}</strong></span>
        <span style="color: #475569;"><i class="fas fa-database"></i> Total: <strong>${csvParsedRows.length}</strong></span>
      </div>
    `;
  }

  // Render table (max 50 baris untuk preview)
  const displayCols = ['nip', 'nama', 'satuan_kerja', 'jenis_jf', 'status'];
  const previewRows = csvParsedRows.slice(0, 50);

  if (head) {
    head.innerHTML = `<tr>${displayCols.map((c) => `<th style="padding: 8px; background: #f1f5f9; border-bottom: 2px solid var(--border-color); text-align: left;">${c}</th>`).join('')}<th style="padding: 8px; background: #f1f5f9;">Status Validasi</th></tr>`;
  }

  if (body) {
    body.innerHTML = previewRows
      .map(
        (row) => `
      <tr style="border-bottom: 1px solid var(--border-color);">
        ${displayCols.map((c) => `<td style="padding: 8px;">${escapeHtml(row[c] || '-')}</td>`).join('')}
        <td style="padding: 8px;">
          ${
            row._errors.length === 0
              ? '<span style="color: var(--success);"><i class="fas fa-check"></i> OK</span>'
              : `<span style="color: var(--danger);" title="${escapeHtml(row._errors.join('; '))}"><i class="fas fa-times"></i> ${row._errors.length} error</span>`
          }
        </td>
      </tr>
    `
      )
      .join('');

    if (csvParsedRows.length > 50) {
      body.innerHTML += `<tr><td colspan="${displayCols.length + 1}" style="padding: 12px; text-align: center; color: var(--text-light); font-style: italic;">... dan ${csvParsedRows.length - 50} baris lainnya (akan diproses semua saat upload)</td></tr>`;
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

  // Konfirmasi
  const confirmed = await confirmDialog(
    `Anda akan mengupload ${validRows.length} data ke database.\n\n` +
      `Pastikan:\n` +
      `• Data sudah benar\n` +
      `• NIP tidak duplikat dengan data existing\n\n` +
      `Klik OK untuk lanjut, Cancel untuk batal.`
  );
  if (!confirmed) return;

  csvUploadInProgress = true;
  const btn = document.getElementById('csvProcessBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Mengupload...';
  }

  // Tampilkan progress section
  const progressSection = document.getElementById('csvUploadProgress');
  if (progressSection) progressSection.style.display = 'block';

  let successCount = 0;
  let failCount = 0;
  const failedRows = [];

  // Cek NIP existing untuk hindari duplikat
  const existingNips = new Set(allData.map((r) => r['NIP']).filter(Boolean));

  for (let i = 0; i < validRows.length; i++) {
    const row = validRows[i];

    // Update progress UI
    const percent = Math.round(((i + 1) / validRows.length) * 100);
    updateCsvProgress(percent, `Memproses baris ${i + 1}/${validRows.length}: ${row.nama}`);

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
        tempatLahir: row.tempat_lahir,
        tanggalLahir: row.tanggal_lahir,
        pendidikan: row.pendidikan,
        jenisKelamin: row.jenis_kelamin,
        pangkatGol: row.pangkat_gol,
        tmtPangkat: row.tmt_pangkat,
        jenisJF: row.jenis_jf,
        jenjangJF: row.jenjang_jf,
        tmtJF: row.tmt_jf,
        masaKerjaGol: row.masa_kerja_gol,
        satuanKerja: row.satuan_kerja,
      };

      const result = await insertPengajuan(formData);
      if (result && result._id) {
        // Optional: set status & catatan jika ada di CSV
        if (row.status && row.status !== 'Menunggu') {
          await updateStatus(result._id, row.status, row.catatan_admin || '');
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

    // Delay kecil supaya UI tidak freeze
    if (i % 5 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  // Update UI final
  updateCsvProgress(100, 'Selesai!');
  const resultsEl = document.getElementById('csvUploadResults');
  if (resultsEl) {
    let html = `
      <div style="padding: 12px; background: ${failCount > 0 ? '#fef3c7' : '#d1fae5'}; border-radius: 8px; margin-top: 8px;">
        <div style="font-size: 0.9rem; margin-bottom: 6px;">
          <i class="fas fa-check-circle" style="color: var(--success);"></i>
          <strong>Berhasil: ${successCount}</strong> data
        </div>
    `;
    if (failCount > 0) {
      html += `
        <div style="font-size: 0.9rem; margin-bottom: 6px;">
          <i class="fas fa-times-circle" style="color: var(--danger);"></i>
          <strong>Gagal: ${failCount}</strong> data
        </div>
        <details style="margin-top: 8px; font-size: 0.8rem;">
          <summary style="cursor: pointer; color: var(--primary-blue);">Lihat detail error</summary>
          <div style="margin-top: 8px; max-height: 150px; overflow-y: auto;">
            ${failedRows.map((f) => `<div style="padding: 4px 0; border-bottom: 1px solid var(--border-color);">Baris ${f.row} (NIP: ${escapeHtml(f.nip)}): ${escapeHtml(f.error)}</div>`).join('')}
          </div>
        </details>
      `;
    }
    html += `</div>`;
    resultsEl.innerHTML = html;
  }

  toastSuccess(`Upload selesai! ${successCount} berhasil, ${failCount} gagal.`);

  // Reload data jika ada sukses
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
