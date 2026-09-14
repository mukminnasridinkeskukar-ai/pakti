/* ============================================
 * PAKTI - Cek Status Pengajuan Logic
 * ============================================ */

// State untuk update data perbaikan
let currentEditData = null;
let currentEditId = null;

/**
 * Cek status berdasarkan NIP
 */
async function cekStatusByNIK() {
  const nipInput = document.getElementById('cekNikInput');
  if (!nipInput) return;

  const nip = nipInput.value.trim();

  if (!nip) {
    toastWarning('Silakan masukkan NIP terlebih dahulu!');
    return;
  }

  if (nip.length < 10) {
    toastError('NIP/NIK minimal 10 digit!');
    return;
  }

  const resultDiv = document.getElementById('cekStatusResult');
  if (resultDiv) {
    resultDiv.innerHTML =
      '<div style="text-align:center;padding:30px;"><div class="loading-spinner"></div><p style="margin-top:12px;">Mencari data...</p></div>';
  }

  try {
    // Cari di local data terlebih dahulu (cepat)
    let foundData = allData.find((row) => row['NIP'] === nip);

    if (foundData) {
      currentEditData = { ...foundData };
      currentEditId = foundData._id;
      displayStatusResult(foundData);
    } else if (isSupabaseReady()) {
      // Cari via Supabase
      const remoteData = await fetchByNIP(nip);
      if (remoteData) {
        currentEditData = { ...remoteData };
        currentEditId = remoteData._id;
        displayStatusResult(remoteData);
      } else {
        displayNotFound();
      }
    } else {
      displayNotFound();
    }
  } catch (error) {
    console.error('[Cek Status] Error:', error);
    displayNotFound();
  }
}

/**
 * Display status result
 */
function displayStatusResult(data) {
  const resultDiv = document.getElementById('cekStatusResult');
  if (!resultDiv) return;

  const status = data['Status'] || 'Menunggu';
  const statusBadge = getStatusBadge(status);

  const importantFields = [
    'Nama Lengkap dengan Gelar',
    'NIP',
    'No Karpeg',
    'Tempat & Tanggal Lahir',
    'Pendidikan',
    'Jenis Kelamin',
    'Pangkat/Gol',
    'TMT Pangkat',
    'Jenis JF',
    'Jenjang JF',
    'TMT JF',
    'Masa Kerja Gol',
    'Satuan Kerja',
    'Status',
    'Catatan Admin',
    'Update Terakhir',
  ];

  let detailsHTML = '';

  for (const field of importantFields) {
    if (data[field] !== undefined && data[field] !== '') {
      let value = data[field];

      if (field === 'Status') {
        value = statusBadge;
      } else {
        value = escapeHtml(value);
      }

      detailsHTML += `
        <div class="detail-item">
          <label>${field}</label>
          <span>${value}</span>
        </div>
      `;
    }
  }

  let html = `
    <div class="status-result-card">
      <div class="status-header">
        <h3><i class="fas fa-user-circle"></i> Data Pengajuan Ditemukan</h3>
        ${statusBadge}
      </div>
      <div class="status-detail-grid">
        ${detailsHTML}
      </div>
  `;

  // Tombol update jika status Perbaikan
  if (status === 'Perbaikan' || status === 'Diperbaiki') {
    html += `
      <div class="status-action">
        <button class="btn btn-warning" onclick="showUpdateForm()">
          <i class="fas fa-edit"></i> Update Data Perbaikan
        </button>
      </div>
    `;
  }

  html += `</div>`;
  resultDiv.innerHTML = html;
}

/**
 * Display not found
 */
function displayNotFound() {
  const resultDiv = document.getElementById('cekStatusResult');
  if (!resultDiv) return;

  resultDiv.innerHTML = `
    <div class="not-found-card">
      <i class="fas fa-search"></i>
      <h3>Data Tidak Ditemukan</h3>
      <p>Tidak ada pengajuan dengan NIK tersebut. Pastikan NIK yang dimasukkan benar.</p>
    </div>
  `;
}

