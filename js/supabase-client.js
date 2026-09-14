/* ============================================
 * PAKTI - Supabase Client Wrapper
 * ============================================
 * File ini berisi semua fungsi untuk berkomunikasi
 * dengan database & storage Supabase.
 *
 * Skema tabel pengajuan_pak (snake_case):
 *   id, email, no_hp, nama, nip, no_karpeg,
 *   tempat_lahir, tanggal_lahir, pendidikan, jenis_kelamin,
 *   pangkat_gol, tmt_pangkat, jenis_jf, jenjang_jf, tmt_jf,
 *   masa_kerja_gol, satuan_kerja,
 *   status, catatan_admin,
 *   dok_foto_url, dok_sk_pangkat_url, dok_sk_jabfung_url, dok_pak_konvensional_url,
 *   created_at, updated_at
 * ============================================ */

/**
 * Map dari snake_case (DB) ke format lama (Space-separated, kompatibel UI)
 */
function mapRowToUI(row) {
  if (!row) return null;
  return {
    // Identitas
    Email: row.email || '',
    NoHP: row.no_hp || '',
    'Nama Lengkap dengan Gelar': row.nama || '',
    NIP: row.nip || '',
    'No Karpeg': row.no_karpeg || '',
    'Tempat & Tanggal Lahir':
      row.tempat_lahir && row.tanggal_lahir
        ? `${row.tempat_lahir}, ${row.tanggal_lahir}`
        : row.tempat_lahir || row.tanggal_lahir || '',
    Pendidikan: row.pendidikan || '',
    'Jenis Kelamin': row.jenis_kelamin || '',
    'Pangkat/Gol': row.pangkat_gol || '',
    'TMT Pangkat': row.tmt_pangkat || '',
    'Jenis JF': row.jenis_jf || '',
    'Jenjang JF': row.jenjang_jf || '',
    'TMT JF': row.tmt_jf || '',
    'Masa Kerja Gol': row.masa_kerja_gol || '',
    'Satuan Kerja': row.satuan_kerja || '',

    // Status
    Status: row.status || 'Menunggu',
    'Catatan Admin': row.catatan_admin || '',
    'Update Terakhir': row.updated_at || row.created_at || '',
    Timestamp: row.created_at || '',

    // Dokumen URLs (UI keys - kompatibel dengan kode lama)
    'Dok_Foto_4x6': row.dok_foto_url || '',
    'Dok_SK_Pangkat_2022_2023': row.dok_sk_pangkat_url || '',
    'Dok_SK_Jabfung_2022_2023': row.dok_sk_jabfung_url || '',
    'Dok_PAK_Konvensional_s_d_2022': row.dok_pak_konvensional_url || '',
    'Upload Dokumen (Drive Link)': row.dok_foto_url || '',

    // ID untuk operasi update/delete
    _id: row.id,
    _raw: row,
  };
}

/**
 * Ambil semua data pengajuan
 */
async function fetchAllPengajuan() {
  if (!isSupabaseReady()) {
    throw new Error('Supabase belum dikonfigurasi. Edit js/config.js');
  }

  const { data, error } = await supabaseClient
    .from(TABLE_PENGAJUAN)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapRowToUI);
}

/**
 * Cari pengajuan berdasarkan NIP
 */
async function fetchByNIP(nip) {
  if (!isSupabaseReady()) {
    throw new Error('Supabase belum dikonfigurasi');
  }

  const { data, error } = await supabaseClient
    .from(TABLE_PENGAJUAN)
    .select('*')
    .eq('nip', nip)
    .maybeSingle();

  if (error) throw error;
  return mapRowToUI(data);
}

/**
 * Cari pengajuan berdasarkan NIP/NIK - hanya yang sudah terbit PAK-nya
 */
async function fetchPAKTerbit(nip) {
  const result = await fetchByNIP(nip);
  return result; // return semua data, filter status bisa di UI
}

/**
 * Insert pengajuan baru (dari Formulir Pengajuan)
 * Insert data dulu, lalu upload dokumen dilakukan terpisah
 */
