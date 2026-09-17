/* ============================================
 * PAKTI - Formulir Pengajuan Logic
 * ============================================
 * Fitur:
 * - Nomor register & tanggal otomatis di atas formulir
 * - Submit → terbitkan nomor register yang bisa di-download
 * ============================================ */

// File storage untuk upload
let selectedFiles = {
  foto: null,
  skPangkat: null,
  skJabfung: null,
  pakKonvensional: null,
};

// File storage untuk form update (perbaikan)
let selectedUpdateFiles = {
  upd_foto: null,
  upd_skPangkat: null,
  upd_skJabfung: null,
  upd_pakKonvensional: null,
};

/**
 * Update tanggal & waktu otomatis di formulir
 * Dipanggil saat halaman formulir dibuka
 */
function updateTanggalWaktuOtomatis() {
  const now = new Date();
  const formatted = now.toLocaleString('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const el = document.getElementById('displayTanggalWaktu');
  if (el) el.textContent = formatted;
}

// Update tanggal setiap 1 detik (agar tetap aktual)
setInterval(() => {
  const formVisible = document.getElementById('formulirPage');
  if (formVisible && formVisible.classList.contains('active')) {
    updateTanggalWaktuOtomatis();
  }
}, 1000);

// Konfigurasi file
const fileConfig = {
  foto: {
    accept: ['image/jpeg', 'image/jpg', 'image/png'],
    maxSize: 2 * 1024 * 1024, // 2MB
    name: 'Foto Berwarna 4x6 cm',
    dbField: 'dok_foto_url',
    storagePath: 'foto',
  },
  skPangkat: {
    accept: ['application/pdf'],
    maxSize: 1 * 1024 * 1024, // 1MB
    name: 'SK Pangkat Terakhir',
    dbField: 'dok_sk_pangkat_url',
    storagePath: 'sk_pangkat',
  },
  skJabfung: {
    accept: ['application/pdf'],
    maxSize: 1 * 1024 * 1024,
    name: 'SK Jabatan Fungsional',
    dbField: 'dok_sk_jabfung_url',
    storagePath: 'sk_jabfung',
  },
  pakKonvensional: {
    accept: ['application/pdf'],
    maxSize: 1 * 1024 * 1024,
    name: 'PAK Konvensional',
    dbField: 'dok_pak_konvensional_url',
    storagePath: 'pak_konvensional',
  },
};

/**
 * Handle file selection from input
 */
function handleFileSelect(input, type) {
  const file = input.files[0];
  if (!file) return;
  validateAndStoreFile(file, type);
}

/**
 * Handle drag over
 */
function handleDragOver(event) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.add('drag-over');
}

function handleDragLeave(event) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.remove('drag-over');
}

function handleDrop(event, type) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.remove('drag-over');
  const files = event.dataTransfer.files;
  if (files.length > 0) {
    validateAndStoreFile(files[0], type);
  }
}

/**
 * Validate and store file
 */
function validateAndStoreFile(file, type) {
  const isUpdateForm = type.startsWith('upd_');
  const actualType = isUpdateForm ? type.substring(4) : type;
  const config = fileConfig[actualType];

  if (!config) {
    toastError('Tipe file tidak dikenal: ' + type);
    return;
  }

  // Validate type
  if (!config.accept.includes(file.type)) {
    const acceptStr = actualType === 'foto' ? 'JPG, JPEG, atau PNG' : 'PDF';
    toastError(`Hanya file ${acceptStr} yang diizinkan untuk ${config.name}!`);
    return;
  }

  // Validate size
  if (file.size > config.maxSize) {
    const maxSizeStr = actualType === 'foto' ? '2MB' : '1MB';
    toastError(`Ukuran file maksimal ${maxSizeStr} untuk ${config.name}!`);
    return;
  }

  // Store file
  if (isUpdateForm) {
    selectedUpdateFiles[type] = file;
  } else {
    selectedFiles[type] = file;
  }

  // Update UI
  const prefix = isUpdateForm ? 'upd_' : '';
  const fieldName = actualType.charAt(0).toUpperCase() + actualType.slice(1);
  const fileNameEl = document.getElementById(prefix + 'fileName' + fieldName);
  const uploadAreaEl = document.getElementById(prefix + 'fileUploadArea' + fieldName);

  if (fileNameEl) {
    fileNameEl.textContent = '✓ ' + file.name + ' (' + formatFileSize(file.size) + ')';
    fileNameEl.style.display = 'block';
  }
  if (uploadAreaEl) {
    uploadAreaEl.classList.add('has-file');
  }

  toastSuccess(`${config.name} berhasil dipilih: ${file.name}`);
}

