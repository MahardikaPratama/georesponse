/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Enables PostGIS and creates the resources table, plus its
               type/status/spatial indexes.

Changelog:
- 1.0.0 (2026-09-19): Initial creation.
*/

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS resources (
    id          text PRIMARY KEY,
    name        text NOT NULL,
    type        text NOT NULL
        CHECK (type IN ('VEHICLE', 'FACILITY', 'EQUIPMENT', 'IOT_DEVICE')),
    status      text NOT NULL
        CHECK (status IN ('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'UNAVAILABLE')),
    attributes  jsonb NOT NULL DEFAULT '{}'::jsonb,
    location    geography(Point, 4326) NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resources_type ON resources (type);
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources (status);
CREATE INDEX IF NOT EXISTS idx_resources_location ON resources USING GIST (location);
