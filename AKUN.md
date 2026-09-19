# Akun Demo (Local Development)

Akun-akun ini dibuat oleh seed `database/seeds/0002_sample_auth.sql` dan
`0003_sample_auth_coordinator.sql`, dan hanya berlaku untuk database lokal
(Docker `georesponse-db`). **Jangan pernah dipakai di lingkungan selain
lokal** — password di bawah ini adalah placeholder pengembangan, bukan
kredensial produksi.

Ada dua akun dengan role berbeda, supaya skenario "akses ditolak" (FR-032,
BR-027 — lihat `IMPLEMENTATION_CHECKLIST.md` section 9.10) juga bisa
ditest, bukan cuma skenario full-access:

| Field | Administrator | Response Coordinator |
|---|---|---|
| Identifier (login) | `user-001` | `user-002` |
| Password | `ChangeMe123!` | `ChangeMe123!` |
| Nama | Demo Administrator | Demo Response Coordinator |
| Role | `administrator` | `coordinator` |
| Permission | Semua: `resource.create/read/update/delete`, `role.read`, `role.manage`, `permission.read`, `audit.read` | Hanya `resource.read` (read-only, sesuai `docs/01_product/DOMAIN_MODEL.md`'s "Response Coordinator": monitor, bukan mengelola resource) |

Login sebagai `user-002` harus **ditolak** (403) untuk semua operasi tulis
(create/update/delete/relocate/change-status resource) dan semua layar
admin (roles/permissions/audit-logs) — itu justru perilaku yang benar,
bukan bug.

## Cara pakai

1. Pastikan database sudah di-migrate dan di-seed:
   ```powershell
   scripts\database\migrate.ps1
   scripts\database\seed.ps1
   ```
2. Jalankan backend (`georesponse-be`) dan frontend (`georesponse-fe`).
3. Di halaman login, isi salah satu pasangan identifier/password di atas.

## Sumber

- Kredensial ini didefinisikan di `database/seeds/0002_sample_auth.sql`
  (administrator) dan `database/seeds/0003_sample_auth_coordinator.sql`
  (coordinator).
- Endpoint login: `POST /api/v1/auth/login` (lihat
  `docs/04_contracts/API_CONTRACT.md` section 5).
- Mekanisme sesi: HttpOnly cookie berisi signed token (lihat catatan Phase 4
  di `IMPLEMENTATION_CHECKLIST.md` section 7).
