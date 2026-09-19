# Akun Demo (Local Development)

Akun ini dibuat oleh seed `database/seeds/0002_sample_auth.sql` dan hanya
berlaku untuk database lokal (Docker `georesponse-db`). **Jangan pernah
dipakai di lingkungan selain lokal** — password di bawah ini adalah
placeholder pengembangan, bukan kredensial produksi.

| Field | Value |
|---|---|
| Identifier (login) | `user-001` |
| Password | `ChangeMe123!` |
| Nama | Demo Administrator |
| Role | `administrator` (semua permission: `resource.*`, `role.read`, `role.manage`, `permission.read`, `audit.read`) |

## Cara pakai

1. Pastikan database sudah di-migrate dan di-seed:
   ```powershell
   scripts\database\migrate.ps1
   scripts\database\seed.ps1
   ```
2. Jalankan backend (`georesponse-be`) dan frontend (`georesponse-fe`).
3. Di halaman login, isi:
   - Identifier: `user-001`
   - Password: `ChangeMe123!`

## Sumber

- Kredensial ini didefinisikan di `database/seeds/0002_sample_auth.sql`.
- Endpoint login: `POST /api/v1/auth/login` (lihat
  `docs/04_contracts/API_CONTRACT.md` section 5).
- Mekanisme sesi: HttpOnly cookie berisi signed token (lihat catatan Phase 4
  di `IMPLEMENTATION_CHECKLIST.md` section 7).
