# Demo Accounts

The local database is seeded with two accounts so you can test both full
access and the "access denied" path (FR-032, BR-027). They exist only in the
local database (the Docker `georesponse-db` service or a local PostgreSQL you
seeded yourself).

**Use these accounts only in a local environment.** The password is a
development placeholder, not a production credential.

| Field | Administrator | Response Coordinator |
|---|---|---|
| Identifier (login) | `user-001` | `user-002` |
| Password | `ChangeMe123!` | `ChangeMe123!` |
| Name | Demo Administrator | Demo Response Coordinator |
| Role | `administrator` | `coordinator` |
| Permissions | All: `resource.create`, `resource.read`, `resource.update`, `resource.delete`, `role.read`, `role.manage`, `permission.read`, `audit.read` | `resource.read` only |

The coordinator matches the Response Coordinator in
[`docs/01_product/DOMAIN_MODEL.md`](docs/01_product/DOMAIN_MODEL.md): someone
who monitors resources but does not manage them. Signed in as `user-002`,
every write (create, update, delete, relocate, or change status) and every
admin screen (roles, permissions, audit trail) returns 403. That is the
expected behavior.

## How to Use

1. Start the stack with `./run.sh` (or `.\run.ps1` on Windows). A new
   database volume is migrated and seeded automatically. If you run a native
   PostgreSQL instead, apply the migrations and seeds with
   `scripts/database/migrate.sh` and `scripts/database/seed.sh` (`.ps1` on
   Windows).
2. Open <http://localhost:5173>.
3. Sign in with one of the identifier and password pairs above.

## Sources

- Seeds: `database/seeds/0002_sample_auth.sql` (administrator) and
  `database/seeds/0003_sample_auth_coordinator.sql` (coordinator).
- Login endpoint: `POST /api/v1/auth/login`, see
  `docs/04_contracts/API_CONTRACT.md` section 5.
- Session: an HttpOnly cookie that holds a signed token, also described in
  `docs/04_contracts/API_CONTRACT.md` section 5.
