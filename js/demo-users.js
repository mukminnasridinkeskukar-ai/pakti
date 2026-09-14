/* ============================================
 * PAKTI - Demo Users (Fallback Offline)
 * ============================================
 * Daftar user untuk demo/testing ketika Supabase
 * belum dikonfigurasi atau tabel admin_users kosong.
 *
 * ⚠️ PENTING: Hapus atau ganti dengan autentikasi
 * sebenarnya (Supabase Auth) di production!
 * ============================================ */
const DEMO_USERS = [
  {
    username: 'admin',
    password: 'paktiadmin2026',
    role: 'admin',
    nama: 'Administrator',
    satuanKerja: 'all',
  },
  {
    username: 'dinkes',
    password: 'sdmk001@',
    role: 'sdmk',
    nama: 'Dinas Kesehatan',
    satuanKerja: 'Dinas Kesehatan',
  },
  {
    username: 'puskesmassamboja',
    password: 'sdmk025@',
    role: 'sdmk',
    nama: 'UPTD Puskesmas Samboja',
    satuanKerja: 'UPTD Puskesmas Samboja',
  },
];
