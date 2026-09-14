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

/* ============================================
 * BULK UPLOAD CSV - Data Master
 * ============================================
 * Upload massal data master via CSV
 * Reuse parseCsvRFC4180 & escapeCsvValue dari bulk-upload.js
 *
 * Schema data_master (36 kolom):
 * - Wajib: nip, nama
 * - Opsional: 34 field lainnya
 * ============================================ */

const DM_CSV_REQUIRED_FIELDS = ['nip', 'nama'];
const DM_CSV_ALL_FIELDS = [
  'nip', 'nama', 'no_karpeg', 'tempat_lahir', 'tanggal_lahir', 'pendidikan', 'jenis_kelamin',
  'pangkat', 'golongan', 'tmt_pangkat', 'jabatan_jf', 'tmt_jf', 'masa_kerja_gol', 'unit_kerja', 'instansi',
  'ak_lama_pendidikan', 'ak_lama_tugas_pokok', 'ak_lama_pengembangan', 'ak_lama_penunjang',
  'ak_baru_pendidikan', 'ak_baru_tugas_pokok', 'ak_baru_pengembangan', 'ak_baru_penunjang',
  'ak_minimal_pangkat', 'ak_minimal_jenjang', 'ak_minimal_pengembangan',
  'nilai_das',
  'periode_penilaian', 'tahun_penilaian', 'bulan_penilaian', 'predikat_kinerja',
  'tanggal_penetapan', 'lokasi_penetapan', 'nama_pejabat', 'nip_pejabat', 'rekomendasi',
];

let dmCsvParsedRows = [];
let dmCsvUploadInProgress = false;

/**
 * Buka modal upload massal CSV untuk Data Master
 */
