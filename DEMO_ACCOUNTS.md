# Demo Accounts (Local Development)

These accounts are created by the seeds `database/seeds/0002_sample_auth.sql`
and `0003_sample_auth_coordinator.sql`, and are only valid against the local
database (Docker `georesponse-db`). **Never use these outside a local
environment** — the password below is a development placeholder, not a
production credential.

There are two accounts with different roles, so the "access denied" scenario
(FR-032, BR-027 — see `IMPLEMENTATION_CHECKLIST.md` section 9.10) can be
tested too, not just the full-access scenario:

| Field | Administrator | Response Coordinator |
|---|---|---|
| Identifier (login) | `user-001` | `user-002` |
| Password | `ChangeMe123!` | `ChangeMe123!` |
| Name | Demo Administrator | Demo Response Coordinator |
| Role | `administrator` | `coordinator` |
| Permission | All: `resource.create/read/update/delete`, `role.read`, `role.manage`, `permission.read`, `audit.read` | Only `resource.read` (read-only, per `docs/01_product/DOMAIN_MODEL.md`'s "Response Coordinator": monitors, does not manage resources) |

Logging in as `user-002` must be **denied** (403) for every write operation
(create/update/delete/relocate/change-status on a resource) and every admin
screen (roles/permissions/audit-logs) — that is the correct behavior, not a
bug.

## How to use

1. Make sure the database has been migrated and seeded:
   ```powershell
   scripts\database\migrate.ps1
   scripts\database\seed.ps1
   ```
2. Run the backend (`georesponse-be`) and frontend (`georesponse-fe`).
3. On the login page, enter one of the identifier/password pairs above.

## Sources

- These credentials are defined in `database/seeds/0002_sample_auth.sql`
  (administrator) and `database/seeds/0003_sample_auth_coordinator.sql`
  (coordinator).
- Login endpoint: `POST /api/v1/auth/login` (see
  `docs/04_contracts/API_CONTRACT.md` section 5).
- Session mechanism: HttpOnly cookie containing a signed token (see the
  Phase 4 notes in `IMPLEMENTATION_CHECKLIST.md` section 7).
