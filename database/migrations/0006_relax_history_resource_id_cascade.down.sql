/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Reverses 0006_relax_history_resource_id_cascade.up.sql,

	restoring ON DELETE CASCADE and NOT NULL on the three resource
	history tables' resource_id column.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/

DELETE FROM resource_status_history WHERE resource_id IS NULL;
ALTER TABLE resource_status_history
    DROP CONSTRAINT resource_status_history_resource_id_fkey,
    ADD CONSTRAINT resource_status_history_resource_id_fkey
        FOREIGN KEY (resource_id) REFERENCES resources (id) ON DELETE CASCADE,
    ALTER COLUMN resource_id SET NOT NULL;

DELETE FROM resource_location_history WHERE resource_id IS NULL;
ALTER TABLE resource_location_history
    DROP CONSTRAINT resource_location_history_resource_id_fkey,
    ADD CONSTRAINT resource_location_history_resource_id_fkey
        FOREIGN KEY (resource_id) REFERENCES resources (id) ON DELETE CASCADE,
    ALTER COLUMN resource_id SET NOT NULL;

DELETE FROM resource_change_history WHERE resource_id IS NULL;
ALTER TABLE resource_change_history
    DROP CONSTRAINT resource_change_history_resource_id_fkey,
    ADD CONSTRAINT resource_change_history_resource_id_fkey
        FOREIGN KEY (resource_id) REFERENCES resources (id) ON DELETE CASCADE,
    ALTER COLUMN resource_id SET NOT NULL;
