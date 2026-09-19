-- Author       : Mahardika Pratama
-- Version      : 1.0.0
-- Created Date : 2026-09-19
-- Description  : Reverses 0001_create_resources.up.sql by dropping the
--                resources table (and its indexes, dropped implicitly with
--                the table).
--
-- Changelog:
-- - 1.0.0 (2026-09-19): Initial creation.

DROP TABLE IF EXISTS resources;
-- The postgis extension is intentionally not dropped here: other
-- migrations/tables may depend on it, and dropping an extension is a
-- database-wide, not migration-scoped, decision (DATABASE_MIGRATIONS.md
-- section 3).