/**
 * Show update form (untuk perbaikan)
 */
function showUpdateForm() {
  if (!currentEditData) {
    toastWarning('Data tidak tersedia untuk diperbaiki');
    return;
  }

  const resultDiv = document.getElementById('cekStatusResult');
  const data = currentEditData;

  let tempatLahir = '';
  let tanggalLahir = '';
  if (data['Tempat & Tanggal Lahir']) {
    const parts = String(data['Tempat & Tanggal Lahir']).split(', ');
    tempatLahir = parts[0] || '';
    tanggalLahir = parts[1] || '';
  }

  const html = `
    <div class="update-form-container">
      <h3><i class="fas fa-edit"></i> Form Update Data Perbaikan</h3>
      <p class="form-subtitle">Perbaiki data yang ditandai oleh admin, lalu simpan perubahan.</p>

      <form id="updatePerbaikanForm" onsubmit="handleUpdateSubmit(event)">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Email Aktif <span class="required">*</span></label>
            <input type="email" class="form-input" id="upd_email" value="${escapeHtml(data['Email'] || '')}" required>
          </div>

          <div class="form-group">
            <label class="form-label">No. HP/Whatsapp <span class="required">*</span></label>
            <input type="tel" class="form-input" id="upd_noHP" value="${escapeHtml(data['NoHP'] || '')}" required>
          </div>

          <div class="form-group full-width">
            <label class="form-label">Nama Lengkap dengan Gelar <span class="required">*</span></label>
            <input type="text" class="form-input" id="upd_nama" value="${escapeHtml(data['Nama Lengkap dengan Gelar'] || '')}" required>
          </div>

          <div class="form-group">
            <label class="form-label">NIP <span class="required">*</span></label>
            <input type="text" class="form-input" id="upd_nip" value="${escapeHtml(data['NIP'] || '')}" maxlength="18" readonly style="background: #f0f0f0;">
          </div>

          <div class="form-group">
            <label class="form-label">No. Karpeg</label>
            <input type="text" class="form-input" id="upd_noKarpeg" value="${escapeHtml(data['No Karpeg'] || '')}">
          </div>

          <div class="form-group">
            <label class="form-label">Tempat Lahir <span class="required">*</span></label>
            <input type="text" class="form-input" id="upd_tempatLahir" value="${escapeHtml(tempatLahir)}" required>
          </div>

          <div class="form-group">
            <label class="form-label">Tanggal Lahir <span class="required">*</span></label>
            <input type="date" class="form-input" id="upd_tanggalLahir" value="${escapeHtml(tanggalLahir)}" required>
          </div>

          <div class="form-group">
            <label class="form-label">Pendidikan <span class="required">*</span></label>
            <select class="form-select" id="upd_pendidikan" required>
              <option value="">Pilih Pendidikan</option>
              <option value="D3" ${data['Pendidikan'] === 'D3' ? 'selected' : ''}>D3 (Sarjana Muda)</option>
              <option value="D4" ${data['Pendidikan'] === 'D4' ? 'selected' : ''}>D4 (Sarjana Terapan)</option>
              <option value="S1" ${data['Pendidikan'] === 'S1' ? 'selected' : ''}>S1 (Strata 1)</option>
              <option value="Profesi" ${data['Pendidikan'] === 'Profesi' ? 'selected' : ''}>Profesi</option>
              <option value="S2" ${data['Pendidikan'] === 'S2' ? 'selected' : ''}>S2 (Magister)</option>
              <option value="Spesialis" ${data['Pendidikan'] === 'Spesialis' ? 'selected' : ''}>Spesialis</option>
              <option value="Sub Spesialis" ${data['Pendidikan'] === 'Sub Spesialis' ? 'selected' : ''}>Sub Spesialis</option>
              <option value="S3" ${data['Pendidikan'] === 'S3' ? 'selected' : ''}>S3 (Doktor)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Jenis Kelamin <span class="required">*</span></label>
            <select class="form-select" id="upd_jenisKelamin" required>
              <option value="">Pilih Jenis Kelamin</option>
              <option value="Laki-laki" ${data['Jenis Kelamin'] === 'Laki-laki' ? 'selected' : ''}>Laki-laki</option>
              <option value="Perempuan" ${data['Jenis Kelamin'] === 'Perempuan' ? 'selected' : ''}>Perempuan</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Pangkat/Gol <span class="required">*</span></label>
            <select class="form-select" id="upd_pangkatGol" required>
              <option value="">Pilih Pangkat</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">TMT Pangkat <span class="required">*</span></label>
            <input type="date" class="form-input" id="upd_tmtPangkat" value="${escapeHtml(data['TMT Pangkat'] || '')}" required>
          </div>

          <div class="form-group">
            <label class="form-label">Jenis JF <span class="required">*</span></label>
            <select class="form-select" id="upd_jenisJF" required>
              <option value="">Pilih Jenis JF</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Jenjang JF <span class="required">*</span></label>
            <select class="form-select" id="upd_jenjangJF" required>
              <option value="">Pilih Jenjang</option>
              <option value="Terampil" ${data['Jenjang JF'] === 'Terampil' ? 'selected' : ''}>Terampil</option>
              <option value="Mahir" ${data['Jenjang JF'] === 'Mahir' ? 'selected' : ''}>Mahir</option>
              <option value="Penyelia" ${data['Jenjang JF'] === 'Penyelia' ? 'selected' : ''}>Penyelia</option>
              <option value="Pertama" ${data['Jenjang JF'] === 'Pertama' ? 'selected' : ''}>Pertama</option>
              <option value="Muda" ${data['Jenjang JF'] === 'Muda' ? 'selected' : ''}>Muda</option>
              <option value="Madya" ${data['Jenjang JF'] === 'Madya' ? 'selected' : ''}>Madya</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">TMT JF <span class="required">*</span></label>
            <input type="date" class="form-input" id="upd_tmtJF" value="${escapeHtml(data['TMT JF'] || '')}" required>
          </div>

          <div class="form-group">
            <label class="form-label">Masa Kerja Gol <span class="required">*</span></label>
            <input type="text" class="form-input" id="upd_masaKerjaGol" value="${escapeHtml(data['Masa Kerja Gol'] || '')}" placeholder="Contoh: 05 Tahun 03 Bulan" required>
          </div>

          <div class="form-group full-width">
            <label class="form-label">Satuan Kerja <span class="required">*</span></label>
            <select class="form-select" id="upd_satuanKerja" required>
              <option value="">Pilih Satuan Kerja</option>
            </select>
          </div>
        </div>

        <div class="form-group full-width" style="margin-top: 24px; padding-top: 20px; border-top: 2px dashed var(--border-color);">
          <label class="form-label"><i class="fas fa-file-upload"></i> Upload Ulang Dokumen Kelengkapan (Jika Ada Perbaikan) <span style="font-weight: normal; font-size: 0.85rem; color: var(--text-light);">*Opsional - Hanya upload jika ada dokumen yang perlu diperbaiki</span></label>

          <div class="file-upload-item">
            <label class="file-upload-label">1. Upload Foto Berwarna 4x6 cm</label>
            <div class="file-upload-wrapper">
              <div class="file-upload-area" id="upd_fileUploadAreaFoto" ondrop="handleDrop(event, 'upd_foto')" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" onclick="document.getElementById('upd_fileInputFoto').click()">
                <i class="fas fa-image"></i>
                <p>Klik atau drag file foto di sini</p>
                <span>Format: JPG/JPEG/PNG | Ukuran maksimal: 2MB</span>
              </div>
              <input type="file" id="upd_fileInputFoto" accept=".jpg,.jpeg,.png" style="display: none;" onchange="handleFileSelect(this, 'upd_foto')">
              <div class="file-name" id="upd_fileNameFoto" style="display: none;"></div>
            </div>
          </div>

          <div class="file-upload-item">
            <label class="file-upload-label">2. Upload SK Pangkat Terakhir Tahun 2022/2023</label>
            <div class="file-upload-wrapper">
              <div class="file-upload-area" id="upd_fileUploadAreaSKPangkat" ondrop="handleDrop(event, 'upd_skPangkat')" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" onclick="document.getElementById('upd_fileInputSKPangkat').click()">
                <i class="fas fa-file-pdf"></i>
                <p>Klik atau drag file PDF di sini</p>
                <span>Format: PDF | Ukuran maksimal: 1MB</span>
              </div>
              <input type="file" id="upd_fileInputSKPangkat" accept=".pdf" style="display: none;" onchange="handleFileSelect(this, 'upd_skPangkat')">
              <div class="file-name" id="upd_fileNameSKPangkat" style="display: none;"></div>
            </div>
          </div>

          <div class="file-upload-item">
            <label class="file-upload-label">3. Upload SK Jabatan Fungsional (Jabfung) Tahun 2022/2023</label>
            <div class="file-upload-wrapper">
              <div class="file-upload-area" id="upd_fileUploadAreaSKJabfung" ondrop="handleDrop(event, 'upd_skJabfung')" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" onclick="document.getElementById('upd_fileInputSKJabfung').click()">
                <i class="fas fa-file-pdf"></i>
                <p>Klik atau drag file PDF di sini</p>
                <span>Format: PDF | Ukuran maksimal: 1MB</span>
              </div>
              <input type="file" id="upd_fileInputSKJabfung" accept=".pdf" style="display: none;" onchange="handleFileSelect(this, 'upd_skJabfung')">
              <div class="file-name" id="upd_fileNameSKJabfung" style="display: none;"></div>
            </div>
          </div>

          <div class="file-upload-item">
            <label class="file-upload-label">4. Upload PAK Konvensional Periode Sampai Tahun 2022</label>
            <div class="file-upload-wrapper">
              <div class="file-upload-area" id="upd_fileUploadAreaPAK" ondrop="handleDrop(event, 'upd_pakKonvensional')" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" onclick="document.getElementById('upd_fileInputPAK').click()">
                <i class="fas fa-file-pdf"></i>
                <p>Klik atau drag file PDF di sini</p>
                <span>Format: PDF | Ukuran maksimal: 1MB</span>
              </div>
              <input type="file" id="upd_fileInputPAK" accept=".pdf" style="display: none;" onchange="handleFileSelect(this, 'upd_pakKonvensional')">
              <div class="file-name" id="upd_fileNamePAK" style="display: none;"></div>
            </div>
          </div>

          <small class="text-muted upload-info-text">
            <i class="fas fa-info-circle"></i> Upload ulang hanya dokumen yang perlu diperbaiki sesuai catatan admin. Kosongkan jika tidak ada perubahan.
          </small>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="displayStatusResult(currentEditData)">
            <i class="fas fa-arrow-left"></i> Kembali
          </button>
          <button type="submit" class="btn btn-primary">
            <i class="fas fa-save"></i> Simpan Perbaikan
          </button>
        </div>
      </form>
    </div>
  `;

  resultDiv.innerHTML = html;
  populateUpdateFormOptions(data);
}

