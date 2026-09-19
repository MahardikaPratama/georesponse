/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Reverses 0002_create_auth_tables.up.sql by dropping the
               authentication/authorization tables in dependency order.

Changelog:
- 1.0.0 (2026-09-19): Initial creation.
*/

DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;
