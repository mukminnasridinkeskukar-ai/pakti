/* ============================================
 * PAKTI - Formulir Pengajuan Logic
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

    // Reset form
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

    toastSuccess(
      '✅ Pengajuan berhasil!\n• Data tersimpan ke database\n• 4 dokumen terupload ke storage\nStatus: Menunggu proses admin'
    );

    // Redirect to tracking page
    setTimeout(() => navigateTo('tracking'), 2000);
  } catch (error) {
    console.error('[Submit] Error:', error);
    toastError('Error: ' + (error.message || 'unknown'));
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Pengajuan';
    }
  }
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
