-- ============================================
-- PAKTI - Seed Data (Initial Data)
-- ============================================
-- File ini mengisi data awal:
-- 1. Admin users (credentials untuk login)
-- 2. Sample pengajuan (untuk testing)
--
-- Cara pakai:
-- 1. Buka Supabase Dashboard → SQL Editor
-- 2. New Query → copy paste semua isi file ini
-- 3. Klik "Run" untuk eksekusi
-- ============================================

-- ============================================
-- 1. ADMIN USERS (untuk login)
-- ============================================
-- ⚠️ GANTI PASSWORD SEBELUM PRODUCTION!
-- Password default: admin → paktiadmin2026
-- Password default: dinkes → sdmk001@

INSERT INTO admin_users (username, password, role, nama, satuan_kerja) VALUES
    ('admin', 'paktiadmin2026', 'admin', 'Administrator', 'all'),
    ('dinkes', 'sdmk001@', 'sdmk', 'Dinas Kesehatan', 'Dinas Kesehatan'),
    ('puskesmassamboja', 'sdmk025@', 'sdmk', 'UPTD Puskesmas Samboja', 'UPTD Puskesmas Samboja'),
    ('puskesmasloajanan', 'sdmk012@', 'sdmk', 'UPTD Puskesmas Loa Janan', 'UPTD Puskesmas Loa Janan'),
    ('rsudamp', 'sdmk034@', 'sdmk', 'RSUD Aji Muhammad Parikesit', 'RSUD Aji Muhammad Parikesit'),
    ('rsudamidris', 'sdmk039@', 'sdmk', 'RSUD Aji Muhammad Idris', 'RSUD Aji Muhammad Idris')
ON CONFLICT (username) DO NOTHING;

-- ============================================
-- 2. SAMPLE PENGAJUAN (untuk demo)
-- ============================================
-- Hapus comment jika ingin insert sample data
-- ATAU hapus baris-baris ini jika ingin mulai dari tabel kosong

/*
INSERT INTO pengajuan_pak (
    email, no_hp, nama, nip, no_karpeg,
    tempat_lahir, tanggal_lahir, pendidikan, jenis_kelamin,
    pangkat_gol, tmt_pangkat, jenis_jf, jenjang_jf, tmt_jf,
    masa_kerja_gol, satuan_kerja, status, catatan_admin
) VALUES
    (
        'contoh1@email.com', '081234567890', 'Ns. Mukmin Nasri, S.Kep',
        '197001012020011001', 'PEP-2024-001',
        'Tenggarong', '1970-01-01', 'S1', 'Laki-laki',
        'Penata Muda - III/a Ahli Pertama', '2020-01-01',
        'Perawat', 'Pertama', '2020-07-01',
        '05 Tahun 03 Bulan', 'UPTD Puskesmas Samboja',
        'Menunggu', ''
    ),
    (
        'contoh2@email.com', '081234567891', 'dr. Budi Santoso, Sp.A',
        '198005122010012002', 'PEP-2024-002',
        'Samarinda', '1980-05-12', 'Spesialis', 'Laki-laki',
        'Penata - III/c Ahli Muda', '2018-01-01',
        'Dokter', 'Muda', '2018-07-01',
        '07 Tahun 02 Bulan', 'RSUD Aji Muhammad Parikesit',
        'Terbit', 'SK PAK telah diterbitkan'
    ),
    (
        'contoh3@email.com', '081234567892', 'Siti Aminah, A.Md.Keb',
        '199003152015032003', 'PEP-2024-003',
        'Balikpapan', '1990-03-15', 'D3', 'Perempuan',
        'Penata Muda - III/a Ahli Pertama', '2019-01-01',
        'Bidan', 'Pertama', '2019-07-01',
        '06 Tahun 00 Bulan', 'UPTD Puskesmas Loa Janan',
        'Perbaikan', 'Mohon lengkapi upload SK Pangkat terbaru'
    )
ON CONFLICT (nip) DO NOTHING;
*/

-- ============================================
-- SELESAI
-- ============================================
-- Setelah ini, login dengan:
-- - Username: admin
-- - Password: paktiadmin2026
-- ============================================
