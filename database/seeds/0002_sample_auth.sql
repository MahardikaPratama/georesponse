/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Seeds a minimal permission set, an "administrator" role

	granted all of them, and one demo user assigned that role, so the
	authentication and authorization use cases have real data to
	exercise beyond unit tests with fakes. The demo password below
	("ChangeMe123!") is a local-development-only placeholder, never a
	real credential; its hash was generated with
	georesponse-be/scripts/hashpw.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
  - 1.1.0 (2026-09-20): Every INSERT is ON CONFLICT DO NOTHING, so the seed
    can be re-run against an already-seeded database (scripts/dev/setup.sh,
    scripts/database/seed.sh) without failing on duplicate keys.
*/

INSERT INTO permissions (id, code, name) VALUES
    ('permission-001', 'resource.create', 'Create Resource'),
    ('permission-002', 'resource.read', 'Read Resource'),
    ('permission-003', 'resource.update', 'Update Resource'),
    ('permission-004', 'resource.delete', 'Delete Resource'),
    ('permission-005', 'role.read', 'View Roles'),
    ('permission-006', 'role.manage', 'Manage Roles'),
    ('permission-007', 'permission.read', 'View Permissions'),
    ('permission-008', 'audit.read', 'View Audit Trail')
ON CONFLICT DO NOTHING;

INSERT INTO roles (id, name) VALUES
    ('role-001', 'administrator')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role-001', id FROM permissions
ON CONFLICT DO NOTHING;

-- Demo login: identifier "user-001", password "ChangeMe123!" (change
-- before any non-local use).
INSERT INTO users (id, name, password_hash) VALUES
    ('user-001', 'Demo Administrator', '$2a$10$MVW4kZttJVAG75rPtrVsIeIUPDsMwHI1iJYSGTXqHnP3DJj58PnKi')
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id) VALUES
    ('user-001', 'role-001')
ON CONFLICT DO NOTHING;
