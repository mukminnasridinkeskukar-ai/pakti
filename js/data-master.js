/* ============================================
 * PAKTI - Data Master Management (Sheet DATA)
 * ============================================
 * Tabel ini adalah sumber data untuk Pembuatan PAK Integrasi.
 * Admin dapat input/edit/hapus data master pegawai + AK.
 *
 * Tabel: data_master (di Supabase)
 * ============================================ */

let dataMasterAll = [];
let dataMasterFiltered = [];
let dataMasterCurrentPage = 1;
let dataMasterEditId = null;
let dataMasterDeleteId = null;

/**
 * Load data master dari Supabase
 */
async function loadDataMaster() {
  if (!isSupabaseReady()) {
    toastError('Supabase belum dikonfigurasi');
    return;
  }

  const tbody = document.getElementById('dataMasterTableBody');
  if (tbody) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align: center; padding: 30px;"><span class="loading-spinner"></span> Memuat data...</td></tr>';
  }

  try {
    dataMasterAll = await fetchAllDataMaster();
    dataMasterFiltered = [...dataMasterAll];
    renderDataMasterTable();
    updateDataMasterStats();
    toastSuccess(`Data Master dimuat: ${dataMasterAll.length} record`);
  } catch (error) {
    console.error('[Data Master] Load error:', error);
    toastError('Gagal memuat: ' + (error.message || ''));
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--danger);">
        <i class="fas fa-exclamation-triangle" style="font-size: 32px;"></i><br><br>
        Gagal memuat data: ${escapeHtml(error.message || '')}</td></tr>`;
    }
  }
}

/**
 * Render tabel data master
 */
function renderDataMasterTable() {
  dataMasterCurrentPage = 1;
  renderDataMasterPage();

  // Pagination
  const totalPages = Math.ceil(dataMasterFiltered.length / ITEMS_PER_PAGE);
  const paginationEl = document.getElementById('dataMasterPagination');
  const infoEl = document.getElementById('dataMasterPaginationInfo');

  if (infoEl) {
    const start = dataMasterFiltered.length > 0 ? 1 : 0;
    const end = Math.min(ITEMS_PER_PAGE, dataMasterFiltered.length);
    infoEl.textContent = `Menampilkan ${start} - ${end} dari ${dataMasterFiltered.length} data`;
  }

  if (paginationEl) {
    let buttons = `<button class="pagination-btn" disabled><i class="fas fa-chevron-left"></i></button>`;
    for (let i = 1; i <= totalPages; i++) {
      buttons += `<button class="pagination-btn ${i === 1 ? 'active' : ''}" onclick="changeDataMasterPage(${i})">${i}</button>`;
    }
    buttons += `<button class="pagination-btn" ${totalPages <= 1 ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
    paginationEl.innerHTML = buttons;
  }
}