async function insertPengajuan(formData) {
  if (!isSupabaseReady()) {
    throw new Error('Supabase belum dikonfigurasi');
  }

  const row = {
    email: formData.email,
    no_hp: formData.noHP,
    nama: formData.nama,
    nip: formData.nip,
    no_karpeg: formData.noKarpeg || null,
    tempat_lahir: formData.tempatLahir,
    tanggal_lahir: formData.tanggalLahir,
    pendidikan: formData.pendidikan,
    jenis_kelamin: formData.jenisKelamin,
    pangkat_gol: formData.pangkatGol,
    tmt_pangkat: formData.tmtPangkat,
    jenis_jf: formData.jenisJF,
    jenjang_jf: formData.jenjangJF,
    tmt_jf: formData.tmtJF,
    masa_kerja_gol: formData.masaKerjaGol,
    satuan_kerja: formData.satuanKerja,
    status: 'Menunggu',
    catatan_admin: '',
  };

  const { data, error } = await supabaseClient
    .from(TABLE_PENGAJUAN)
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return mapRowToUI(data);
}

/**
 * Update data pengajuan (untuk perbaikan oleh user)
 * Update data + optional upload dokumen baru
 */
async function updatePengajuan(id, formData) {
  if (!isSupabaseReady()) {
    throw new Error('Supabase belum dikonfigurasi');
  }

  const row = {
    email: formData.email,
    no_hp: formData.noHP,
    nama: formData.nama,
    no_karpeg: formData.noKarpeg || null,
    tempat_lahir: formData.tempatLahir,
    tanggal_lahir: formData.tanggalLahir,
    pendidikan: formData.pendidikan,
    jenis_kelamin: formData.jenisKelamin,
    pangkat_gol: formData.pangkatGol,
    tmt_pangkat: formData.tmtPangkat,
    jenis_jf: formData.jenisJF,
    jenjang_jf: formData.jenjangJF,
    tmt_jf: formData.tmtJF,
    masa_kerja_gol: formData.masaKerjaGol,
    satuan_kerja: formData.satuanKerja,
    status: 'Menunggu',
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseClient
    .from(TABLE_PENGAJUAN)
    .update(row)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapRowToUI(data);
}

/**
 * Update status pengajuan (admin)
 */
async function updateStatus(id, status, catatan) {
  if (!isSupabaseReady()) {
    throw new Error('Supabase belum dikonfigurasi');
  }

  const { data, error } = await supabaseClient
    .from(TABLE_PENGAJUAN)
    .update({
      status: status,
      catatan_admin: catatan || '',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapRowToUI(data);
}

/**
 * Hapus pengajuan (admin)
 * Optional: hapus juga file di storage (best-effort)
 */
async function deletePengajuan(id) {
  if (!isSupabaseReady()) {
    throw new Error('Supabase belum dikonfigurasi');
  }

  // Ambil data dulu supaya tahu URL dokumen yg akan dihapus dari storage
  const { data: rowData } = await supabaseClient
    .from(TABLE_PENGAJUAN)
    .select('dok_foto_url, dok_sk_pangkat_url, dok_sk_jabfung_url, dok_pak_konvensional_url')
    .eq('id', id)
    .maybeSingle();

  // Hapus record di database
  const { error } = await supabaseClient.from(TABLE_PENGAJUAN).delete().eq('id', id);
  if (error) throw error;

  // Best-effort: hapus file di storage (abaikan error)
  if (rowData) {
    const urls = [
      rowData.dok_foto_url,
      rowData.dok_sk_pangkat_url,
      rowData.dok_sk_jabfung_url,
      rowData.dok_pak_konvensional_url,
    ].filter(Boolean);

    for (const url of urls) {
      try {
        // Extract path dari public URL
        const pathMatch = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
        if (pathMatch && pathMatch[1]) {
          await supabaseClient.storage.from(STORAGE_BUCKET).remove([decodeURIComponent(pathMatch[1])]);
        }
      } catch (e) {
        console.warn('[Delete] Gagal hapus file storage:', url, e.message);
      }
    }
  }

  return true;
}

/**
 * Edit data pengajuan (admin - full edit)
 * Update field data, field NIP juga bisa diubah oleh admin
 */
async function adminEditPengajuan(id, fields) {
  if (!isSupabaseReady()) {
    throw new Error('Supabase belum dikonfigurasi');
  }

  const row = {
    nama: fields.nama,
    nip: fields.nip,
    pangkat_gol: fields.pangkatGol,
    jenis_jf: fields.jenisJF,
    jenjang_jf: fields.jenjangJF,
    satuan_kerja: fields.satuanKerja,
    tmt_pangkat: fields.tmtPangkat || null,
    tmt_jf: fields.tmtJF || null,
    masa_kerja_gol: fields.masaKerjaGol,
    updated_at: new Date().toISOString(),
  };

  // Hapus field null/undefined supaya tidak overwrite dengan null
  Object.keys(row).forEach((k) => {
    if (row[k] === undefined) delete row[k];
  });

  const { data, error } = await supabaseClient
    .from(TABLE_PENGAJUAN)
    .update(row)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapRowToUI(data);
}

/* ============================================
 * Storage - Upload File Dokumen
 * ============================================ */

/**
 * Upload file ke Supabase Storage
 * @param {File} file - File object
 * @param {string} folder - Sub-folder: 'foto' | 'sk_pangkat' | 'sk_jabfung' | 'pak_konvensional'
 * @param {string} nip - NIP sebagai identifier unik
 * @returns {Promise<string>} Public URL
 */
async function uploadDocument(file, folder, nip) {
  if (!isSupabaseReady()) {
    throw new Error('Supabase belum dikonfigurasi');
  }

  if (!file) {
    throw new Error('File tidak ada');
  }

  // Validasi folder
  const validFolders = ['foto', 'sk_pangkat', 'sk_jabfung', 'pak_konvensional'];
  if (!validFolders.includes(folder)) {
    throw new Error('Folder tidak valid: ' + folder);
  }

  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const safeNip = String(nip || 'unknown').replace(/[^a-zA-Z0-9]/g, '');
  const fileName = `${folder}/${safeNip}_${Date.now()}.${ext}`;

  console.log('[Storage] Uploading:', fileName, '| Size:', formatFileSize(file.size));

  const { error: uploadError } = await supabaseClient.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });

  if (uploadError) {
    console.error('[Storage] Upload error:', uploadError);
    throw new Error('Storage: ' + (uploadError.message || JSON.stringify(uploadError)));
  }

  // Get public URL
  const { data } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);

  if (!data || !data.publicUrl) {
    throw new Error('Gagal mendapatkan public URL untuk file');
  }

  console.log('[Storage] ✅ Upload success:', data.publicUrl);
  return data.publicUrl;
}

