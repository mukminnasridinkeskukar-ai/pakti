-- ============================================================
-- PAKTI - Migration: Kolom "PAK Integrasi Terbit"
-- Tabel   : pengajuan_pak
-- Tanggal : 2026-10-01
-- ============================================================
--
-- Deskripsi:
--   Menambahkan kolom baru `pak_integrasi_terbit` pada tabel
--   `pengajuan_pak` untuk menyimpan LINK dokumen PAK Integrasi
--   yang sudah terbit (URL dari Supabase Storage).
--   Kolom diisi OTOMATIS oleh aplikasi melalui menu admin
--   "Pembuatan PAK Integrasi" -> tombol "Upload Dokumen PAK Terbit"
--   (file diupload ke Storage folder pak-integrasi/, lalu URL-nya
--   dipasangkan ke baris pengajuan_pak sesuai NIP).
--   Tetap dapat diisi manual via Supabase Dashboard bila perlu.
--
-- Sifat migration:
--   - ADDITIVE ONLY: hanya menambah kolom baru.
--   - TIDAK mengubah / menghapus kolom, index, constraint,
--     policy, atau data yang sudah ada.
--   - IDEMPOTENT: aman dijalankan berulang kali
--     (menggunakan ADD COLUMN IF NOT EXISTS).
--
-- Cara menjalankan:
--   1. Buka https://supabase.com -> pilih project Anda.
--   2. Masuk ke menu "SQL Editor".
--   3. Copy seluruh isi file ini, paste, lalu klik "Run".
--   4. Selesai. Kolom baru muncul di Table Editor -> pengajuan_pak.
--
-- Cara mengisi link dokumen (manual oleh admin):
--   1. Upload file PDF/gambar ke Supabase Storage
--      (mis. bucket "pakti-dokumen", folder "pak-integrasi").
--   2. Klik file -> "Get URL" / copy public URL, contoh:
--      https://krnrxdlgbntfbhdsihjo.supabase.co/storage/v1/object/public/pakti-dokumen/pak-integrasi/197001012020011001.pdf
--   3. Buka Table Editor -> tabel pengajuan_pak -> cari baris
--      NIP yang sesuai -> paste URL ke kolom pak_integrasi_terbit.
--   4. Link otomatis tampil di menu "Cek PAK Terbit" dengan
--      tombol Preview dan Download.
-- ============================================================

-- Tambah kolom baru (aman dijalankan berulang)
ALTER TABLE pengajuan_pak
    ADD COLUMN IF NOT EXISTS pak_integrasi_terbit TEXT;

-- Catatan kolom untuk dokumentasi internal database
COMMENT ON COLUMN pengajuan_pak.pak_integrasi_terbit IS
    'Link dokumen PAK Integrasi terbit (URL publik dari Supabase Storage, diisi manual oleh admin)';

-- Verifikasi (opsional): jalankan untuk memastikan kolom sudah ada
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'pengajuan_pak'
--   AND column_name = 'pak_integrasi_terbit';
