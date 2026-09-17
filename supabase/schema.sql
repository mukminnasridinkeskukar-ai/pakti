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
    nomor_register      TEXT UNIQUE,
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
-- TABLE: data_master (SHEET DATA - sumber untuk Pembuatan PAK)
-- ============================================
-- Tabel ini menyimpan data master pegawai + Angka Kredit
-- yang digunakan untuk generate dokumen PAK Integrasi.
-- Terpisah dari tabel pengajuan_pak (Formulir Pengajuan publik).
CREATE TABLE IF NOT EXISTS data_master (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- === KETERANGAN PERORANGAN (Sheet DATA kolom 1-13) ===
    nip                 TEXT UNIQUE NOT NULL,
    nama                TEXT NOT NULL,
    no_karpeg           TEXT,
    tempat_lahir        TEXT,
    tanggal_lahir       DATE,
    pendidikan          TEXT,
    jenis_kelamin       TEXT,
    pangkat             TEXT,
    golongan            TEXT,
    tmt_pangkat         DATE,
    jabatan_jf          TEXT,
    tmt_jf              DATE,
    masa_kerja_gol      TEXT,
    unit_kerja          TEXT,
    instansi            TEXT DEFAULT 'Dinas Kesehatan Kab. Kutai Kartanegara',

    -- === AK LAMA (Konvensional - Unsur Utama & Penunjang) ===
    ak_lama_pendidikan          NUMERIC DEFAULT 0,
    ak_lama_tugas_pokok         NUMERIC DEFAULT 0,
    ak_lama_pengembangan        NUMERIC DEFAULT 0,
    ak_lama_penunjang           NUMERIC DEFAULT 0,

    -- === AK BARU (Konvensional - Unsur Utama & Penunjang) ===
    ak_baru_pendidikan          NUMERIC DEFAULT 0,
    ak_baru_tugas_pokok         NUMERIC DEFAULT 0,
    ak_baru_pengembangan        NUMERIC DEFAULT 0,
    ak_baru_penunjang           NUMERIC DEFAULT 0,

    -- === AK MINIMAL (Kebutuhan untuk kenaikan) ===
    ak_minimal_pangkat          NUMERIC DEFAULT 0,
    ak_minimal_jenjang          NUMERIC DEFAULT 0,
    ak_minimal_pengembangan     NUMERIC DEFAULT 0,

    -- === NILAI DASAR (untuk Integrasi) ===
    nilai_das                   NUMERIC DEFAULT 0,

    -- === PENILAIAN KINERJA (untuk Akumulasi AK) ===
    periode_penilaian           TEXT,
    tahun_penilaian             INTEGER,
    bulan_penilaian             INTEGER DEFAULT 12,
    predikat_kinerja            TEXT DEFAULT 'Baik',

    -- === PENETAPAN & PEJABAT ===
    tanggal_penetapan           DATE,
    lokasi_penetapan            TEXT DEFAULT 'Tenggarong',
    nama_pejabat                TEXT,
    nip_pejabat                 TEXT,
    rekomendasi                 TEXT,

    -- === TIMESTAMP ===
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_master_nip ON data_master (nip);
CREATE INDEX IF NOT EXISTS idx_data_master_nama ON data_master (nama);

-- Trigger untuk auto-update updated_at
DROP TRIGGER IF EXISTS trigger_data_master_updated_at ON data_master;
CREATE TRIGGER trigger_data_master_updated_at
    BEFORE UPDATE ON data_master
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: dokumen_pak (Editor Dokumen PAK)
-- ============================================
-- Menyimpan dokumen PAK yang sudah di-edit oleh admin
-- Menggunakan rich text editor (TinyMCE) - format HTML
CREATE TABLE IF NOT EXISTS dokumen_pak (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_master_id      UUID REFERENCES data_master(id) ON DELETE CASCADE,
    nip                 TEXT,
    nama                TEXT,
    judul               TEXT NOT NULL DEFAULT 'Penetapan Angka Kredit Integrasi',

    -- Konten dokumen (HTML dari TinyMCE)
    konten              TEXT,

    -- Pengaturan halaman (JSON)
    pengaturan_halaman  JSONB DEFAULT '{"size":"A4","orientation":"portrait","marginTop":15,"marginBottom":15,"marginLeft":18,"marginRight":18,"lineHeight":1.5,"paragraphSpacing":8}',

    -- Header & Footer (HTML)
    header_dokumen      TEXT,
    footer_dokumen      TEXT,

    -- Metadata editor
    status              TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'archived')),
    versi               INTEGER DEFAULT 1,
    last_edited_by      TEXT,
    last_edited_at      TIMESTAMPTZ,

    -- Timestamps
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dokumen_pak_data_master_id ON dokumen_pak (data_master_id);
CREATE INDEX IF NOT EXISTS idx_dokumen_pak_nip ON dokumen_pak (nip);
CREATE INDEX IF NOT EXISTS idx_dokumen_pak_status ON dokumen_pak (status);

DROP TRIGGER IF EXISTS trigger_dokumen_pak_updated_at ON dokumen_pak;
CREATE TRIGGER trigger_dokumen_pak_updated_at
    BEFORE UPDATE ON dokumen_pak
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: dokumen_pak_versions (Version History)
-- ============================================
-- Menyimpan riwayat perubahan dokumen untuk restore
CREATE TABLE IF NOT EXISTS dokumen_pak_versions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dokumen_id          UUID REFERENCES dokumen_pak(id) ON DELETE CASCADE,
    versi               INTEGER NOT NULL,
    konten              TEXT,
    pengaturan_halaman  JSONB,
    header_dokumen      TEXT,
    footer_dokumen      TEXT,
    edited_by           TEXT,
    edited_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    catatan_perubahan   TEXT
);

CREATE INDEX IF NOT EXISTS idx_dokumen_pak_versions_dokumen_id ON dokumen_pak_versions (dokumen_id);
CREATE INDEX IF NOT EXISTS idx_dokumen_pak_versions_versi ON dokumen_pak_versions (versi);

-- ============================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE pengajuan_pak ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE dokumen_pak ENABLE ROW LEVEL SECURITY;
ALTER TABLE dokumen_pak_versions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SELESAI
-- ============================================
-- Setelah file ini di-run, lanjutkan dengan:
-- 1. policies.sql  → setup RLS policies
-- 2. seed.sql      → insert data awal admin_users
-- ============================================
