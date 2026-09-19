/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Changes resource_id on the three resource history tables

	from ON DELETE CASCADE to ON DELETE SET NULL, matching
	audit_records' existing behavior. Resource deletion is a hard
	delete, but resource history must remain available after a
	resource is deleted; CASCADE silently destroyed that history
	instead, which contradicted that requirement.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/

ALTER TABLE resource_status_history
    ALTER COLUMN resource_id DROP NOT NULL,
    DROP CONSTRAINT resource_status_history_resource_id_fkey,
    ADD CONSTRAINT resource_status_history_resource_id_fkey
        FOREIGN KEY (resource_id) REFERENCES resources (id) ON DELETE SET NULL;

ALTER TABLE resource_location_history
    ALTER COLUMN resource_id DROP NOT NULL,
    DROP CONSTRAINT resource_location_history_resource_id_fkey,
    ADD CONSTRAINT resource_location_history_resource_id_fkey
        FOREIGN KEY (resource_id) REFERENCES resources (id) ON DELETE SET NULL;

ALTER TABLE resource_change_history
    ALTER COLUMN resource_id DROP NOT NULL,
    DROP CONSTRAINT resource_change_history_resource_id_fkey,
    ADD CONSTRAINT resource_change_history_resource_id_fkey
        FOREIGN KEY (resource_id) REFERENCES resources (id) ON DELETE SET NULL;
