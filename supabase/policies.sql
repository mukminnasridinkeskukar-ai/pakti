-- ============================================
-- PAKTI - Supabase Row Level Security (RLS) Policies
-- ============================================
-- File ini mengatur kebijakan akses ke tabel.
--
-- ⚠️ PENTING:
-- Untuk production, GANTI policy "anon select/insert"
-- dengan autentikasi Supabase Auth yang sesungguhnya.
-- Konfigurasi saat ini memungkinkan:
-- - Anon user: bisa insert (submit pengajuan) & select (untuk cek status)
-- - Admin user: bisa update/delete (manual via dashboard)
-- ============================================

-- ============================================
-- POLICIES: pengajuan_pak
-- ============================================

-- DROP existing policies (jika ada) supaya bisa di-recreate
DROP POLICY IF EXISTS "Allow public read pengajuan_pak" ON pengajuan_pak;
DROP POLICY IF EXISTS "Allow public insert pengajuan_pak" ON pengajuan_pak;
DROP POLICY IF EXISTS "Allow public update pengajuan_pak" ON pengajuan_pak;
DROP POLICY IF EXISTS "Allow public delete pengajuan_pak" ON pengajuan_pak;

-- 1. SELECT: Anyone can read (untuk dashboard & cek status)
CREATE POLICY "Allow public read pengajuan_pak"
    ON pengajuan_pak
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- 2. INSERT: Anyone can submit new pengajuan
CREATE POLICY "Allow public insert pengajuan_pak"
    ON pengajuan_pak
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- 3. UPDATE: Anyone can update (untuk admin & user update perbaikan)
--    ⚠️ DI PRODUCTION: batasi hanya untuk admin!
CREATE POLICY "Allow public update pengajuan_pak"
    ON pengajuan_pak
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 4. DELETE: Anyone can delete (untuk admin)
--    ⚠️ DI PRODUCTION: batasi hanya untuk admin!
CREATE POLICY "Allow public delete pengajuan_pak"
    ON pengajuan_pak
    FOR DELETE
    TO anon, authenticated
    USING (true);

-- ============================================
-- POLICIES: admin_users
-- ============================================
DROP POLICY IF EXISTS "Allow public read admin_users" ON admin_users;

-- SELECT only (untuk verifikasi login)
-- ⚠️ DI PRODUCTION: jangan expose password! Hash & verify di server (Edge Function)
CREATE POLICY "Allow public read admin_users"
    ON admin_users
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

-- ============================================
-- POLICIES: data_master (Sheet DATA)
-- ============================================
DROP POLICY IF EXISTS "Allow public read data_master" ON data_master;
DROP POLICY IF EXISTS "Allow public insert data_master" ON data_master;
DROP POLICY IF EXISTS "Allow public update data_master" ON data_master;
DROP POLICY IF EXISTS "Allow public delete data_master" ON data_master;

CREATE POLICY "Allow public read data_master"
    ON data_master
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Allow public insert data_master"
    ON data_master
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Allow public update data_master"
    ON data_master
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow public delete data_master"
    ON data_master
    FOR DELETE
    TO anon, authenticated
    USING (true);

-- ============================================
-- STORAGE POLICIES
-- ============================================
-- Allow public upload & read dokumen
-- (Untuk pengajuan dari PNS yang belum login)

-- Drop existing
DROP POLICY IF EXISTS "Allow public upload pakti-dokumen" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read pakti-dokumen" ON storage.objects;

-- Allow upload (untuk semua user)
CREATE POLICY "Allow public upload pakti-dokumen"
    ON storage.objects
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (bucket_id = 'pakti-dokumen');

-- Allow read (untuk semua user)
CREATE POLICY "Allow public read pakti-dokumen"
    ON storage.objects
    FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'pakti-dokumen');

-- ============================================
-- CARA LEBIH AMAN (PRODUCTION)
-- ============================================
-- 1. Disable anon access di Supabase Dashboard → Authentication → Settings
-- 2. Buat Supabase Edge Function untuk handle login & verify password
-- 3. Update config.js: gunakan service_role key (di server) atau
--    pakai Supabase Auth dengan email/password
-- 4. Set RLS policy lebih ketat:
--    - SELECT pengajuan_pak: hanya untuk authenticated user
--    - UPDATE/DELETE: hanya untuk admin (cek role via auth.uid())
-- ============================================