/**
 * Update URL dokumen pada record pengajuan
 * @param {string} id - UUID record
 * @param {string} field - Nama field di DB (snake_case): dok_foto_url, dok_sk_pangkat_url, dst.
 * @param {string} url - Public URL file
 */
async function updateDocumentURL(id, field, url) {
  if (!isSupabaseReady()) {
    throw new Error('Supabase belum dikonfigurasi');
  }

  const validFields = [
    'dok_foto_url',
    'dok_sk_pangkat_url',
    'dok_sk_jabfung_url',
    'dok_pak_konvensional_url',
  ];
  if (!validFields.includes(field)) {
    throw new Error('Field dokumen tidak valid: ' + field);
  }

  const { error } = await supabaseClient
    .from(TABLE_PENGAJUAN)
    .update({ [field]: url, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
  return true;
}

/**
 * Hapus file dari storage (best-effort, abaikan error)
 */
async function deleteStorageFile(publicUrl) {
  if (!isSupabaseReady() || !publicUrl) return false;
  try {
    const pathMatch = publicUrl.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
    if (!pathMatch || !pathMatch[1]) return false;
    const filePath = decodeURIComponent(pathMatch[1]);
    await supabaseClient.storage.from(STORAGE_BUCKET).remove([filePath]);
    return true;
  } catch (e) {
    console.warn('[Storage] Gagal hapus file:', e.message);
    return false;
  }
}

/* ============================================
 * AUTH - Login admin via tabel admin_users
 * ============================================ */

/**
 * Login admin via tabel admin_users
 * @returns {Promise<object|null>} User object jika berhasil
 */
async function loginAdminUser(username, password) {
  if (!isSupabaseReady()) {
    throw new Error('Supabase belum dikonfigurasi');
  }

  const { data, error } = await supabaseClient
    .from(TABLE_ADMIN_USERS)
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

/* ============================================
 * DATA MASTER (Sheet DATA) - Sumber untuk Pembuatan PAK
 * ============================================
 * Tabel ini terpisah dari pengajuan_pak.
 * Admin input data master + Angka Kredit di sini.
 */

/**
 * Map row data_master (snake_case DB) ke format UI
 */
function mapDataMasterToUI(row) {
  if (!row) return null;
  return {
    _id: row.id,
    _raw: row,

    // Personal
    NIP: row.nip || '',
    'Nama Lengkap dengan Gelar': row.nama || '',
    'No Karpeg': row.no_karpeg || '',
    'Tempat & Tanggal Lahir':
      row.tempat_lahir && row.tanggal_lahir
        ? `${row.tempat_lahir}, ${row.tanggal_lahir}`
        : row.tempat_lahir || row.tanggal_lahir || '',
    Pendidikan: row.pendidikan || '',
    'Jenis Kelamin': row.jenis_kelamin || '',
    'Pangkat/Gol': row.pangkat && row.golongan ? `${row.pangkat} / ${row.golongan}` : row.pangkat || row.golongan || '',
    'TMT Pangkat': row.tmt_pangkat || '',
    'Jenis JF': row.jabatan_jf || '',
    'Jenjang JF': '',
    'TMT JF': row.tmt_jf || '',
    'Masa Kerja Gol': row.masa_kerja_gol || '',
    'Satuan Kerja': row.unit_kerja || '',
    Instansi: row.instansi || 'Dinas Kesehatan Kab. Kutai Kartanegara',

    // AK Lama
    akLamaPendidikan: row.ak_lama_pendidikan || 0,
    akLamaTugasPokok: row.ak_lama_tugas_pokok || 0,
    akLamaPengembangan: row.ak_lama_pengembangan || 0,
    akLamaPenunjang: row.ak_lama_penunjang || 0,

    // AK Baru
    akBaruPendidikan: row.ak_baru_pendidikan || 0,
    akBaruTugasPokok: row.ak_baru_tugas_pokok || 0,
    akBaruPengembangan: row.ak_baru_pengembangan || 0,
    akBaruPenunjang: row.ak_baru_penunjang || 0,

    // AK Minimal
    akMinimalPangkat: row.ak_minimal_pangkat || 0,
    akMinimalJenjang: row.ak_minimal_jenjang || 0,
    akMinimalPengembangan: row.ak_minimal_pengembangan || 0,

    // Nilai Dasar (Integrasi)
    nilaiDasar: row.nilai_das || 0,

    // Penilaian Kinerja
    periodePenilaian: row.periode_penilaian || '',
    tahunPenilaian: row.tahun_penilaian || '',
    bulanPenilaian: row.bulan_penilaian || 12,
    predikatKinerja: row.predikat_kinerja || 'Baik',

    // Penetapan
    tanggalPenetapan: row.tanggal_penetapan || '',
    lokasiPenetapan: row.lokasi_penetapan || 'Tenggarong',
    namaPejabat: row.nama_pejabat || '',
    nipPejabat: row.nip_pejabat || '',
    rekomendasi: row.rekomendasi || '',

    updated_at: row.updated_at || row.created_at || '',
  };
}

/**
 * Fetch semua data master
 */
async function fetchAllDataMaster() {
  if (!isSupabaseReady()) {
    throw new Error('Supabase belum dikonfigurasi');
  }

  const { data, error } = await supabaseClient
    .from(TABLE_DATA_MASTER)
    .select('*')
    .order('nama', { ascending: true });

  if (error) throw error;
  return (data || []).map(mapDataMasterToUI);
}

/**
 * Fetch data master by ID
 */
async function fetchDataMasterById(id) {
  if (!isSupabaseReady()) {
    throw new Error('Supabase belum dikonfigurasi');
  }

  const { data, error } = await supabaseClient
    .from(TABLE_DATA_MASTER)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return mapDataMasterToUI(data);
}

/**
 * Insert data master baru
 */
async function insertDataMaster(formData) {
  if (!isSupabaseReady()) {
    throw new Error('Supabase belum dikonfigurasi');
  }

  const row = {
    nip: formData.nip,
    nama: formData.nama,
    no_karpeg: formData.no_karpeg || null,
    tempat_lahir: formData.tempatLahir || null,
    tanggal_lahir: formData.tanggalLahir || null,
    pendidikan: formData.pendidikan || null,
    jenis_kelamin: formData.jenisKelamin || null,
    pangkat: formData.pangkat || null,
    golongan: formData.golongan || null,
    tmt_pangkat: formData.tmtPangkat || null,
    jabatan_jf: formData.jabatanJf || null,
    tmt_jf: formData.tmtJf || null,
    masa_kerja_gol: formData.masaKerjaGol || null,
    unit_kerja: formData.unitKerja || null,
    instansi: formData.instansi || 'Dinas Kesehatan Kab. Kutai Kartanegara',

    ak_lama_pendidikan: formData.akLamaPendidikan || 0,
    ak_lama_tugas_pokok: formData.akLamaTugasPokok || 0,
    ak_lama_pengembangan: formData.akLamaPengembangan || 0,
    ak_lama_penunjang: formData.akLamaPenunjang || 0,

    ak_baru_pendidikan: formData.akBaruPendidikan || 0,
    ak_baru_tugas_pokok: formData.akBaruTugasPokok || 0,
    ak_baru_pengembangan: formData.akBaruPengembangan || 0,
    ak_baru_penunjang: formData.akBaruPenunjang || 0,

    ak_minimal_pangkat: formData.akMinimalPangkat || 0,
    ak_minimal_jenjang: formData.akMinimalJenjang || 0,
    ak_minimal_pengembangan: formData.akMinimalPengembangan || 0,

    nilai_das: formData.nilaiDasar || 0,

    periode_penilaian: formData.periodePenilaian || null,
    tahun_penilaian: formData.tahunPenilaian || null,
    bulan_penilaian: formData.bulanPenilaian || 12,
    predikat_kinerja: formData.predikatKinerja || 'Baik',

    tanggal_penetapan: formData.tanggalPenetapan || null,
    lokasi_penetapan: formData.lokasiPenetapan || 'Tenggarong',
    nama_pejabat: formData.namaPejabat || null,
    nip_pejabat: formData.nipPejabat || null,
    rekomendasi: formData.rekomendasi || null,
  };

  const { data, error } = await supabaseClient
    .from(TABLE_DATA_MASTER)
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return mapDataMasterToUI(data);
}

/**
 * Update data master
 */
async function updateDataMaster(id, formData) {
  if (!isSupabaseReady()) {
    throw new Error('Supabase belum dikonfigurasi');
  }

  const row = {
    nip: formData.nip,
    nama: formData.nama,
    no_karpeg: formData.no_karpeg || null,
    tempat_lahir: formData.tempatLahir || null,
    tanggal_lahir: formData.tanggalLahir || null,
    pendidikan: formData.pendidikan || null,
    jenis_kelamin: formData.jenisKelamin || null,
    pangkat: formData.pangkat || null,
    golongan: formData.golongan || null,
    tmt_pangkat: formData.tmtPangkat || null,
    jabatan_jf: formData.jabatanJf || null,
    tmt_jf: formData.tmtJf || null,
    masa_kerja_gol: formData.masaKerjaGol || null,
    unit_kerja: formData.unitKerja || null,
    instansi: formData.instansi || 'Dinas Kesehatan Kab. Kutai Kartanegara',

    ak_lama_pendidikan: formData.akLamaPendidikan || 0,
    ak_lama_tugas_pokok: formData.akLamaTugasPokok || 0,
    ak_lama_pengembangan: formData.akLamaPengembangan || 0,
    ak_lama_penunjang: formData.akLamaPenunjang || 0,

    ak_baru_pendidikan: formData.akBaruPendidikan || 0,
    ak_baru_tugas_pokok: formData.akBaruTugasPokok || 0,
    ak_baru_pengembangan: formData.akBaruPengembangan || 0,
    ak_baru_penunjang: formData.akBaruPenunjang || 0,

    ak_minimal_pangkat: formData.akMinimalPangkat || 0,
    ak_minimal_jenjang: formData.akMinimalJenjang || 0,
    ak_minimal_pengembangan: formData.akMinimalPengembangan || 0,

    nilai_das: formData.nilaiDasar || 0,

    periode_penilaian: formData.periodePenilaian || null,
    tahun_penilaian: formData.tahunPenilaian || null,
    bulan_penilaian: formData.bulanPenilaian || 12,
    predikat_kinerja: formData.predikatKinerja || 'Baik',

    tanggal_penetapan: formData.tanggalPenetapan || null,
    lokasi_penetapan: formData.lokasiPenetapan || 'Tenggarong',
    nama_pejabat: formData.namaPejabat || null,
    nip_pejabat: formData.nipPejabat || null,
    rekomendasi: formData.rekomendasi || null,

    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseClient
    .from(TABLE_DATA_MASTER)
    .update(row)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapDataMasterToUI(data);
}

/**
 * Hapus data master
 */
async function deleteDataMaster(id) {
  if (!isSupabaseReady()) {
    throw new Error('Supabase belum dikonfigurasi');
  }

  const { error } = await supabaseClient.from(TABLE_DATA_MASTER).delete().eq('id', id);
  if (error) throw error;
  return true;
}

/* ============================================
 * DOKUMEN PAK (Editor Dokumen)
 * ============================================
 * Tabel: dokumen_pak + dokumen_pak_versions
 * Menyimpan dokumen PAK yang di-edit via TinyMCE
 * ============================================ */

/**
 * Ambil dokumen PAK berdasarkan data_master_id (atau NIP)
 */
async function fetchDokumenByDataMaster(dataMasterId, nip) {
  if (!isSupabaseReady()) {
    throw new Error('Supabase belum dikonfigurasi');
  }

  let query = supabaseClient.from(TABLE_DOKUMEN_PAK).select('*');

  if (dataMasterId) {
    query = query.eq('data_master_id', dataMasterId);
  } else if (nip) {
    query = query.eq('nip', nip);
  } else {
    throw new Error('dataMasterId atau nip wajib diisi');
  }

  query = query.order('updated_at', { ascending: false }).limit(1);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data || null;
}

/**
 * Simpan dokumen (insert atau update)
 * Jika sudah ada → update + buat version snapshot
 * Jika belum → insert baru
 */
async function saveDokumenPAK(dokumenData) {
  if (!isSupabaseReady()) {
    throw new Error('Supabase belum dikonfigurasi');
  }

  const user = getCurrentUser();
  const row = {
    data_master_id: dokumenData.dataMasterId || null,
    nip: dokumenData.nip || null,
    nama: dokumenData.nama || null,
    judul: dokumenData.judul || 'Penetapan Angka Kredit Integrasi',
    konten: dokumenData.konten || '',
    pengaturan_halaman: dokumenData.pengaturanHalaman || {
      size: 'A4',
      orientation: 'portrait',
      marginTop: 15,
      marginBottom: 15,
      marginLeft: 18,
      marginRight: 18,
      lineHeight: 1.5,
      paragraphSpacing: 8,
    },
    header_dokumen: dokumenData.headerDokumen || null,
    footer_dokumen: dokumenData.footerDokumen || null,
    status: dokumenData.status || 'draft',
    last_edited_by: user ? user.username : 'anonymous',
    last_edited_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  let result;
  if (dokumenData.id) {
    // === UPDATE ===
    // Ambil versi saat ini dulu untuk snapshot
    const { data: current } = await supabaseClient
      .from(TABLE_DOKUMEN_PAK)
      .select('versi, konten, pengaturan_halaman, header_dokumen, footer_dokumen')
      .eq('id', dokumenData.id)
      .maybeSingle();

    if (current) {
      // Simpan snapshot versi lama ke tabel versions
      const newVersion = (current.versi || 1) + 1;
      row.versi = newVersion;

      await supabaseClient.from(TABLE_DOKUMEN_VERSIONS).insert({
        dokumen_id: dokumenData.id,
        versi: current.versi || 1,
        konten: current.konten,
        pengaturan_halaman: current.pengaturan_halaman,
        header_dokumen: current.header_dokumen,
        footer_dokumen: current.footer_dokumen,
        edited_by: user ? user.username : 'anonymous',
        catatan_perubahan: dokumenData.catatanPerubahan || 'Auto-save',
      });
    }

    // Update dokumen
    const { data, error } = await supabaseClient
      .from(TABLE_DOKUMEN_PAK)
      .update(row)
      .eq('id', dokumenData.id)
      .select()
      .single();

    if (error) throw error;
    result = data;
  } else {
    // === INSERT ===
    row.versi = 1;
    const { data, error } = await supabaseClient
      .from(TABLE_DOKUMEN_PAK)
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    result = data;
  }

  return result;
}

/**
 * Ambil daftar version history untuk dokumen
 */
async function fetchDokumenVersions(dokumenId) {
  if (!isSupabaseReady()) {
    throw new Error('Supabase belum dikonfigurasi');
  }

  const { data, error } = await supabaseClient
    .from(TABLE_DOKUMEN_VERSIONS)
    .select('*')
    .eq('dokumen_id', dokumenId)
    .order('versi', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Restore dokumen ke versi tertentu
 */
async function restoreDokumenVersion(dokumenId, versionId) {
  if (!isSupabaseReady()) {
    throw new Error('Supabase belum dikonfigurasi');
  }

  // Ambil versi yang ingin di-restore
  const { data: version, error: vErr } = await supabaseClient
    .from(TABLE_DOKUMEN_VERSIONS)
    .select('*')
    .eq('id', versionId)
    .maybeSingle();

  if (vErr) throw vErr;
  if (!version) throw new Error('Versi tidak ditemukan');

  // Ambil dokumen saat ini untuk snapshot
  const { data: current } = await supabaseClient
    .from(TABLE_DOKUMEN_PAK)
    .select('versi, konten, pengaturan_halaman, header_dokumen, footer_dokumen')
    .eq('id', dokumenId)
    .maybeSingle();

  if (current) {
    // Snapshot kondisi saat ini sebelum restore
    await supabaseClient.from(TABLE_DOKUMEN_VERSIONS).insert({
      dokumen_id: dokumenId,
      versi: current.versi || 1,
      konten: current.konten,
      pengaturan_halaman: current.pengaturan_halaman,
      header_dokumen: current.header_dokumen,
      footer_dokumen: current.footer_dokumen,
      edited_by: getCurrentUser() ? getCurrentUser().username : 'anonymous',
      catatan_perubahan: 'Snapshot sebelum restore ke versi ' + version.versi,
    });
  }

  // Update dokumen dengan konten versi lama
  const newVersionNum = (current?.versi || 1) + 1;
  const { data, error } = await supabaseClient
    .from(TABLE_DOKUMEN_PAK)
    .update({
      konten: version.konten,
      pengaturan_halaman: version.pengaturan_halaman,
      header_dokumen: version.header_dokumen,
      footer_dokumen: version.footer_dokumen,
      versi: newVersionNum,
      last_edited_by: getCurrentUser() ? getCurrentUser().username : 'anonymous',
      last_edited_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', dokumenId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Hapus dokumen
 */
async function deleteDokumenPAK(id) {
  if (!isSupabaseReady()) {
    throw new Error('Supabase belum dikonfigurasi');
  }

  const { error } = await supabaseClient.from(TABLE_DOKUMEN_PAK).delete().eq('id', id);
  if (error) throw error;
  return true;
}
