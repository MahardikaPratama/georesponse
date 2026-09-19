-- Author       : Mahardika Pratama
-- Version      : 1.0.0
-- Created Date : 2026-09-19
-- Description  : Reverses 0003_create_history_tables.up.sql by dropping
--                the three resource history tables.
--
-- Changelog:
-- - 1.0.0 (2026-09-19): Initial creation.

DROP TABLE IF EXISTS resource_change_history;
DROP TABLE IF EXISTS resource_location_history;
DROP TABLE IF EXISTS resource_status_history;