/**
 * Populate options for dynamic select fields
 */
function populateUpdateFormOptions(existingData) {
  // Pangkat/Gol options
  const pangkatSelect = document.getElementById('upd_pangkatGol');
  if (pangkatSelect) {
    const pangkatOptions = [
      'Pembina - IV/a Ahli Madya',
      'Pembina - IV/a Ahli Muda',
      'Pembina Tk. I - IV/b Ahli Madya',
      'Pembina Tk. I - IV/b Ahli Muda',
      'Pembina Utama Muda - IV/c Ahli Madya',
      'Pembina Utama Madya - IV/d Ahli Utama',
      'Penata - III/c Ahli Muda',
      'Penata - III/c Ahli Pertama',
      'Penata - III/c Penyelia',
      'Penata Tk. I - III/d Ahli Madya',
      'Penata Tk. I - III/d Ahli Muda',
      'Penata Tk. I - III/d Penyelia',
      'Penata Muda - III/a Ahli Pertama',
      'Penata Muda - III/a Mahir',
      'Penata Muda Tk. I - III/b Ahli Muda',
      'Penata Muda Tk. I - III/b Ahli Pertama',
      'Penata Muda Tk. I - III/b Mahir',
      'Pengatur Muda - II/a Pemula',
      'Pengatur Muda Tk. I - II/b Terampil',
      'Pengatur - II/c Terampil',
      'Pengatur Tk. I - II/d Terampil',
    ];
    pangkatOptions.forEach((opt) => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      if (existingData['Pangkat/Gol'] === opt) option.selected = true;
      pangkatSelect.appendChild(option);
    });
  }

  // Jenis JF options
  const jfSelect = document.getElementById('upd_jenisJF');
  if (jfSelect) {
    const jfOptions = [
      'Administrator Kesehatan',
      'Apoteker',
      'Asisten Apoteker',
      'Asisten Penata Anestesi',
      'Bendahara',
      'Bidan',
      'Dokter',
      'Dokter Gigi',
      'Epidemiolog Kesehatan',
      'Fisikawan Medis',
      'Fisioterapis',
      'Nutrisionis',
      'Okupasi Terapis',
      'Pembimbing Kesehatan Kerja',
      'Penata Anestesi',
      'Perawat',
      'Perekam Medis',
      'Pranata Laboratorium Kesehatan',
      'Promosi Kesehatan dan Ilmu Perilaku',
      'Psikologi Klinis',
      'Radiografer',
      'Refraksionis Optisien / Optometris',
      'Teknisi Elektromedis',
      'Teknisi Gigi',
      'Teknisi Transfusi Darah',
      'Tenaga Sanitasi Lingkungan',
      'Terapis Gigi dan Mulut',
      'Terapis Wicara',
    ];
    jfOptions.forEach((opt) => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      if (existingData['Jenis JF'] === opt) option.selected = true;
      jfSelect.appendChild(option);
    });
  }

  // Satuan Kerja options
  const satkerSelect = document.getElementById('upd_satuanKerja');
  if (satkerSelect) {
    const satkerOptions = [
      'Dinas Kesehatan',
      'UPTD Puskesmas Badak Baru',
      'UPTD Puskesmas Batuah',
      'UPTD Puskesmas Bunga Jadi',
      'UPTD Puskesmas Handil Baru',
      'UPTD Puskesmas Jonggon Jaya',
      'UPTD Puskesmas Kahala',
      'UPTD Puskesmas Kembang Janggut',
      'UPTD Puskesmas Kota Bangun',
      'UPTD Puskesmas Loa Duri',
      'UPTD Puskesmas Loa Ipuh',
      'UPTD Puskesmas Loa Janan',
      'UPTD Puskesmas Loa Kulu',
      'UPTD Puskesmas Mangkurawang',
      'UPTD Puskesmas Marangkayu',
      'UPTD Puskesmas Muara Badak',
      'UPTD Puskesmas Muara Jawa',
      'UPTD Puskesmas Muara Kaman',
      'UPTD Puskesmas Muara Muntai',
      'UPTD Puskesmas Muara Wis',
      'UPTD Puskesmas Perangat',
      'UPTD Puskesmas Rapak Mahang',
      'UPTD Puskesmas Rimba Ayu',
      'UPTD Puskesmas Ritan Baru',
      'UPTD Puskesmas Samboja',
      'UPTD Puskesmas Sangasanga',
      'UPTD Puskesmas Sebulu I',
      'UPTD Puskesmas Sebulu II',
      'UPTD Puskesmas Separi III',
      'UPTD Puskesmas Sungai Merdeka',
      'UPTD Puskesmas Sungai Meriam',
      'UPTD Puskesmas Tabang',
      'UPTD Puskesmas Teluk Dalam',
      'RSUD Aji Muhammad Parikesit',
      'RSUD Aji Batara Agung Dewa Sakti',
      'RSUD Dayaku Raja',
      'UPT Labkesda dan Elektromedis',
      'UPT Gudang Farmasi Klinik',
      'RSUD Aji Muhammad Idris',
    ];
    satkerOptions.forEach((opt) => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      if (existingData['Satuan Kerja'] === opt) option.selected = true;
      satkerSelect.appendChild(option);
    });
  }
}

