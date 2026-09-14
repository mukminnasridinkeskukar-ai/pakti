# PAKTI - Pengelolaan Angka Kredit Integrasi

> Aplikasi web untuk pengelolaan Angka Kredit PNS di lingkungan Pemerintah Kabupaten Kutai Kartanegara.
> Frontend statis (HTML/CSS/JS) untuk deploy ke **GitHub Pages** + backend **Supabase** (PostgreSQL + Storage).

---

## 📁 Struktur Project

```
pakti-app/
├── index.html                  # Entry point - buka file ini di browser
├── .nojekyll                    # Disable Jekyll processing untuk GitHub Pages
├── README.md                    # Dokumentasi ini
│
├── css/                         # Stylesheets modular (lebih ringan & mudah maintain)
│   ├── variables.css            # CSS Variables & design tokens
│   ├── base.css                 # Reset & typography
│   ├── layout.css               # Sidebar, main-content, top-bar
│   ├── components.css           # Cards, badges, buttons, stats
│   ├── forms.css                # Form inputs & file upload
│   ├── tables.css               # Tables & pagination
│   ├── modals.css               # Modals, toasts, lightbox
│   ├── pages.css                # Cek Status & PAK Terbit page
│   ├── splash.css               # Splash screen / loading
│   ├── petunjuk.css             # Petunjuk penggunaan page
│   └── responsive.css           # Media queries
│
├── js/                          # JavaScript modules
│   ├── config.js                # ⚠️ Konfigurasi Supabase URL & anon key
│   ├── supabase-client.js       # API wrapper ke Supabase (CRUD + Storage)
│   ├── auth.js                  # Login/logout logic
│   ├── navigation.js            # Pindah-pindah halaman
│   ├── dashboard.js             # Halaman Dashboard (stats + charts)
│   ├── formulir.js              # Form pengajuan + upload dokumen
│   ├── tracking.js              # Halaman Pemantauan Proses
│   ├── pak-terbit.js            # Halaman Cek PAK Terbit
│   ├── cek-status.js            # Halaman Cek Status + Update Perbaikan
│   ├── petunjuk.js              # Halaman Petunjuk Penggunaan
│   ├── admin.js                 # Halaman Admin Panel (CRUD)
│   ├── pagination.js            # Helper pagination
│   ├── modals.js                # Modal & lightbox helpers
│   ├── toast.js                 # Toast notifications
│   ├── utils.js                 # Utility functions (escapeHtml, formatDate, dll)
│   ├── demo-users.js            # Fallback credentials offline (testing)
│   ├── app.js                   # Inisialisasi app
│   └── splash.js                # Animasi splash screen
│
└── supabase/                    # SQL untuk setup database
    ├── schema.sql               # Buat tabel pengajuan_pak & admin_users + storage bucket
    ├── policies.sql             # Row Level Security (RLS) policies
    └── seed.sql                 # Data awal: admin users + sample data
```

---

## 🚀 Quick Start (Lokal)

### 1. Konfigurasi Supabase

Edit file `js/config.js`, isi dengan kredensial project Supabase Anda:

```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY_HERE';
```

### 2. Setup Database Supabase

Buka **Supabase Dashboard → SQL Editor** dan run 3 file SQL secara berurutan:

1. Copy-paste isi `supabase/schema.sql` → **Run**
2. Copy-paste isi `supabase/policies.sql` → **Run**
3. Copy-paste isi `supabase/seed.sql` → **Run** (untuk insert admin users)

### 3. Jalankan Aplikasi

**Opsi A — Buka langsung di browser:**
- Double-click `index.html` → aplikasi langsung jalan

**Opsi B — Pakai local server (recommended, supaya fetch/storage jalan):**
```bash
# Pilih salah satu:
# Python:
python3 -m http.server 8000

# Node.js (http-server):
npx http-server -p 8000

# Lalu buka di browser:
# http://localhost:8000
```

### 4. Login Default

Setelah run `seed.sql`, gunakan credentials berikut:

| Username             | Password           | Role  | Akses                 |
| -------------------- | ------------------ | ----- | --------------------- |
| `admin`              | `paktiadmin2026`   | admin | Semua data + Admin Panel |
| `dinkes`             | `sdmk001@`         | sdmk  | Hanya data Dinas Kesehatan |
| `puskesmassamboja`   | `sdmk025@`         | sdmk  | Hanya data Puskesmas Samboja |

---

## 🌐 Deploy ke GitHub Pages

### Step 1: Buat Repository GitHub

