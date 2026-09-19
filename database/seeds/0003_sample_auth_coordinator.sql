/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Seeds a second, deliberately limited role and demo user —

	"coordinator" (a Response Coordinator: monitors resources but does
	not manage resource records) — alongside 0002's "administrator".
	0002 alone could not exercise the permission-denied paths (verifying
	that a caller without permission is redirected/blocked), since every
	seeded account had every permission. This role is granted only
	resource.read: attempting any write (resource.create/update/delete)
	or any admin action (role.manage, permission.read, audit.read) as
	this user must be denied. The demo password below ("ChangeMe123!")
	is a local-development-only placeholder, never a real credential;
	its hash was generated with georesponse-be/scripts/hashpw.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
  - 1.1.0 (2026-09-20): Every INSERT is ON CONFLICT DO NOTHING, so the seed
    can be re-run against an already-seeded database (scripts/dev/setup.sh,
    scripts/database/seed.sh) without failing on duplicate keys.
*/

INSERT INTO roles (id, name) VALUES
    ('role-002', 'coordinator')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
VALUES ('role-002', 'permission-002')
ON CONFLICT DO NOTHING; -- resource.read only

-- Demo login: identifier "user-002", password "ChangeMe123!" (change
-- before any non-local use).
INSERT INTO users (id, name, password_hash) VALUES
    ('user-002', 'Demo Response Coordinator', '$2a$10$sTc2NdpMikTzCLKPrMOKBuB24aCHkKTxptZZ1pzipARSqGcmFhrRy')
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id) VALUES
    ('user-002', 'role-002')
ON CONFLICT DO NOTHING;