/**
 * Handle update submit
 */
async function handleUpdateSubmit(e) {
  if (e) e.preventDefault();

  const confirmed = await confirmDialog(
    'APAKAH DATA PERBAIKAN SUDAH BENAR?\n\n' +
      'Pastikan semua data yang Anda perbaiki sudah sesuai.\n' +
      'Data lama akan diganti dengan data baru ini.\n\n' +
      'Klik OK untuk menyimpan, atau Cancel untuk memeriksa kembali.'
  );

  if (!confirmed) {
    toastInfo('Silakan periksa kembali data Anda.');
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading-spinner"></span> Menyimpan...';
  }

  try {
    const nip = document.getElementById('upd_nip').value;

    const updatedData = {
      email: document.getElementById('upd_email').value,
      noHP: document.getElementById('upd_noHP').value,
      nama: document.getElementById('upd_nama').value.toUpperCase(),
      nip: nip,
      noKarpeg: document.getElementById('upd_noKarpeg').value,
      tempatLahir: document.getElementById('upd_tempatLahir').value,
      tanggalLahir: document.getElementById('upd_tanggalLahir').value,
      pendidikan: document.getElementById('upd_pendidikan').value,
      jenisKelamin: document.getElementById('upd_jenisKelamin').value,
      pangkatGol: document.getElementById('upd_pangkatGol').value,
      tmtPangkat: document.getElementById('upd_tmtPangkat').value,
      jenisJF: document.getElementById('upd_jenisJF').value,
      jenjangJF: document.getElementById('upd_jenjangJF').value,
      tmtJF: document.getElementById('upd_tmtJF').value,
      masaKerjaGol: document.getElementById('upd_masaKerjaGol').value,
      satuanKerja: document.getElementById('upd_satuanKerja').value,
    };

    // Update via Supabase
    const result = await updatePengajuan(currentEditId, updatedData);
    currentEditData = result;

    // Upload ulang dokumen yang dipilih
    const updateFileTypes = ['upd_foto', 'upd_skPangkat', 'upd_skJabfung', 'upd_pakKonvensional'];
    let uploadedCount = 0;

    for (const fileType of updateFileTypes) {
      if (selectedUpdateFiles[fileType]) {
        const actualType = fileType.substring(4);
        const config = fileConfig[actualType];
        try {
          toastInfo(`Mengupload ${config.name}...`);
          const url = await uploadDocument(selectedUpdateFiles[fileType], config.storagePath, nip);
          await updateDocumentURL(currentEditId, config.dbField, url);
          uploadedCount++;
        } catch (uploadErr) {
          console.error('[Update Upload] Error:', uploadErr);
          toastWarning(`Gagal upload ${config.name}: ${uploadErr.message}`);
        }
      }
    }

    if (uploadedCount > 0) {
      toastSuccess(`${uploadedCount} dokumen berhasil diupload!`);
    }

    // Update local data
    const index = allData.findIndex((row) => row._id === currentEditId);
    if (index !== -1) {
      allData[index] = result;
    }

    // Reset update files storage
    selectedUpdateFiles = {
      upd_foto: null,
      upd_skPangkat: null,
      upd_skJabfung: null,
      upd_pakKonvensional: null,
    };

    toastSuccess('Data perbaikan berhasil disimpan! Status dikembalikan ke Menunggu.');

    setTimeout(() => displayStatusResult(currentEditData), 1500);
  } catch (error) {
    console.error('[Update Submit] Error:', error);
    toastError('Error: ' + (error.message || 'unknown'));
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-save"></i> Simpan Perbaikan';
    }
  }
}
