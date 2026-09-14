-- ============================================
-- PAKTI - Supabase Database Schema
-- ============================================
-- File ini membuat tabel-tabel yang dibutuhkan
-- oleh aplikasi PAKTI.
--
-- Cara pakai:
-- 1. Buka Supabase Dashboard → SQL Editor
-- 2. New Query → copy paste semua isi file ini
-- 3. Klik "Run" untuk eksekusi
-- ============================================

-- ============================================
-- TABLE: pengajuan_pak
-- ============================================
-- Menyimpan data pengajuan PAK dari PNS
CREATE TABLE IF NOT EXISTS pengajuan_pak (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email               TEXT NOT NULL,
    no_hp               TEXT,
    nama                TEXT NOT NULL,
    nip                 TEXT UNIQUE NOT NULL,
    no_karpeg           TEXT,
    tempat_lahir        TEXT,
    tanggal_lahir       DATE,
    pendidikan          TEXT,
    jenis_kelamin       TEXT,
    pangkat_gol         TEXT,
    tmt_pangkat         DATE,
    jenis_jf            TEXT,
    jenjang_jf          TEXT,
    tmt_jf              DATE,
    masa_kerja_gol      TEXT,
    satuan_kerja        TEXT,

    -- Status pengajuan
    status              TEXT NOT NULL DEFAULT 'Menunggu'
                        CHECK (status IN ('Menunggu', 'Perbaikan', 'Ditolak', 'Terbit')),
    catatan_admin       TEXT DEFAULT '',

    -- URLs ke dokumen di Supabase Storage
    dok_foto_url                TEXT,
    dok_sk_pangkat_url          TEXT,
    dok_sk_jabfung_url          TEXT,
    dok_pak_konvensional_url    TEXT,

    -- Timestamps
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_pengajuan_pak_nip
    ON pengajuan_pak (nip);

CREATE INDEX IF NOT EXISTS idx_pengajuan_pak_status
    ON pengajuan_pak (status);

CREATE INDEX IF NOT EXISTS idx_pengajuan_pak_satuan_kerja
    ON pengajuan_pak (satuan_kerja);

CREATE INDEX IF NOT EXISTS idx_pengajuan_pak_created_at
    ON pengajuan_pak (created_at DESC);

-- Trigger untuk auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pengajuan_pak_updated_at ON pengajuan_pak;
CREATE TRIGGER trigger_pengajuan_pak_updated_at
    BEFORE UPDATE ON pengajuan_pak
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: admin_users
-- ============================================
-- Menyimpan credentials admin & operator satker
-- NOTE: Untuk production, gunakan Supabase Auth
--       dan table ini hanya untuk custom role mapping
CREATE TABLE IF NOT EXISTS admin_users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username    TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL, -- ⚠️ Sebaiknya hash bcrypt di server
    role        TEXT NOT NULL DEFAULT 'sdmk'
                CHECK (role IN ('admin', 'sdmk')),
    nama        TEXT NOT NULL,
    satuan_kerja TEXT DEFAULT 'all',  -- 'all' untuk admin, nama satker untuk sdmk
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_username
    ON admin_users (username);

-- ============================================
-- STORAGE BUCKET
-- ============================================
-- Buat storage bucket untuk menyimpan dokumen
INSERT INTO storage.buckets (id, name, public)
VALUES ('pakti-dokumen', 'pakti-dokumen', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE pengajuan_pak ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SELESAI
-- ============================================
-- Setelah file ini di-run, lanjutkan dengan:
-- 1. policies.sql  → setup RLS policies
-- 2. seed.sql      → insert data awal admin_users
-- ============================================