1. Login ke [github.com](https://github.com)
2. Klik **New repository**
3. Nama repo: `pakti-app` (atau apa saja)
4. Visibility: **Public** (gratis) atau Private (butuh GitHub Pro)
5. Klik **Create repository**

### Step 2: Upload Project

**Opsi A — Upload via Web:**
- Drag semua isi folder `pakti-app/` ke halaman repo GitHub

**Opsi B — Upload via Git CLI:**
```bash
cd pakti-app
git init
git add .
git commit -m "Initial commit: PAKTI app"
git branch -M main
git remote add origin https://github.com/USERNAME/pakti-app.git
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. Buka repo di GitHub → tab **Settings**
2. Sidebar kiri → **Pages**
3. Source: **Deploy from a branch**
4. Branch: `main` → Folder: `/ (root)`
5. Klik **Save**
6. Tunggu 1-2 menit, lalu refresh halaman → URL akan muncul:
   ```
   https://USERNAME.github.io/pakti-app/
   ```

### Step 4: Update Supabase untuk Domain GitHub

1. Buka **Supabase Dashboard → Authentication → URL Configuration**
2. Pada **Site URL**, isi: `https://USERNAME.github.io/pakti-app/`
3. Pada **Redirect URLs**, tambahkan URL yang sama
4. Klik **Save**

### Step 5: Test

Buka URL GitHub Pages Anda di browser → aplikasi harus jalan!

---

## 🔧 Konfigurasi Lanjutan

### Ubah Nama Tabel atau Storage Bucket

Edit `js/config.js`:
```javascript
const TABLE_PENGAJUAN = 'pengajuan_pak';    // nama tabel utama
const TABLE_ADMIN_USERS = 'admin_users';    // nama tabel admin
const STORAGE_BUCKET = 'pakti-dokumen';    // nama storage bucket
```

### Ubah Ukuran File Maksimal

Edit `js/formulir.js`, cari `fileConfig`:
```javascript
const fileConfig = {
  foto: { maxSize: 2 * 1024 * 1024, ... },        // 2MB → ubah sesuai kebutuhan
  skPangkat: { maxSize: 1 * 1024 * 1024, ... },   // 1MB
  // dst.
};
```

### Tambah User Baru

**Opsi 1 — via SQL Editor:**
```sql
INSERT INTO admin_users (username, password, role, nama, satuan_kerja)
VALUES ('username_baru', 'password_aman', 'sdmk', 'Nama Lengkap', 'UPTD Puskesmas XXX');
```

**Opsi 2 — via Supabase Dashboard:**
- Table Editor → `admin_users` → Insert row

### Tambah Satuan Kerja Baru

Edit `index.html` pada bagian `<select id="satuanKerja">` (formulir), `<select id="trackingFilterSatker">`, dan `<select id="adminFilterSatker">` — tambahkan `<option>` baru.

Untuk form update perbaikan (cek status), edit juga array `satkerOptions` di `js/cek-status.js` pada fungsi `populateUpdateFormOptions()`.

---

## 🔒 Security Notes

### ⚠️ Yang Perlu Diubah untuk Production

1. **Password Hashing**
   - Saat ini password disimpan plaintext di tabel `admin_users`
   - **WAJIB** hash dengan bcrypt sebelum production
   - Gunakan Supabase Edge Function untuk verify login

2. **RLS Policies**
   - Default policies membolehkan anon user update/delete
   - **WAJIB** restrict: hanya admin yang bisa update/delete
   - Lihat comment di `supabase/policies.sql`

3. **Storage Access**
   - Bucket `pakti-dokumen` sebaiknya private di production
   - Generate signed URL untuk akses dokumen

4. **API Keys**
   - Jangan commit `service_role` key ke repo public!
   - Hanya `anon public` key yang aman untuk frontend

---

## 📋 Features

### 🆕 Pembuatan PAK Integrasi (Generate PDF)

Menu khusus admin untuk generate dokumen PAK Integrasi siap printout:

1. Buka menu **"Pembuatan PAK Integrasi"** di sidebar
2. Pilih pegawai dari dropdown (otomatis dari database pengajuan)
3. Input Angka Kredit (Lama/Baru) untuk:
   - Pendidikan
   - Tugas Pokok / Jabatan
   - Pengembangan Profesi
   - Penunjang
4. Input Angka Kredit Minimal (Kebutuhan untuk kenaikan pangkat/jenjang)
5. Isi data Pejabat Penilai (nama, NIP, lokasi penetapan, tanggal)
6. Klik **"Generate PAK"** → preview dokumen muncul
7. Klik **"Print / Save as PDF"** → dialog print browser muncul
8. Pilih "Save as PDF" sebagai destination → simpan file PDF

**Fitur:**
- ✅ Kop surat otomatis (Pemerintah Kab. Kukar - Dinas Kesehatan)
- ✅ Format dokumen resmi (Times New Roman, A4)
- ✅ Auto-hitung Total Angka Kredit (Lama + Baru + Jumlah)
- ✅ Auto-hitung Kekurangan/Kelebihan AK
- ✅ Field Rekomendasi
- ✅ Tanda tangan pejabat penilai
- ✅ Print langsung dari browser (no server-side rendering)

### 🆕 Upload Massal CSV

Upload banyak data pengajuan sekaligus via file CSV:

1. Buka **Admin Panel** → klik tombol **"Upload Massal CSV"**
2. Download template CSV (otomatis terisi 2 contoh data)
3. Edit CSV dengan data Anda (Excel / Google Sheets / text editor)
4. Upload file CSV di modal → preview otomatis muncul
5. Validasi otomatis (cek NIP 18 digit, format tanggal, email, dll.)
6. Klik **"Upload ke Database"** → progress bar muncul
7. Selesai → data langsung masuk ke Supabase

**Format CSV (17 kolom):**
```
email,no_hp,nama,nip,no_karpeg,tempat_lahir,tanggal_lahir,
pendidikan,jenis_kelamin,pangkat_gol,tmt_pangkat,
jenis_jf,jenjang_jf,tmt_jf,masa_kerja_gol,satuan_kerja,
status,catatan_admin
```

### 🆕 Printout Admin Data

Tombol **"Printout"** di Admin Panel → print halaman tabel data (landscape A4).

### 🔒 Session & Redirect (Auto)

- **Browser baru** → otomatis redirect ke `https://mukminnasri.com` dulu, baru bisa masuk platform
- **Idle > 1 jam** → otomatis logout & redirect ke `https://mukminnasri.com`
- **Logout manual** → reset session, saat user kembali akan dialihkan lagi ke landing page
- Tracking aktivitas: mouse, keyboard, scroll, touch, focus tab
- Cek session expired tiap 1 menit + saat tab mendapat fokus kembali

**Konfigurasi** (di `js/config.js`):
```javascript
const LANDING_PAGE_URL = 'https://mukminnasri.com';  // URL landing page
const SESSION_TIMEOUT_MS = 60 * 60 * 1000;            // 1 jam (ms)
```

**Testing**:
- Buka aplikasi di browser baru → langsung redirect ke mukminnasri.com
- Diamkan 1 jam → redirect otomatis
- Untuk test cepat, ubah `SESSION_TIMEOUT_MS` jadi `30 * 1000` (30 detik)
- Untuk reset paksa: buka DevTools Console → `localStorage.clear()` lalu refresh

### Halaman Publik (tanpa login)
- ✅ **Dashboard Data** — statistik & grafik pengajuan
- ✅ **Formulir Pengajuan** — form + upload 4 dokumen
- ✅ **Pemantauan Proses** — tracking status
- ✅ **Cek PAK Terbit** — cari by NIP
- ✅ **Cek Status Pengajuan** — lihat status + update perbaikan
- ✅ **Petunjuk Penggunaan** — SOP, dasar hukum, kontak PIC

### Halaman Admin (butuh login)
- ✅ **Admin Panel** — kelola data (CRUD)
  - Edit data pengajuan
  - Update status (Menunggu → Perbaikan/Ditolak/Terbit)
  - Hapus data
  - Export CSV
  - Filter by JF, Status, Satker

### Fitur Teknis
- ✅ Splash screen animasi
- ✅ Toast notifications
- ✅ Modal dialogs (detail, edit, status, delete, view document)
- ✅ Lightbox preview image
- ✅ Drag & drop file upload
- ✅ File validation (type & size)
- ✅ Pagination (10 item per halaman)
- ✅ Search & filter real-time (debounced)
- ✅ Responsive design (mobile-friendly)
- ✅ Role-based menu (admin vs sdmk)
- ✅ Charts: pie, bar, line (Chart.js)

---

## 🆘 Troubleshooting

### Aplikasi blank / data tidak muncul

1. Buka **Browser DevTools** (F12) → tab **Console**
2. Cek error message
3. Pastikan:
   - `js/config.js` sudah diisi SUPABASE_URL & SUPABASE_ANON_KEY
   - Tabel `pengajuan_pak` sudah dibuat di Supabase
   - RLS policies sudah di-run
   - Internet stabil

### Login gagal

1. Pastikan tabel `admin_users` sudah di-seed (`supabase/seed.sql`)
2. Cek di Supabase Dashboard → Table Editor → `admin_users` → user ada & `is_active = true`
3. Cek password (case-sensitive)

### Upload file gagal

1. Cek di Supabase Dashboard → Storage → bucket `pakti-dokumen` ada
2. Cek storage policies sudah di-run (`supabase/policies.sql`)
3. Cek file size:
   - Foto: max 2MB
   - PDF: max 1MB
4. Cek file type:
   - Foto: JPG/JPEG/PNG
   - Dokumen: PDF only

### GitHub Pages masih 404

1. Tunggu 5-10 menit setelah enable Pages (provisioning)
2. Cek repo harus **public** (atau akun Pro)
3. Pastikan file `index.html` ada di root repo
4. Pastikan file `.nojekyll` ada (untuk disable Jekyll)

### CORS error di console

- Supabase secara default allow CORS dari semua origin
- Tapi pastikan **Site URL** di Supabase Authentication sudah diisi benar
- Buka: Supabase Dashboard → Authentication → URL Configuration → Site URL

---

## 📞 Kontak

- **Koordinator PAK**: Tarbiatul Adabiyah, SH., MH — 0812-5810-442
- **Tim IT Dinas Kesehatan**: 0821-3027-5800
- **Email**: sdmkdinkeskukar2024@gmail.com

---

## 📄 License

© 2026 Pemerintah Kabupaten Kutai Kartanegara. All rights reserved.
