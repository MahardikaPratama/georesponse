/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Seeds a second, deliberately limited role and demo user —

	"coordinator" (docs/01_product/DOMAIN_MODEL.md's "Response
	Coordinator": monitors resources but does not manage resource
	records) — alongside 0002's "administrator". 0002 alone could not
	exercise the permission-denied paths of FR-032/BR-027 (UC-12's
	"Verify a caller without permission is redirected/blocked", Phase 6
	checklist section 9.10), since every seeded account had every
	permission. This role is granted only resource.read: attempting any
	write (resource.create/update/delete) or any admin action
	(role.manage, permission.read, audit.read) as this user must be
	denied. The demo password below ("ChangeMe123!") is a
	local-development-only placeholder, never a real credential; its
	hash was generated with georesponse-be/scripts/hashpw.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/

INSERT INTO roles (id, name) VALUES
    ('role-002', 'coordinator');

INSERT INTO role_permissions (role_id, permission_id)
VALUES ('role-002', 'permission-002'); -- resource.read only

-- Demo login: identifier "user-002", password "ChangeMe123!" (change
-- before any non-local use).
INSERT INTO users (id, name, password_hash) VALUES
    ('user-002', 'Demo Response Coordinator', '$2a$10$sTc2NdpMikTzCLKPrMOKBuB24aCHkKTxptZZ1pzipARSqGcmFhrRy');

INSERT INTO user_roles (user_id, role_id) VALUES
    ('user-002', 'role-002');