function openDataMasterBulkUploadModal() {
  let modal = document.getElementById('dmBulkUploadModal');
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'dmBulkUploadModal';
  modal.className = 'modal-overlay active';
  modal.style.cssText = 'display: flex;';

  modal.innerHTML = `
    <div class="modal" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
      <div class="modal-header">
        <h3 class="modal-title"><i class="fas fa-file-csv"></i> Upload Massal CSV — Data Master</h3>
        <button class="modal-close" onclick="closeDataMasterBulkUploadModal()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">

        <!-- Download Template -->
        <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid var(--primary-blue);">
          <h4 style="color: var(--government-blue); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-download"></i> Download Template CSV
          </h4>
          <p style="color: var(--text-medium); font-size: 0.85rem; margin-bottom: 12px;">
            Unduh template CSV (sudah berisi 3 contoh data valid), isi data Anda, lalu upload kembali.
          </p>
          <button class="btn btn-primary btn-sm" onclick="downloadDataMasterCsvTemplate()">
            <i class="fas fa-file-download"></i> Download Template
          </button>
        </div>

        <!-- Info Format -->
        <div style="background: #fffbeb; padding: 12px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid var(--warning); font-size: 0.82rem;">
          <strong><i class="fas fa-info-circle"></i> Field Wajib (2):</strong> nip (18 digit angka), nama<br>
          <strong>Field Opsional (34):</strong> no_karpeg, tempat_lahir, tanggal_lahir (YYYY-MM-DD), pendidikan, jenis_kelamin (Laki-laki/Perempuan), pangkat, golongan, tmt_pangkat (YYYY-MM-DD), jabatan_jf, tmt_jf (YYYY-MM-DD), masa_kerja_gol, unit_kerja, instansi, ak_lama_* (numeric), ak_baru_* (numeric), ak_minimal_* (numeric), nilai_das (numeric), periode_penilaian, tahun_penilaian (integer), bulan_penilaian (integer), predikat_kinerja, tanggal_penetapan (YYYY-MM-DD), lokasi_penetapan, nama_pejabat, nip_pejabat, rekomendasi<br>
          <strong style="color: var(--danger);">Penting:</strong> Jika nilai mengandung koma (contoh: "Ns. Mukmin, S.Kep"), apit dengan tanda kutip ganda ("...").
        </div>

        <!-- Upload File -->
        <div class="file-upload-item" style="margin-bottom: 20px;">
          <label class="file-upload-label">Upload File CSV</label>
          <div class="file-upload-wrapper">
            <div class="file-upload-area" id="dmBulkUploadArea"
                 ondrop="handleDmCsvDrop(event)"
                 ondragover="handleDmCsvDragOver(event)"
                 ondragleave="handleDmCsvDragLeave(event)"
                 onclick="document.getElementById('dmBulkCsvInput').click()">
              <i class="fas fa-file-csv"></i>
              <p>Klik atau drag file CSV di sini</p>
              <span>Format: .csv | Maksimal: 5MB</span>
            </div>
            <input type="file" id="dmBulkCsvInput" accept=".csv,text/csv" style="display: none;"
                   onchange="handleDmCsvFileSelect(this)">
            <div class="file-name" id="dmBulkCsvFileName" style="display: none;"></div>
          </div>
        </div>

        <!-- Preview -->
        <div id="dmCsvPreviewSection" style="display: none; margin-bottom: 20px;">
          <h4 style="color: var(--text-dark); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
            <span><i class="fas fa-table"></i> Preview Data</span>
            <span id="dmCsvPreviewCount" style="font-size: 0.85rem; color: var(--text-medium); font-weight: normal;"></span>
          </h4>
          <div id="dmCsvValidationSummary" style="margin-bottom: 12px;"></div>
          <div style="max-height: 300px; overflow: auto; border: 1px solid var(--border-color); border-radius: 8px;">
            <table style="min-width: 100%; font-size: 0.78rem;">
              <thead id="dmCsvPreviewHead"></thead>
              <tbody id="dmCsvPreviewBody"></tbody>
            </table>
          </div>
        </div>

        <!-- Progress -->
        <div id="dmCsvUploadProgress" style="display: none; margin-bottom: 20px;">
          <h4 style="color: var(--text-dark); margin-bottom: 12px;">
            <i class="fas fa-spinner fa-spin"></i> Sedang mengupload...
          </h4>
          <div style="background: var(--light-bg); border-radius: 8px; padding: 12px; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.85rem;">
              <span id="dmCsvProgressText">Memproses...</span>
              <span id="dmCsvProgressPercent">0%</span>
            </div>
            <div style="width: 100%; height: 8px; background: var(--border-color); border-radius: 4px; overflow: hidden;">
              <div id="dmCsvProgressBar" style="height: 100%; background: var(--primary-blue); width: 0%; transition: width 0.3s;"></div>
            </div>
          </div>
          <div id="dmCsvUploadResults" style="font-size: 0.85rem;"></div>
        </div>

      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" id="dmCsvProcessBtn" onclick="processDataMasterBulkUpload()" disabled>
          <i class="fas fa-upload"></i> Upload ke Database
        </button>
        <button class="btn btn-warning" onclick="closeDataMasterBulkUploadModal()">
          <i class="fas fa-times"></i> Tutup
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeDataMasterBulkUploadModal();
  });

  dmCsvParsedRows = [];
}

function closeDataMasterBulkUploadModal() {
  const modal = document.getElementById('dmBulkUploadModal');
  if (modal) modal.remove();
  dmCsvParsedRows = [];
}

/**
 * Download template CSV untuk Data Master
 * Template berisi 3 contoh data valid
 */
function downloadDataMasterCsvTemplate() {
  const headers = DM_CSV_ALL_FIELDS.join(',');

  // Sample data - SEMUA valid, nama di-quote karena ada koma
  const sampleRows = [
    [
      '197001012020011001',
      'Ns. Mukmin Nasri, S.Kep',
      'PEP-2024-001',
      'Tenggarong',
      '1970-01-01',
      'S1',
      'Laki-laki',
      'Penata Muda',
      'III/a Ahli Pertama',
      '2020-01-01',
      'Perawat',
      '2020-07-01',
      '05 Tahun 03 Bulan',
      'UPTD Puskesmas Samboja',
      'Dinas Kesehatan Kab. Kutai Kartanegara',
      '0', '12.5', '3.75', '1.25',
      '0', '8.5', '2.25', '0.75',
      '100', '200', '25',
      '15.5',
      '2024 - 2025', '2024', '12', 'Baik',
      '2025-01-15', 'Tenggarong',
      'dr. Martina Yulianti, Sp.PD',
      '197107122000122002',
      'Memenuhi syarat untuk kenaikan pangkat'
    ],
    [
      '198005122010012002',
      'dr. Budi Santoso, Sp.A',
      'PEP-2024-002',
      'Samarinda',
      '1980-05-12',
      'Spesialis',
      'Laki-laki',
      'Penata',
      'III/c Ahli Muda',
      '2018-01-01',
      'Dokter',
      '2018-07-01',
      '07 Tahun 02 Bulan',
      'RSUD Aji Muhammad Parikesit',
      'Dinas Kesehatan Kab. Kutai Kartanegara',
      '0', '15', '4.5', '1.5',
      '0', '10', '3', '1',
      '100', '200', '25',
      '20',
      '2024 - 2025', '2024', '12', 'Sangat Baik',
      '2025-01-15', 'Tenggarong',
      'dr. Martina Yulianti, Sp.PD',
      '197107122000122002',
      'AK mencukupi untuk kenaikan jenjang'
    ],
    [
      '199003152015032003',
      'Siti Aminah, A.Md.Keb',
      'PEP-2024-003',
      'Balikpapan',
      '1990-03-15',
      'D3',
      'Perempuan',
      'Penata Muda',
      'III/a Ahli Pertama',
      '2019-01-01',
      'Bidan',
      '2019-07-01',
      '06 Tahun 00 Bulan',
      'UPTD Puskesmas Loa Janan',
      'Dinas Kesehatan Kab. Kutai Kartanegara',
      '0', '10', '2.5', '0.5',
      '0', '8', '2', '0.5',
      '100', '200', '25',
      '12.5',
      '2024 - 2025', '2024', '12', 'Baik',
      '2025-01-15', 'Tenggarong',
      'dr. Martina Yulianti, Sp.PD',
      '197107122000122002',
      'Perlu penambahan AK pengembangan profesi'
    ],
  ];

  // escapeCsvValue sudah ada di bulk-upload.js
  const escapeFn = (typeof escapeCsvValue === 'function') ? escapeCsvValue : function (val) {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  let csv = headers + '\n';
  sampleRows.forEach((row) => {
    csv += row.map(escapeFn).join(',') + '\n';
  });

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'template_data_master.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  toastSuccess('Template CSV Data Master berhasil diunduh!');
}

/**
 * Handle CSV file select
 */
function handleDmCsvFileSelect(input) {
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

  const fileNameEl = document.getElementById('dmBulkCsvFileName');
  const uploadAreaEl = document.getElementById('dmBulkUploadArea');

  if (fileNameEl) {
    fileNameEl.textContent = '✓ ' + file.name + ' (' + formatFileSize(file.size) + ')';
    fileNameEl.style.display = 'block';
  }
  if (uploadAreaEl) uploadAreaEl.classList.add('has-file');

  const reader = new FileReader();
  reader.onload = function (e) {
    parseDataMasterCsvContent(e.target.result);
  };
  reader.onerror = function () {
    toastError('Gagal membaca file CSV');
  };
  reader.readAsText(file, 'UTF-8');
}

function handleDmCsvDragOver(event) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.add('drag-over');
}

function handleDmCsvDragLeave(event) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.remove('drag-over');
}

function handleDmCsvDrop(event) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.remove('drag-over');
  const files = event.dataTransfer.files;
  if (files.length > 0) {
    document.getElementById('dmBulkCsvInput').files = files;
    handleDmCsvFileSelect({ files: files });
  }
}

/**
 * Parse CSV content
 * Reuse parseCsvRFC4180 dari bulk-upload.js (sudah dimuat sebelum data-master.js)
 */
function parseDataMasterCsvContent(text) {
  dmCsvParsedRows = [];

  if (!text || text.trim() === '') {
    toastError('CSV kosong');
    return;
  }

  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  // Reuse parser dari bulk-upload.js
  const parseFn = (typeof parseCsvRFC4180 === 'function') ? parseCsvRFC4180 : function (text) {
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
            currentField += '"';
            i += 2;
          } else {
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
          currentRow.push(currentField);
          rows.push(currentRow);
          currentRow = [];
          currentField = '';
          i += 2;
        } else if (char === '\n') {
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
    if (currentField !== '' || currentRow.length > 0) {
      currentRow.push(currentField);
      rows.push(currentRow);
    }
    return rows;
  };

  const rows = parseFn(text);

  if (rows.length < 2) {
    toastError('CSV hanya berisi header, tidak ada data');
    return;
  }

  const headers = rows[0].map((h) => (h || '').trim().toLowerCase());

  // Validasi header wajib
  const missingHeaders = DM_CSV_REQUIRED_FIELDS.filter((f) => !headers.includes(f));
  if (missingHeaders.length > 0) {
    toastError('Header CSV tidak lengkap. Kolom wajib: ' + missingHeaders.join(', '));
    return;
  }

  let validCount = 0;
  let invalidCount = 0;

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    if (!values || values.every((v) => !v || v.trim() === '')) continue;

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] || '').trim();
    });

    const errors = validateDataMasterCsvRow(row, i + 1);
    row._errors = errors;
    row._rowNum = i + 1;

    if (errors.length === 0) validCount++;
    else invalidCount++;

    dmCsvParsedRows.push(row);
  }

  if (dmCsvParsedRows.length === 0) {
    toastError('Tidak ada baris data yang terbaca');
    return;
  }

  renderDataMasterCsvPreview(headers, validCount, invalidCount);

  const btn = document.getElementById('dmCsvProcessBtn');
  if (btn) {
    btn.disabled = validCount === 0;
    btn.innerHTML = '<i class="fas fa-upload"></i> Upload ' + validCount + ' Data ke Database';
  }

  toastInfo('Parsed: ' + validCount + ' valid, ' + invalidCount + ' invalid dari ' + dmCsvParsedRows.length + ' baris');
}

/**
 * Validasi baris CSV data master
 * Wajib: nip (18 digit), nama
 * Opsional: semua field lainnya dengan validasi format
 */
function validateDataMasterCsvRow(row, rowNum) {
  const errors = [];

  // === FIELD WAJIB ===
  if (!row.nip) {
    errors.push('nip wajib diisi');
  } else if (!/^\d{18}$/.test(row.nip)) {
    errors.push('nip harus 18 digit angka (terbaca: "' + row.nip + '")');
  }

  if (!row.nama) {
    errors.push('nama wajib diisi');
  }

  // === FIELD OPSIONAL - validasi format jika diisi ===
  // Tanggal format YYYY-MM-DD
  for (const dateField of ['tanggal_lahir', 'tmt_pangkat', 'tmt_jf', 'tanggal_penetapan']) {
    if (row[dateField] && !/^\d{4}-\d{2}-\d{2}$/.test(row[dateField])) {
      errors.push(dateField + ' harus format YYYY-MM-DD (terbaca: "' + row[dateField] + '")');
    }
  }

  // jenis_kelamin
  if (row.jenis_kelamin && !['Laki-laki', 'Perempuan'].includes(row.jenis_kelamin)) {
    errors.push('jenis_kelamin harus "Laki-laki" atau "Perempuan"');
  }

  // predikat_kinerja
  if (row.predikat_kinerja && !['Sangat Baik', 'Baik', 'Cukup/Butuh Perbaikan', 'Kurang', 'Sangat Kurang'].includes(row.predikat_kinerja)) {
    errors.push('predikat_kinerja harus salah satu: Sangat Baik/Baik/Cukup/Butuh Perbaikan/Kurang/Sangat Kurang');
  }

  // Numeric fields
  const numericFields = [
    'ak_lama_pendidikan', 'ak_lama_tugas_pokok', 'ak_lama_pengembangan', 'ak_lama_penunjang',
    'ak_baru_pendidikan', 'ak_baru_tugas_pokok', 'ak_baru_pengembangan', 'ak_baru_penunjang',
    'ak_minimal_pangkat', 'ak_minimal_jenjang', 'ak_minimal_pengembangan',
    'nilai_das',
  ];
  for (const field of numericFields) {
    if (row[field] && isNaN(parseFloat(row[field]))) {
      errors.push(field + ' harus angka (terbaca: "' + row[field] + '")');
    }
  }

  // Integer fields
  if (row.tahun_penilaian && !/^\d{4}$/.test(row.tahun_penilaian)) {
    errors.push('tahun_penilaian harus 4 digit angka (terbaca: "' + row.tahun_penilaian + '")');
  }

  if (row.bulan_penilaian && (isNaN(parseInt(row.bulan_penilaian)) || parseInt(row.bulan_penilaian) < 1 || parseInt(row.bulan_penilaian) > 12)) {
    errors.push('bulan_penilaian harus 1-12');
  }

  return errors;
}

/**
 * Render preview CSV
 */
function renderDataMasterCsvPreview(headers, validCount, invalidCount) {
  const section = document.getElementById('dmCsvPreviewSection');
  const summary = document.getElementById('dmCsvValidationSummary');
  const head = document.getElementById('dmCsvPreviewHead');
  const body = document.getElementById('dmCsvPreviewBody');
  const countEl = document.getElementById('dmCsvPreviewCount');

  if (section) section.style.display = 'block';

  if (countEl) {
    countEl.textContent = dmCsvParsedRows.length + ' baris | ' + validCount + ' valid | ' + invalidCount + ' error';
  }

  if (summary) {
    summary.innerHTML =
      '<div style="display: flex; gap: 10px; flex-wrap: wrap; padding: 12px; background: ' +
      (invalidCount > 0 ? '#fef3c7' : '#d1fae5') +
      '; border-radius: 8px; font-size: 0.85rem;">' +
      '<span style="color: #065f46;"><i class="fas fa-check-circle"></i> Valid: <strong>' + validCount + '</strong></span>' +
      '<span style="color: #92400e;"><i class="fas fa-exclamation-triangle"></i> Invalid: <strong>' + invalidCount + '</strong></span>' +
      '<span style="color: #475569;"><i class="fas fa-database"></i> Total: <strong>' + dmCsvParsedRows.length + '</strong></span>' +
      '</div>';
  }

  const displayCols = ['nip', 'nama', 'unit_kerja', 'jabatan_jf', 'ak_minimal_pangkat'];
  const previewRows = dmCsvParsedRows.slice(0, 50);

  if (head) {
    head.innerHTML = '<tr>' + displayCols.map((c) =>
      '<th style="padding: 8px; background: #f1f5f9; border-bottom: 2px solid var(--border-color); text-align: left; text-transform: uppercase; font-size: 0.75rem;">' + c + '</th>'
    ).join('') + '<th style="padding: 8px; background: #f1f5f9; text-transform: uppercase; font-size: 0.75rem;">Status</th></tr>';
  }

  if (body) {
    body.innerHTML = previewRows.map((row) => {
      let errorTooltip = '';
      if (row._errors.length > 0) {
        errorTooltip = row._errors.join('&#10;');
      }
      return '<tr style="border-bottom: 1px solid var(--border-color);">' +
        displayCols.map((c) => '<td style="padding: 8px;">' + escapeHtml(row[c] || '-') + '</td>').join('') +
        '<td style="padding: 8px;">' +
        (row._errors.length === 0
          ? '<span style="color: var(--success);"><i class="fas fa-check"></i> OK</span>'
          : '<span style="color: var(--danger); cursor: help;" title="' + errorTooltip + '"><i class="fas fa-times"></i> ' + row._errors.length + ' error</span>') +
        '</td></tr>';
    }).join('');

    if (dmCsvParsedRows.length > 50) {
      body.innerHTML += '<tr><td colspan="' + (displayCols.length + 1) + '" style="padding: 12px; text-align: center; color: var(--text-light); font-style: italic;">... dan ' + (dmCsvParsedRows.length - 50) + ' baris lainnya</td></tr>';
    }
  }
}

/**
 * Process bulk upload - insert semua data valid ke database
 */
async function processDataMasterBulkUpload() {
  if (dmCsvUploadInProgress) {
    toastWarning('Upload sedang berjalan, tunggu sebentar...');
    return;
  }

  const validRows = dmCsvParsedRows.filter((r) => r._errors.length === 0);
  if (validRows.length === 0) {
    toastError('Tidak ada data valid untuk diupload');
    return;
  }

  if (!isSupabaseReady()) {
    toastError('Supabase belum dikonfigurasi. Edit js/config.js');
    return;
  }

  const confirmed = await confirmDialog(
    'Anda akan mengupload ' + validRows.length + ' data master ke database.\n\n' +
    'Pastikan:\n' +
    '• Data sudah benar\n' +
    '• NIP tidak duplikat\n\n' +
    'Klik OK untuk lanjut, Cancel untuk batal.'
  );
  if (!confirmed) return;

  dmCsvUploadInProgress = true;
  const btn = document.getElementById('dmCsvProcessBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Mengupload...';
  }

  const progressSection = document.getElementById('dmCsvUploadProgress');
  if (progressSection) progressSection.style.display = 'block';

  let successCount = 0;
  let failCount = 0;
  const failedRows = [];

  // Cek NIP existing
  const existingNips = new Set(dataMasterAll.map((r) => r['NIP']).filter(Boolean));

  for (let i = 0; i < validRows.length; i++) {
    const row = validRows[i];

    const percent = Math.round(((i + 1) / validRows.length) * 100);
    updateDmCsvProgress(percent, 'Memproses baris ' + (i + 1) + '/' + validRows.length + ': ' + row.nama);

    // Cek duplikat NIP
    if (existingNips.has(row.nip)) {
      failCount++;
      failedRows.push({ row: row._rowNum, nip: row.nip, error: 'NIP sudah terdaftar' });
      continue;
    }

    try {
      const getNum = (field) => {
        const v = row[field];
        if (!v) return 0;
        const n = parseFloat(v);
        return isNaN(n) ? 0 : n;
      };

      const formData = {
        nip: row.nip,
        nama: row.nama.toUpperCase(),
        noKarpeg: row.no_karpeg || '',
        tempatLahir: row.tempat_lahir || '',
        tanggalLahir: row.tanggal_lahir || '',
        pendidikan: row.pendidikan || '',
        jenisKelamin: row.jenis_kelamin || '',
        pangkat: row.pangkat || '',
        golongan: row.golongan || '',
        tmtPangkat: row.tmt_pangkat || '',
        jabatanJf: row.jabatan_jf || '',
        tmtJf: row.tmt_jf || '',
        masaKerjaGol: row.masa_kerja_gol || '',
        unitKerja: row.unit_kerja || '',
        instansi: row.instansi || 'Dinas Kesehatan Kab. Kutai Kartanegara',

        akLamaPendidikan: getNum('ak_lama_pendidikan'),
        akLamaTugasPokok: getNum('ak_lama_tugas_pokok'),
        akLamaPengembangan: getNum('ak_lama_pengembangan'),
        akLamaPenunjang: getNum('ak_lama_penunjang'),

        akBaruPendidikan: getNum('ak_baru_pendidikan'),
        akBaruTugasPokok: getNum('ak_baru_tugas_pokok'),
        akBaruPengembangan: getNum('ak_baru_pengembangan'),
        akBaruPenunjang: getNum('ak_baru_penunjang'),

        akMinimalPangkat: getNum('ak_minimal_pangkat'),
        akMinimalJenjang: getNum('ak_minimal_jenjang'),
        akMinimalPengembangan: getNum('ak_minimal_pengembangan'),

        nilaiDasar: getNum('nilai_das'),

        periodePenilaian: row.periode_penilaian || '',
        tahunPenilaian: row.tahun_penilaian ? parseInt(row.tahun_penilaian) : null,
        bulanPenilaian: row.bulan_penilaian ? parseInt(row.bulan_penilaian) : 12,
        predikatKinerja: row.predikat_kinerja || 'Baik',

        tanggalPenetapan: row.tanggal_penetapan || '',
        lokasiPenetapan: row.lokasi_penetapan || 'Tenggarong',
        namaPejabat: row.nama_pejabat || '',
        nipPejabat: row.nip_pejabat || '',
        rekomendasi: row.rekomendasi || '',
      };

      const result = await insertDataMaster(formData);
      if (result && result._id) {
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

    if (i % 5 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  updateDmCsvProgress(100, 'Selesai!');

  const resultsEl = document.getElementById('dmCsvUploadResults');
  if (resultsEl) {
    let html =
      '<div style="padding: 12px; background: ' + (failCount > 0 ? '#fef3c7' : '#d1fae5') + '; border-radius: 8px; margin-top: 8px;">' +
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
        failedRows.map((f) =>
          '<div style="padding: 4px 0; border-bottom: 1px solid var(--border-color);">Baris ' + f.row + ' (NIP: ' + escapeHtml(f.nip) + '): ' + escapeHtml(f.error) + '</div>'
        ).join('') +
        '</div></details>';
    }

    html += '</div>';
    resultsEl.innerHTML = html;
  }

  toastSuccess('Upload selesai! ' + successCount + ' berhasil, ' + failCount + ' gagal.');

  if (successCount > 0) {
    setTimeout(() => loadDataMaster(), 1000);
  }

  dmCsvUploadInProgress = false;
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-check"></i> Selesai';
  }
}

function updateDmCsvProgress(percent, text) {
  const bar = document.getElementById('dmCsvProgressBar');
  const percentEl = document.getElementById('dmCsvProgressPercent');
  const textEl = document.getElementById('dmCsvProgressText');

  if (bar) bar.style.width = percent + '%';
  if (percentEl) percentEl.textContent = percent + '%';
  if (textEl) textEl.textContent = text;
}
