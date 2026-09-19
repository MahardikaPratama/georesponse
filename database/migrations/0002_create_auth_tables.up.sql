/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Creates the authentication/authorization tables (users,
               roles, permissions, role_permissions, user_roles) backing
               the User/Role/Permission domain model.

Changelog:
- 1.0.0 (2026-09-19): Initial creation.
*/

CREATE TABLE IF NOT EXISTS roles (
    id    text PRIMARY KEY,
    name  text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS permissions (
    id    text PRIMARY KEY,
    code  text NOT NULL UNIQUE,   -- e.g. 'resource.update'
    name  text NOT NULL           -- e.g. 'Update Resource'
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id        text NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    permission_id  text NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users (
    id            text PRIMARY KEY,
    name          text NOT NULL,
    -- Authentication credentials (password hash, etc.) are deliberately
    -- excluded from this schema; they are not part of the general
    -- application data returned to clients.
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id  text NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role_id  text NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions (permission_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles (role_id);
