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
