-- ============================================================
-- BRIMOS Holiday Seed Data — Indonesian National Holidays
-- 2025 & 2026
-- ============================================================

INSERT INTO holidays (date, name, is_national) VALUES

-- ── 2025 ──────────────────────────────────────────────────
('2025-01-01', 'Tahun Baru Masehi 2025',                 TRUE),
('2025-01-27', 'Isra Miraj Nabi Muhammad SAW 1446 H',    TRUE),
('2025-01-29', 'Tahun Baru Imlek 2576 Kongzili',         TRUE),
('2025-03-29', 'Hari Raya Nyepi — Tahun Baru Saka 1947', TRUE),
('2025-03-31', 'Hari Raya Idul Fitri 1446 H',            TRUE),
('2025-04-01', 'Hari Raya Idul Fitri 1446 H (Hari Kedua)',TRUE),
('2025-04-18', 'Wafat Isa Almasih (Good Friday)',        TRUE),
('2025-05-01', 'Hari Buruh Internasional',               TRUE),
('2025-05-12', 'Hari Raya Waisak 2569 BE',               TRUE),
('2025-05-29', 'Kenaikan Isa Almasih',                   TRUE),
('2025-06-01', 'Hari Lahir Pancasila',                   TRUE),
('2025-06-06', 'Hari Raya Idul Adha 1446 H',             TRUE),
('2025-06-27', 'Tahun Baru Islam 1447 H',                TRUE),
('2025-08-17', 'Hari Kemerdekaan Republik Indonesia',    TRUE),
('2025-09-05', 'Maulid Nabi Muhammad SAW 1447 H',        TRUE),
('2025-12-25', 'Hari Raya Natal',                        TRUE),
('2025-12-26', 'Cuti Bersama Natal',                     FALSE),

-- ── 2025 Cuti Bersama (Joint Leave, treated as non-working) ──
('2025-01-28', 'Cuti Bersama Tahun Baru Imlek',          FALSE),
('2025-03-28', 'Cuti Bersama Nyepi',                     FALSE),
('2025-04-02', 'Cuti Bersama Idul Fitri',                FALSE),
('2025-04-03', 'Cuti Bersama Idul Fitri',                FALSE),
('2025-04-04', 'Cuti Bersama Idul Fitri',                FALSE),
('2025-04-07', 'Cuti Bersama Idul Fitri',                FALSE),
('2025-05-02', 'Cuti Bersama Hari Buruh',                FALSE),
('2025-05-13', 'Cuti Bersama Waisak',                    FALSE),
('2025-05-30', 'Cuti Bersama Kenaikan Isa Almasih',      FALSE),
('2025-06-02', 'Cuti Bersama Idul Adha',                 FALSE),
('2025-06-03', 'Cuti Bersama Idul Adha',                 FALSE),
('2025-06-04', 'Cuti Bersama Idul Adha',                 FALSE),
('2025-06-05', 'Cuti Bersama Idul Adha',                 FALSE),

-- ── 2026 ──────────────────────────────────────────────────
('2026-01-01', 'Tahun Baru Masehi 2026',                 TRUE),
('2026-02-17', 'Tahun Baru Imlek 2577 Kongzili',         TRUE),
('2026-03-19', 'Hari Raya Idul Fitri 1447 H',            TRUE),
('2026-03-20', 'Hari Raya Idul Fitri 1447 H (Hari Kedua)',TRUE),
('2026-04-03', 'Wafat Isa Almasih (Good Friday)',        TRUE),
('2026-04-17', 'Hari Raya Nyepi — Tahun Baru Saka 1948', TRUE),
('2026-05-01', 'Hari Buruh Internasional',               TRUE),
('2026-05-14', 'Kenaikan Isa Almasih',                   TRUE),
('2026-05-22', 'Hari Raya Waisak 2570 BE',               TRUE),
('2026-05-27', 'Hari Raya Idul Adha 1447 H',             TRUE),
('2026-06-01', 'Hari Lahir Pancasila',                   TRUE),
('2026-06-16', 'Tahun Baru Islam 1448 H',                TRUE),
('2026-08-17', 'Hari Kemerdekaan Republik Indonesia',    TRUE),
('2026-08-25', 'Maulid Nabi Muhammad SAW 1448 H',        TRUE),
('2026-12-25', 'Hari Raya Natal',                        TRUE),

-- ── 2026 Cuti Bersama (estimate) ──
('2026-02-16', 'Cuti Bersama Tahun Baru Imlek',          FALSE),
('2026-03-18', 'Cuti Bersama Idul Fitri',                FALSE),
('2026-03-23', 'Cuti Bersama Idul Fitri',                FALSE),
('2026-03-24', 'Cuti Bersama Idul Fitri',                FALSE),
('2026-04-16', 'Cuti Bersama Nyepi',                     FALSE),
('2026-05-15', 'Cuti Bersama Kenaikan Isa Almasih',      FALSE),
('2026-12-24', 'Cuti Bersama Natal',                     FALSE),
('2026-12-28', 'Cuti Bersama Natal',                     FALSE)

ON CONFLICT (date) DO NOTHING;
