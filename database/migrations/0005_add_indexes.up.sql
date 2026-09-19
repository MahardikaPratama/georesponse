/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Reserved slot for an "add remaining indexes" step. As of
               this migration, every index the schema needs
               (resources.type/status/location, the three
               resource_*_history.resource_id indexes, the two
               audit_records lookup indexes plus occurred_at, and the
               role_permissions/user_roles join indexes) was already
               created inline with its owning table in migrations 0001-
               0004, so there is nothing left to add here. This
               migration is an intentional no-op that reserves the
               sequence number rather than duplicating an index CREATE
               statement across two migrations.

Changelog:
- 1.0.0 (2026-09-19): Initial creation (no-op; see Description).
*/

-- Intentionally empty: see Description above.