function renderDataMasterPage() {
  const start = (dataMasterCurrentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageData = dataMasterFiltered.slice(start, end);

  const tbody = document.getElementById('dataMasterTableBody');
  if (!tbody) return;

  if (pageData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px;">
      <i class="fas fa-inbox" style="font-size: 40px; color: var(--text-light); margin-bottom: 12px;"></i>
      <p>Tidak ada data</p>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = pageData
    .map((row, index) => {
      const rowIndex = start + index + 1;
      const totalAK =
        (row.akLamaPendidikan || 0) +
        (row.akBaruPendidikan || 0) +
        (row.akLamaTugasPokok || 0) +
        (row.akBaruTugasPokok || 0) +
        (row.akLamaPengembangan || 0) +
        (row.akBaruPengembangan || 0) +
        (row.akLamaPenunjang || 0) +
        (row.akBaruPenunjang || 0);

      return `
        <tr>
          <td>${rowIndex}</td>
          <td><strong>${escapeHtml(row['Nama Lengkap dengan Gelar'] || '-')}</strong></td>
          <td>${escapeHtml(row['NIP'] || '-')}</td>
          <td>${escapeHtml(row['Satuan Kerja'] || '-')}</td>
          <td><strong>${totalAK.toFixed(2)}</strong></td>
          <td>
            <div style="display: flex; gap: 4px;">
              <button class="btn btn-success btn-sm btn-icon" onclick="editDataMaster('${escapeHtml(String(row._id || ''))}')" title="Edit">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-danger btn-sm btn-icon" onclick="openDeleteDataMasterModal('${escapeHtml(String(row._id || ''))}')" title="Hapus">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

function changeDataMasterPage(page) {
  dataMasterCurrentPage = page;
  renderDataMasterPage();

  // Update active button
  document.querySelectorAll('#dataMasterPagination .pagination-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === page);
  });
}

function updateDataMasterStats() {
  const total = dataMasterAll.length;
  const totalAk = dataMasterAll.reduce((sum, r) => {
    return (
      sum +
      (r.akLamaPendidikan || 0) +
      (r.akBaruPendidikan || 0) +
      (r.akLamaTugasPokok || 0) +
      (r.akBaruTugasPokok || 0) +
      (r.akLamaPengembangan || 0) +
      (r.akBaruPengembangan || 0) +
      (r.akLamaPenunjang || 0) +
      (r.akBaruPenunjang || 0)
    );
  }, 0);

  const totalEl = document.getElementById('statDataMasterTotal');
  const akEl = document.getElementById('statDataMasterAK');
  if (totalEl) totalEl.textContent = total;
  if (akEl) akEl.textContent = totalAk.toFixed(2);
}

/**
 * Filter data master
 */
function filterDataMaster() {
  const searchInput = document.getElementById('dataMasterSearch');
  const search = searchInput ? searchInput.value.toLowerCase() : '';

  dataMasterFiltered = dataMasterAll.filter((row) => {
    const nama = (row['Nama Lengkap dengan Gelar'] || '').toLowerCase();
    const nip = (row['NIP'] || '').toLowerCase();
    const satker = (row['Satuan Kerja'] || '').toLowerCase();
    return !search || nama.includes(search) || nip.includes(search) || satker.includes(search);
  });

  renderDataMasterTable();
}

/**
 * Buka modal tambah/edit data master
 */
function openDataMasterModal(editId) {
  dataMasterEditId = editId || null;
  let data = null;

  if (editId) {
    data = dataMasterAll.find((r) => String(r._id) === String(editId));
    if (!data) {
      toastError('Data tidak ditemukan');
      return;
    }
  }

  // Build modal HTML
  let modal = document.getElementById('dataMasterModal');
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'dataMasterModal';
  modal.className = 'modal-overlay active';
  modal.style.cssText = 'display: flex;';

  const setVal = (val) => (val != null ? escapeHtml(String(val)) : '');

  modal.innerHTML = `
    <div class="modal" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
      <div class="modal-header">
        <h3 class="modal-title">
          <i class="fas fa-database"></i> ${editId ? 'Edit' : 'Tambah'} Data Master (Sheet DATA)
        </h3>
        <button class="modal-close" onclick="closeDataMasterModal()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <form id="dataMasterForm" onsubmit="submitDataMasterForm(event)">
          <input type="hidden" id="dmEditId" value="${setVal(editId)}">

          <h4 style="color: var(--government-blue); margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid var(--primary-blue);">
            <i class="fas fa-user"></i> Keterangan Perorangan
          </h4>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">NIP <span class="required">*</span></label>
              <input type="text" class="form-input" id="dmNip" maxlength="18" value="${setVal(data?.NIP)}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Nama Lengkap <span class="required">*</span></label>
              <input type="text" class="form-input" id="dmNama" value="${setVal(data?.['Nama Lengkap dengan Gelar'])}" required>
            </div>
            <div class="form-group">
              <label class="form-label">No. Karpeg</label>
              <input type="text" class="form-input" id="dmKarpeg" value="${setVal(data?.['No Karpeg'])}">
            </div>
            <div class="form-group">
              <label class="form-label">Tempat Lahir</label>
              <input type="text" class="form-input" id="dmTempatLahir" value="${setVal(data?._raw?.tempat_lahir)}">
            </div>
            <div class="form-group">
              <label class="form-label">Tanggal Lahir</label>
              <input type="date" class="form-input" id="dmTanggalLahir" value="${setVal(data?._raw?.tanggal_lahir)}">
            </div>
            <div class="form-group">
              <label class="form-label">Pendidikan</label>
              <select class="form-select" id="dmPendidikan">
                <option value="">Pilih</option>
                ${['D3','D4','S1','Profesi','S2','Spesialis','Sub Spesialis','S3'].map(o => `<option value="${o}" ${data?.Pendidikan === o ? 'selected' : ''}>${o}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Jenis Kelamin</label>
              <select class="form-select" id="dmJenisKelamin">
                <option value="">Pilih</option>
                <option value="Laki-laki" ${data?.['Jenis Kelamin'] === 'Laki-laki' ? 'selected' : ''}>Laki-laki</option>
                <option value="Perempuan" ${data?.['Jenis Kelamin'] === 'Perempuan' ? 'selected' : ''}>Perempuan</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Pangkat</label>
              <input type="text" class="form-input" id="dmPangkat" value="${setVal(data?._raw?.pangkat)}" placeholder="Contoh: Penata Muda">
            </div>
            <div class="form-group">
              <label class="form-label">Golongan</label>
              <input type="text" class="form-input" id="dmGolongan" value="${setVal(data?._raw?.golongan)}" placeholder="Contoh: III/a Ahli Pertama">
            </div>
            <div class="form-group">
              <label class="form-label">TMT Pangkat</label>
              <input type="date" class="form-input" id="dmTmtPangkat" value="${setVal(data?._raw?.tmt_pangkat)}">
            </div>
            <div class="form-group">
              <label class="form-label">Jabatan Fungsional</label>
              <input type="text" class="form-input" id="dmJabatanJf" value="${setVal(data?._raw?.jabatan_jf)}" placeholder="Contoh: Perawat">
            </div>
            <div class="form-group">
              <label class="form-label">TMT JF</label>
              <input type="date" class="form-input" id="dmTmtJf" value="${setVal(data?._raw?.tmt_jf)}">
            </div>
            <div class="form-group">
              <label class="form-label">Masa Kerja Gol</label>
              <input type="text" class="form-input" id="dmMasaKerja" value="${setVal(data?._raw?.masa_kerja_gol)}" placeholder="Contoh: 05 Tahun 03 Bulan">
            </div>
            <div class="form-group">
              <label class="form-label">Unit Kerja</label>
              <input type="text" class="form-input" id="dmUnitKerja" value="${setVal(data?._raw?.unit_kerja)}" placeholder="Contoh: UPTD Puskesmas Samboja">
            </div>
            <div class="form-group full-width">
              <label class="form-label">Instansi</label>
              <input type="text" class="form-input" id="dmInstansi" value="${setVal(data?._raw?.instansi || 'Dinas Kesehatan Kab. Kutai Kartanegara')}">
            </div>
          </div>

          <h4 style="color: var(--government-blue); margin: 20px 0 12px; padding-bottom: 8px; border-bottom: 2px solid var(--primary-blue);">
            <i class="fas fa-calculator"></i> Angka Kredit Konvensional
          </h4>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">AK Lama - Pendidikan</label>
              <input type="number" step="0.01" class="form-input" id="dmAkLamaPendidikan" value="${setVal(data?.akLamaPendidikan)}">
            </div>
            <div class="form-group">
              <label class="form-label">AK Baru - Pendidikan</label>
              <input type="number" step="0.01" class="form-input" id="dmAkBaruPendidikan" value="${setVal(data?.akBaruPendidikan)}">
            </div>
            <div class="form-group">
              <label class="form-label">AK Lama - Tugas Pokok</label>
              <input type="number" step="0.01" class="form-input" id="dmAkLamaTugasPokok" value="${setVal(data?.akLamaTugasPokok)}">
            </div>
            <div class="form-group">
              <label class="form-label">AK Baru - Tugas Pokok</label>
              <input type="number" step="0.01" class="form-input" id="dmAkBaruTugasPokok" value="${setVal(data?.akBaruTugasPokok)}">
            </div>
            <div class="form-group">
              <label class="form-label">AK Lama - Pengembangan Profesi</label>
              <input type="number" step="0.01" class="form-input" id="dmAkLamaPengembangan" value="${setVal(data?.akLamaPengembangan)}">
            </div>
            <div class="form-group">
              <label class="form-label">AK Baru - Pengembangan Profesi</label>
              <input type="number" step="0.01" class="form-input" id="dmAkBaruPengembangan" value="${setVal(data?.akBaruPengembangan)}">
            </div>
            <div class="form-group">
              <label class="form-label">AK Lama - Penunjang</label>
              <input type="number" step="0.01" class="form-input" id="dmAkLamaPenunjang" value="${setVal(data?.akLamaPenunjang)}">
            </div>
            <div class="form-group">
              <label class="form-label">AK Baru - Penunjang</label>
              <input type="number" step="0.01" class="form-input" id="dmAkBaruPenunjang" value="${setVal(data?.akBaruPenunjang)}">
            </div>
          </div>

          <h4 style="color: var(--government-blue); margin: 20px 0 12px; padding-bottom: 8px; border-bottom: 2px solid var(--primary-blue);">
            <i class="fas fa-bullseye"></i> Kebutuhan AK & Nilai Dasar
          </h4>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">AK Minimal Kenaikan Pangkat</label>
              <input type="number" step="0.01" class="form-input" id="dmAkMinimalPangkat" value="${setVal(data?.akMinimalPangkat)}">
            </div>
            <div class="form-group">
              <label class="form-label">AK Minimal Kenaikan Jenjang</label>
              <input type="number" step="0.01" class="form-input" id="dmAkMinimalJenjang" value="${setVal(data?.akMinimalJenjang)}">
            </div>
            <div class="form-group">
              <label class="form-label">AK Minimal Pengembangan Profesi</label>
              <input type="number" step="0.01" class="form-input" id="dmAkMinimalPengembangan" value="${setVal(data?.akMinimalPengembangan)}">
            </div>
            <div class="form-group">
              <label class="form-label">Nilai Dasar (untuk Integrasi)</label>
              <input type="number" step="0.01" class="form-input" id="dmNilaiDasar" value="${setVal(data?.nilaiDasar)}">
            </div>
          </div>

          <h4 style="color: var(--government-blue); margin: 20px 0 12px; padding-bottom: 8px; border-bottom: 2px solid var(--primary-blue);">
            <i class="fas fa-stamp"></i> Penetapan & Pejabat Penilai
          </h4>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Periode Penilaian</label>
              <input type="text" class="form-input" id="dmPeriodePenilaian" value="${setVal(data?.periodePenilaian)}" placeholder="Contoh: 2024 - 2025">
            </div>
            <div class="form-group">
              <label class="form-label">Tanggal Penetapan</label>
              <input type="date" class="form-input" id="dmTanggalPenetapan" value="${setVal(data?.tanggalPenetapan)}">
            </div>
            <div class="form-group">
              <label class="form-label">Lokasi Penetapan</label>
              <input type="text" class="form-input" id="dmLokasiPenetapan" value="${setVal(data?.lokasiPenetapan || 'Tenggarong')}">
            </div>
            <div class="form-group">
              <label class="form-label">Nama Pejabat Penilai</label>
              <input type="text" class="form-input" id="dmNamaPejabat" value="${setVal(data?.namaPejabat)}">
            </div>
            <div class="form-group">
              <label class="form-label">NIP Pejabat Penilai</label>
              <input type="text" class="form-input" id="dmNipPejabat" value="${setVal(data?.nipPejabat)}" maxlength="18">
            </div>
            <div class="form-group full-width">
              <label class="form-label">Rekomendasi</label>
              <textarea class="form-input" id="dmRekomendasi" rows="2">${setVal(data?.rekomendasi)}</textarea>
            </div>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-primary" onclick="submitDataMasterForm(event)">
          <i class="fas fa-save"></i> Simpan
        </button>
        <button type="button" class="btn btn-warning" onclick="closeDataMasterModal()">
          <i class="fas fa-times"></i> Batal
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeDataMasterModal();
  });
}

function closeDataMasterModal() {
  const modal = document.getElementById('dataMasterModal');
  if (modal) modal.remove();
  dataMasterEditId = null;
}

/**
 * Submit form data master
 */
async function submitDataMasterForm(e) {
  if (e) e.preventDefault();

  const getVal = (id) => document.getElementById(id)?.value || '';
  const getNum = (id) => {
    const v = getVal(id);
    if (!v) return 0;
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  };

  const formData = {
    nip: getVal('dmNip'),
    nama: getVal('dmNama').toUpperCase(),
    noKarpeg: getVal('dmKarpeg'),
    tempatLahir: getVal('dmTempatLahir'),
    tanggalLahir: getVal('dmTanggalLahir'),
    pendidikan: getVal('dmPendidikan'),
    jenisKelamin: getVal('dmJenisKelamin'),
    pangkat: getVal('dmPangkat'),
    golongan: getVal('dmGolongan'),
    tmtPangkat: getVal('dmTmtPangkat'),
    jabatanJf: getVal('dmJabatanJf'),
    tmtJf: getVal('dmTmtJf'),
    masaKerjaGol: getVal('dmMasaKerja'),
    unitKerja: getVal('dmUnitKerja'),
    instansi: getVal('dmInstansi'),

    akLamaPendidikan: getNum('dmAkLamaPendidikan'),
    akLamaTugasPokok: getNum('dmAkLamaTugasPokok'),
    akLamaPengembangan: getNum('dmAkLamaPengembangan'),
    akLamaPenunjang: getNum('dmAkLamaPenunjang'),

    akBaruPendidikan: getNum('dmAkBaruPendidikan'),
    akBaruTugasPokok: getNum('dmAkBaruTugasPokok'),
    akBaruPengembangan: getNum('dmAkBaruPengembangan'),
    akBaruPenunjang: getNum('dmAkBaruPenunjang'),

    akMinimalPangkat: getNum('dmAkMinimalPangkat'),
    akMinimalJenjang: getNum('dmAkMinimalJenjang'),
    akMinimalPengembangan: getNum('dmAkMinimalPengembangan'),

    nilaiDasar: getNum('dmNilaiDasar'),

    periodePenilaian: getVal('dmPeriodePenilaian'),
    tanggalPenetapan: getVal('dmTanggalPenetapan'),
    lokasiPenetapan: getVal('dmLokasiPenetapan'),
    namaPejabat: getVal('dmNamaPejabat'),
    nipPejabat: getVal('dmNipPejabat'),
    rekomendasi: getVal('dmRekomendasi'),
  };

  if (!formData.nip || !formData.nama) {
    toastError('NIP dan Nama wajib diisi!');
    return;
  }

  if (!/^\d{18}$/.test(formData.nip)) {
    toastError('NIP harus 18 digit angka!');
    return;
  }

  const btn = document.querySelector('#dataMasterModal .btn-primary');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Menyimpan...';
  }

  try {
    if (dataMasterEditId) {
      await updateDataMaster(dataMasterEditId, formData);
      toastSuccess('Data master berhasil diupdate!');
    } else {
      await insertDataMaster(formData);
      toastSuccess('Data master berhasil ditambahkan!');
    }

    closeDataMasterModal();
    await loadDataMaster();
  } catch (error) {
    console.error('[Data Master] Submit error:', error);
    toastError('Gagal menyimpan: ' + (error.message || ''));
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Simpan';
    }
  }
}

function editDataMaster(id) {
  if (!id) {
    toastError('ID tidak valid');
    return;
  }
  openDataMasterModal(id);
}

function openDeleteDataMasterModal(id) {
  if (!id) {
    toastError('ID tidak valid');
    return;
  }
  dataMasterDeleteId = id;

  let modal = document.getElementById('deleteDataMasterModal');
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'deleteDataMasterModal';
  modal.className = 'modal-overlay active';
  modal.style.cssText = 'display: flex; max-width: 400px; margin: auto;';

  modal.innerHTML = `
    <div class="modal" style="max-width: 400px;">
      <div class="modal-body">
        <div class="confirm-dialog">
          <div class="confirm-icon danger"><i class="fas fa-exclamation-triangle"></i></div>
          <h3 style="margin-bottom: 12px;">Hapus Data Master?</h3>
          <p class="confirm-text">Apakah Anda yakin ingin menghapus data ini?</p>
          <p class="confirm-subtext">Data master yang dihapus tidak dapat dikembalikan.</p>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-danger" onclick="confirmDeleteDataMaster()">
          <i class="fas fa-trash"></i> Hapus
        </button>
        <button class="btn btn-warning" onclick="closeDeleteDataMasterModal()">
          <i class="fas fa-times"></i> Batal
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeDeleteDataMasterModal();
  });
}

function closeDeleteDataMasterModal() {
  const modal = document.getElementById('deleteDataMasterModal');
  if (modal) modal.remove();
  dataMasterDeleteId = null;
}

async function confirmDeleteDataMaster() {
  if (!dataMasterDeleteId) return;

  const btn = document.querySelector('#deleteDataMasterModal .btn-danger');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Menghapus...';
  }

  try {
    await deleteDataMaster(dataMasterDeleteId);
    toastSuccess('Data master berhasil dihapus!');
    closeDeleteDataMasterModal();
    await loadDataMaster();
  } catch (error) {
    console.error('[Data Master] Delete error:', error);
    toastError('Gagal menghapus: ' + (error.message || ''));
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-trash"></i> Hapus';
    }
  }
}
