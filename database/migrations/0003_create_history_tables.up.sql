/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Creates the resource history tables (resource_status_
               history, resource_location_history,
               resource_change_history) backing Resource History
               (DATA_CONTRACT.md section 8), plus their resource_id
               lookup indexes.

Changelog:
- 1.0.0 (2026-09-19): Initial creation.
*/

CREATE TABLE IF NOT EXISTS resource_status_history (
    id               text PRIMARY KEY,
    resource_id      text NOT NULL REFERENCES resources (id) ON DELETE CASCADE,
    previous_status  text NOT NULL,
    new_status       text NOT NULL,
    changed_at       timestamptz NOT NULL DEFAULT now(),
    changed_by       text REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS resource_location_history (
    id                  text PRIMARY KEY,
    resource_id         text NOT NULL REFERENCES resources (id) ON DELETE CASCADE,
    previous_location   geography(Point, 4326) NOT NULL,
    new_location        geography(Point, 4326) NOT NULL,
    changed_at          timestamptz NOT NULL DEFAULT now(),
    changed_by          text REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS resource_change_history (
    id            text PRIMARY KEY,
    resource_id   text NOT NULL REFERENCES resources (id) ON DELETE CASCADE,
    changes       jsonb NOT NULL,  -- [{ "field": "name", "before": "...", "after": "..." }]
    changed_at    timestamptz NOT NULL DEFAULT now(),
    changed_by    text REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_resource_status_history_resource_id ON resource_status_history (resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_location_history_resource_id ON resource_location_history (resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_change_history_resource_id ON resource_change_history (resource_id);