/**
 * Handle form submit
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  // Validasi data wajib
  const requiredFields = [
    { id: 'email', label: 'Email' },
    { id: 'noHP', label: 'No HP / Whatsapp' },
    { id: 'nama', label: 'Nama Lengkap' },
    { id: 'nip', label: 'NIP' },
    { id: 'tempatLahir', label: 'Tempat Lahir' },
    { id: 'tanggalLahir', label: 'Tanggal Lahir' },
    { id: 'pendidikan', label: 'Pendidikan' },
    { id: 'jenisKelamin', label: 'Jenis Kelamin' },
    { id: 'pangkatGol', label: 'Pangkat/Gol' },
    { id: 'tmtPangkat', label: 'TMT Pangkat' },
    { id: 'jenisJF', label: 'Jenis JF' },
    { id: 'jenjangJF', label: 'Jenjang JF' },
    { id: 'tmtJF', label: 'TMT JF' },
    { id: 'masaKerjaGol', label: 'Masa Kerja Gol' },
    { id: 'satuanKerja', label: 'Satuan Kerja' },
  ];

  for (const field of requiredFields) {
    const value = document.getElementById(field.id).value.trim();
    if (!value) {
      toastError(`Field "${field.label}" wajib diisi!`);
      document.getElementById(field.id).focus();
      document.getElementById(field.id).classList.add('error');
      return;
    }
    document.getElementById(field.id).classList.remove('error');
  }

  // Validate NIP
  const nip = document.getElementById('nip').value;
  if (!isValidNIP(nip)) {
    toastError('NIP harus 18 digit angka!');
    document.getElementById('nip').focus();
    return;
  }

  // Cek duplikasi NIP
  const isDuplicate = allData.some((row) => row['NIP'] === nip);
  if (isDuplicate) {
    toastError('NIP sudah terdaftar! Gunakan NIP yang berbeda.');
    return;
  }

  // Validate documents
  const requiredFiles = ['foto', 'skPangkat', 'skJabfung', 'pakKonvensional'];
  const missingFiles = requiredFiles.filter((key) => !selectedFiles[key]);
  if (missingFiles.length > 0) {
    const missingNames = missingFiles.map((key) => fileConfig[key].name).join(', ');
    toastError(`Silakan lengkapi semua dokumen:\n${missingNames}`);
    return;
  }

  // Konfirmasi
  const confirmed = await confirmDialog(
    'PASTIKAN DATA SUDAH BENAR!\n\n' +
      'Data yang dikirim:\n' +
      '• NIP: ' + nip + '\n' +
      '• Nama: ' + document.getElementById('nama').value.toUpperCase() + '\n' +
      '• Satuan Kerja: ' + document.getElementById('satuanKerja').value + '\n' +
      '• Dokumen: 4 file (Foto, SK Pangkat, SK Jabfung, PAK)\n\n' +
      'Klik OK untuk mengirim, atau Cancel untuk memeriksa kembali.'
  );
  if (!confirmed) {
    toastInfo('Silakan periksa kembali data Anda.');
    return;
  }

  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading-spinner"></span> Memproses & Mengupload...';
  }

  try {
    // Siapkan data form
    const formData = {
      email: document.getElementById('email').value,
      noHP: document.getElementById('noHP').value,
      nama: document.getElementById('nama').value.toUpperCase(),
      nip: nip,
      noKarpeg: document.getElementById('noKarpeg').value,
      tempatLahir: document.getElementById('tempatLahir').value,
      tanggalLahir: document.getElementById('tanggalLahir').value,
      pendidikan: document.getElementById('pendidikan').value,
      jenisKelamin: document.getElementById('jenisKelamin').value,
      pangkatGol: document.getElementById('pangkatGol').value,
      tmtPangkat: document.getElementById('tmtPangkat').value,
      jenisJF: document.getElementById('jenisJF').value,
      jenjangJF: document.getElementById('jenjangJF').value,
      tmtJF: document.getElementById('tmtJF').value,
      masaKerjaGol: document.getElementById('masaKerjaGol').value,
      satuanKerja: document.getElementById('satuanKerja').value,
    };

    // ============================================
    // STEP 1: Upload semua file ke Supabase Storage DULU
    // (sebelum insert DB), supaya kalau gagal upload,
    // data tidak masuk DB setengah-setengah
    // ============================================
    toastInfo('Mengupload dokumen ke storage...');

    const fileTypes = ['foto', 'skPangkat', 'skJabfung', 'pakKonvensional'];
    const uploadResults = {};
    let uploadFailed = false;

    for (const fileType of fileTypes) {
      if (selectedFiles[fileType]) {
        try {
          toastInfo(`Mengupload ${fileConfig[fileType].name}...`);
          const url = await uploadDocument(
            selectedFiles[fileType],
            fileConfig[fileType].storagePath,
            nip
          );
          uploadResults[fileType] = url;
          console.log('[Submit] ✅ Uploaded', fileType, '→', url);
        } catch (uploadErr) {
          console.error('[Submit] ❌ Upload failed for', fileType, ':', uploadErr);
          toastError(`Gagal upload ${fileConfig[fileType].name}: ${uploadErr.message}`);
          uploadFailed = true;
        }
      }
    }

    if (uploadFailed) {
      throw new Error(
        'Gagal mengupload salah satu dokumen. Periksa koneksi internet dan Storage bucket di Supabase.'
      );
    }

    // ============================================
    // STEP 2: Insert data ke database dengan URL dokumen
    // ============================================
    toastInfo('Menyimpan data ke database...');

    const insertedRow = await insertPengajuan(formData);
    if (!insertedRow || !insertedRow._id) {
      throw new Error('Gagal menyimpan data ke database (response tidak valid)');
    }

    // ============================================
    // STEP 3: Update record dengan URL dokumen yang sudah diupload
    // ============================================
    for (const fileType of fileTypes) {
      if (uploadResults[fileType]) {
        try {
          await updateDocumentURL(
            insertedRow._id,
            fileConfig[fileType].dbField,
            uploadResults[fileType]
          );
        } catch (updateErr) {
          console.error('[Submit] Gagal update URL dokumen', fileType, ':', updateErr);
          // Tidak throw - data sudah masuk DB, URL bisa diupdate nanti
        }
      }
    }

    // Update local data dengan URL dokumen
    const newRow = {
      ...insertedRow,
      'Dok_Foto_4x6': uploadResults.foto || '',
      'Dok_SK_Pangkat_2022_2023': uploadResults.skPangkat || '',
      'Dok_SK_Jabfung_2022_2023': uploadResults.skJabfung || '',
      'Dok_PAK_Konvensional_s_d_2022': uploadResults.pakKonvensional || '',
    };
    allData.unshift(newRow);

    // Tampilkan nomor register di formulir
    const nomorRegEl = document.getElementById('displayNomorRegister');
    if (nomorRegEl) {
      nomorRegEl.textContent = insertedRow.NomorRegister || '—';
    }
    const nomorRegInput = document.getElementById('inputNomorRegister');
    if (nomorRegInput) {
      nomorRegInput.value = insertedRow.NomorRegister || '';
    }

    // Reset form (tapi biarkan nomor register terlihat)
    document.getElementById('pengajuanForm').reset();
    selectedFiles = { foto: null, skPangkat: null, skJabfung: null, pakKonvensional: null };
    ['Foto', 'SKPangkat', 'SKJabfung', 'PAK'].forEach((type) => {
      const fileNameEl = document.getElementById('fileName' + type);
      const uploadAreaEl = document.getElementById('fileUploadArea' + type);
      if (fileNameEl) {
        fileNameEl.style.display = 'none';
        fileNameEl.textContent = '';
      }
      if (uploadAreaEl) uploadAreaEl.classList.remove('has-file');
    });

    // Tampilkan modal sukses dengan nomor register + tombol download
    showRegisterSuccessModal(insertedRow);

    // Redirect to tracking page setelah modal ditutup (8 detik)
    setTimeout(() => navigateTo('tracking'), 8000);
  } catch (error) {
    console.error('[Submit] Error:', error);
    // Handle Supabase error object (punya .message, .code, .details)
    let errMsg = 'Unknown error';
    if (typeof error === 'object' && error !== null) {
      errMsg = error.message || error.details || error.hint || JSON.stringify(error);
    } else if (typeof error === 'string') {
      errMsg = error;
    }
    toastError('Gagal submit: ' + errMsg);
    console.error('[Submit] Full error:', JSON.stringify(error, null, 2));
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Pengajuan';
    }
  }
}

/* ============================================
 * MODAL SUKSES DENGAN NOMOR REGISTER & DOWNLOAD
 * ============================================ */
