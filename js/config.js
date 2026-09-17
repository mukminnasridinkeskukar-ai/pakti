/* ============================================
 * PAKTI - Supabase Configuration
 * ============================================
 *
 * PENTING: Ganti nilai SUPABASE_URL dan SUPABASE_ANON_KEY
 * dengan kredensial project Supabase Anda.
 *
 * Cara mendapatkan:
 * 1. Login ke https://supabase.com
 * 2. Buat project baru / pilih project existing
 * 3. Buka: Project Settings → API
 * 4. Copy "Project URL" → isi SUPABASE_URL
 * 5. Copy "anon public" key → isi SUPABASE_ANON_KEY
 * ============================================ */

const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY_HERE';

// Nama tabel di Supabase
const TABLE_PENGAJUAN = 'pengajuan_pak';
const TABLE_ADMIN_USERS = 'admin_users';
const TABLE_DATA_MASTER = 'data_master';
const TABLE_DOKUMEN_PAK = 'dokumen_pak';
const TABLE_DOKUMEN_VERSIONS = 'dokumen_pak_versions';
const STORAGE_BUCKET = 'pakti-dokumen';

// Konfigurasi pagination
const ITEMS_PER_PAGE = 10;

// ============================================
// KONFIGURASI REDIRECT & SESSION
// ============================================
// Website tujuan redirect untuk browser baru / session expired
const LANDING_PAGE_URL = 'https://mukminnasri.com';

// Durasi session idle (1 jam = 60 menit = 3.600.000 ms)
const SESSION_TIMEOUT_MS = 60 * 60 * 1000;

// Key di localStorage untuk tracking
const STORAGE_KEY_BROWSER_VISITED = 'pakti_browser_visited';
const STORAGE_KEY_LAST_ACTIVITY = 'pakti_last_activity';

// Inisialisasi client Supabase
let supabaseClient = null;

/**
 * Inisialisasi Supabase client
 * Dipanggil setelah library supabase-js dimuat
 */
function initSupabase() {
  if (typeof window.supabase === 'undefined') {
    console.error('[CONFIG] Library Supabase belum dimuat. Pastikan <script src="...supabase-js"> ada di index.html');
    return false;
  }

  if (SUPABASE_URL === 'https://YOUR_PROJECT_REF.supabase.co' ||
      SUPABASE_ANON_KEY === 'YOUR_ANON_PUBLIC_KEY_HERE') {
    console.warn('[CONFIG] ⚠️ Supabase belum dikonfigurasi!');
    console.warn('[CONFIG] Edit file: js/config.js dan isi SUPABASE_URL + SUPABASE_ANON_KEY');
    return false;
  }

  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    console.log('[CONFIG] ✅ Supabase client berhasil diinisialisasi');
    return true;
  } catch (error) {
    console.error('[CONFIG] Gagal inisialisasi Supabase:', error);
    return false;
  }
}

/**
 * Cek apakah Supabase sudah dikonfigurasi
 */
function isSupabaseReady() {
  return supabaseClient !== null;
}
