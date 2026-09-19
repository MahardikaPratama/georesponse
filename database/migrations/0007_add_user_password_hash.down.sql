/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Reverses 0007_add_user_password_hash.up.sql.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/

ALTER TABLE users DROP COLUMN password_hash;