function showRegisterSuccessModal(insertedRow) {
  let modal = document.getElementById('registerSuccessModal');
  if (modal) modal.remove();

  const nomorRegister = insertedRow.NomorRegister || '—';
  const nama = insertedRow['Nama Lengkap dengan Gelar'] || '-';
  const nip = insertedRow['NIP'] || '-';
  const satuanKerja = insertedRow['Satuan Kerja'] || '-';
  const now = new Date();
  const tanggalSubmit = now.toLocaleString('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  modal = document.createElement('div');
  modal.id = 'registerSuccessModal';
  modal.className = 'modal-overlay active';
  modal.style.cssText = 'display: flex; z-index: 10000;';

  modal.innerHTML = `
    <div class="modal" style="max-width: 500px;">
      <div class="modal-body" style="padding: 30px; text-align: center;">
        <div style="width: 80px; height: 80px; background: var(--success); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
          <i class="fas fa-check" style="font-size: 40px; color: white;"></i>
        </div>
        <h2 style="color: var(--text-dark); margin-bottom: 8px;">Pengajuan Berhasil!</h2>
        <p style="color: var(--text-medium); margin-bottom: 20px;">Data pengajuan Anda berhasil tersimpan ke database.</p>

        <!-- Nomor Register -->
        <div style="background: linear-gradient(135deg, #e8f0fe 0%, #f0f7ff 100%); padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 2px solid var(--primary-blue);">
          <div style="font-size: 0.75rem; color: var(--text-medium); text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 8px;">
            <i class="fas fa-hashtag"></i> Nomor Register
          </div>
          <div style="font-size: 1.5rem; font-weight: 800; color: var(--government-blue); font-family: 'Courier New', monospace; letter-spacing: 1px;">
            ${escapeHtml(nomorRegister)}
          </div>
        </div>

        <!-- Detail Pengajuan -->
        <div style="background: var(--light-bg); padding: 16px; border-radius: 8px; margin-bottom: 20px; text-align: left; font-size: 0.85rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: var(--text-light);">Nama:</span>
            <span style="font-weight: 600;">${escapeHtml(nama)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: var(--text-light);">NIP:</span>
            <span style="font-family: monospace; font-weight: 600;">${escapeHtml(nip)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: var(--text-light);">Satuan Kerja:</span>
            <span style="font-weight: 600;">${escapeHtml(satuanKerja)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-light);">Tanggal Submit:</span>
            <span style="font-weight: 600;">${escapeHtml(tanggalSubmit)}</span>
          </div>
        </div>

        <p style="font-size: 0.8rem; color: var(--text-light); margin-bottom: 16px;">
          <i class="fas fa-info-circle"></i> Simpan nomor register ini untuk cek status pengajuan Anda. Klik tombol di bawah untuk mengunduh bukti pendaftaran.
        </p>

        <!-- Tombol Download & Tutup -->
        <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
          <button class="btn btn-success" onclick="downloadBuktiRegister('${escapeHtml(nomorRegister)}', '${escapeHtml(nama)}', '${escapeHtml(nip)}', '${escapeHtml(satuanKerja)}', '${escapeHtml(tanggalSubmit)}')">
            <i class="fas fa-download"></i> Download Bukti Register
          </button>
          <button class="btn btn-primary" onclick="document.getElementById('registerSuccessModal').remove()">
            <i class="fas fa-check"></i> Tutup
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener('click', function (e) {
    if (e.target === modal) modal.remove();
  });
}

/**
 * Download bukti register sebagai file HTML (printable)
 * User bisa save as PDF dari browser print
 */
function downloadBuktiRegister(nomorRegister, nama, nip, satuanKerja, tanggalSubmit) {
  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Bukti Register - ${escapeHtml(nomorRegister)}</title>
  <style>
    @page { size: A4; margin: 2cm; }
    body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; color: #000; }
    .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 20px; }
    .header h1 { font-size: 14pt; margin: 0; }
    .header h2 { font-size: 11pt; margin: 4px 0 0 0; font-weight: normal; }
    .content { padding: 20px 0; }
    .register-box { text-align: center; background: #f0f7ff; padding: 15px; border: 2px solid #1a73e8; border-radius: 8px; margin: 20px 0; }
    .register-box .label { font-size: 9pt; color: #666; text-transform: uppercase; letter-spacing: 1px; }
    .register-box .value { font-size: 18pt; font-weight: bold; color: #0d47a1; font-family: 'Courier New', monospace; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    td { padding: 6px 8px; border-bottom: 1px solid #ddd; }
    td.label { width: 40%; color: #666; font-weight: 600; }
    td.value { font-weight: 600; }
    .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 9pt; color: #999; }
    .ttd { text-align: right; margin-top: 40px; }
    .ttd p { margin: 2px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>PEMERINTAH KABUPATEN KUTAI KARTANEGARA</h1>
    <h2>DINAS KESEHATAN</h2>
  </div>

  <h2 style="text-align: center; margin-bottom: 20px;">BUKTI PENDAFTARAN PENGAJUAN PAK INTEGRASI</h2>

  <div class="register-box">
    <div class="label">Nomor Register</div>
    <div class="value">${escapeHtml(nomorRegister)}</div>
  </div>

  <table>
    <tr><td class="label">Nama Lengkap</td><td class="value">${escapeHtml(nama)}</td></tr>
    <tr><td class="label">NIP</td><td class="value">${escapeHtml(nip)}</td></tr>
    <tr><td class="label">Satuan Kerja</td><td class="value">${escapeHtml(satuanKerja)}</td></tr>
    <tr><td class="label">Tanggal Submit</td><td class="value">${escapeHtml(tanggalSubmit)}</td></tr>
    <tr><td class="label">Status</td><td class="value">Menunggu Verifikasi Admin</td></tr>
  </table>

  <p style="margin-top: 20px; font-size: 10pt;">
    <strong>Catatan:</strong> Simpan nomor register ini untuk melakukan pengecekan status pengajuan Anda melalui menu "Cek Status Pengajuan" di platform PAKTI.
  </p>

  <div class="ttd">
    <p>Diterima oleh,</p>
    <p style="margin-top: 60px;">__________________________</p>
    <p>Petugas Penerima</p>
  </div>

  <div class="footer">
    <p>Dokumen ini dihasilkan oleh Sistem PAKTI (Pengelolaan Angka Kredit Integrasi)</p>
    <p>Pemerintah Kabupaten Kutai Kartanegara &copy; ${new Date().getFullYear()}</p>
  </div>
</body>
</html>
  `;

  const blob = new Blob(['\ufeff' + html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Bukti_Register_' + nomorRegister + '.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  toastSuccess('Bukti register berhasil diunduh! Buka file & print/save as PDF.');

  // Auto-open print dialog di tab baru (optional)
  setTimeout(() => {
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
      setTimeout(() => printWin.print(), 500);
    }
  }, 500);
}

/**
 * Validate NIP on blur
 */
function validateNIP() {
  const nip = document.getElementById('nip').value;
  const errorEl = document.getElementById('nipError');

  if (nip.length !== 18) {
    if (errorEl) errorEl.textContent = 'NIP harus 18 digit';
    document.getElementById('nip').classList.add('error');
    return false;
  }

  const isDuplicate = allData.some((row) => row['NIP'] === nip);
  if (isDuplicate) {
    if (errorEl) errorEl.textContent = 'NIP sudah terdaftar';
    document.getElementById('nip').classList.add('error');
    return false;
  }

  if (errorEl) errorEl.textContent = '';
  document.getElementById('nip').classList.remove('error');
  return true;
}

/**
 * Setup form event listeners
 */
function setupFormListeners() {
  const form = document.getElementById('pengajuanForm');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  const nipInput = document.getElementById('nip');
  if (nipInput) {
    nipInput.addEventListener('blur', validateNIP);
  }

  const namaInput = document.getElementById('nama');
  if (namaInput) {
    namaInput.addEventListener('input', function () {
      this.value = this.value.toUpperCase();
    });
  }

  // Search inputs with debounce
  const dashboardSearch = document.getElementById('dashboardSearch');
  if (dashboardSearch) {
    dashboardSearch.addEventListener('input', debounce(filterDashboard, 300));
  }
  const adminSearch = document.getElementById('adminSearch');
  if (adminSearch) {
    adminSearch.addEventListener('input', debounce(filterAdmin, 300));
  }
  const trackingSearch = document.getElementById('trackingSearch');
  if (trackingSearch) {
    trackingSearch.addEventListener('input', debounce(filterTracking, 300));
  }

  // Filter selects
  const dashboardFilterJF = document.getElementById('dashboardFilterJF');
  if (dashboardFilterJF) dashboardFilterJF.addEventListener('change', filterDashboard);
  const dashboardFilterStatus = document.getElementById('dashboardFilterStatus');
  if (dashboardFilterStatus) dashboardFilterStatus.addEventListener('change', filterDashboard);
  const trackingFilterStatus = document.getElementById('trackingFilterStatus');
  if (trackingFilterStatus) trackingFilterStatus.addEventListener('change', filterTracking);
  const trackingFilterSatker = document.getElementById('trackingFilterSatker');
  if (trackingFilterSatker) trackingFilterSatker.addEventListener('change', filterTracking);
  const adminFilterJF = document.getElementById('adminFilterJF');
  if (adminFilterJF) adminFilterJF.addEventListener('change', filterAdmin);
  const adminFilterStatus = document.getElementById('adminFilterStatus');
  if (adminFilterStatus) adminFilterStatus.addEventListener('change', filterAdmin);
  const adminFilterSatker = document.getElementById('adminFilterSatker');
  if (adminFilterSatker) adminFilterSatker.addEventListener('change', filterAdmin);
}
