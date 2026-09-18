-- ============================================
-- MIGRATION: Tambah kolom nomor_register ke tabel pengajuan_pak
-- ============================================
-- Jalankan script ini jika tabel pengajuan_pak sudah ada
-- tapi belum punya kolom nomor_register
-- ============================================

-- Tambah kolom nomor_register jika belum ada
ALTER TABLE pengajuan_pak ADD COLUMN IF NOT EXISTS nomor_register TEXT UNIQUE;

-- Update record yang belum punya nomor register
UPDATE pengajuan_pak
SET nomor_register = 'PAKTI-' || to_char(created_at, 'YYYYMMDD') || '-' || (1000 + floor(random() * 9000))::text
WHERE nomor_register IS NULL;

-- Verifikasi
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'pengajuan_pak' AND column_name = 'nomor_register';
