-- Author       : Mahardika Pratama
-- Version      : 1.0.0
-- Created Date : 2026-09-19
-- Description  : Seed data for local development: a representative set of
--                disaster-response resources covering every resource type
--                (VEHICLE, FACILITY, EQUIPMENT, IOT_DEVICE) and a mix of
--                statuses (AVAILABLE, IN_USE, MAINTENANCE, UNAVAILABLE),
--                located at real Indonesian disaster-response-relevant
--                coordinates, per DATABASE_MIGRATIONS.md section 7 and
--                IMPLEMENTATION_CHECKLIST.md section 3.3. Attribute keys
--                match DOMAIN_MODEL.md section 6.2 / DATA_CONTRACT.md
--                section 3.4 exactly (vehicleType/capacity,
--                facilityType/capacity, equipmentType/quantity,
--                deviceType).
--
-- Changelog:
-- - 1.0.0 (2026-09-19): Initial creation.

-- Idempotent: re-running seed.sh/seed.ps1 against a database that already
-- has this seed data does not fail or duplicate rows.

-- VEHICLE (Jakarta) — AVAILABLE
INSERT INTO resources (id, name, type, status, attributes, location)
VALUES (
    'resource-001',
    'Ambulance Unit 1 - Jakarta Pusat',
    'VEHICLE',
    'AVAILABLE',
    '{"vehicleType": "Ambulance", "capacity": 4}'::jsonb,
    ST_SetSRID(ST_MakePoint(106.8456, -6.2088), 4326)::geography
)
ON CONFLICT (id) DO NOTHING;

-- VEHICLE (Palu, earthquake/tsunami-prone) — IN_USE
INSERT INTO resources (id, name, type, status, attributes, location)
VALUES (
    'resource-002',
    'Rescue Truck 1 - Palu',
    'VEHICLE',
    'IN_USE',
    '{"vehicleType": "Rescue Truck", "capacity": 6}'::jsonb,
    ST_SetSRID(ST_MakePoint(119.8707, -0.8917), 4326)::geography
)
ON CONFLICT (id) DO NOTHING;

-- FACILITY (Yogyakarta) — AVAILABLE
INSERT INTO resources (id, name, type, status, attributes, location)
VALUES (
    'resource-003',
    'Field Hospital - Yogyakarta',
    'FACILITY',
    'AVAILABLE',
    '{"facilityType": "Field Hospital", "capacity": 50}'::jsonb,
    ST_SetSRID(ST_MakePoint(110.3695, -7.7956), 4326)::geography
)
ON CONFLICT (id) DO NOTHING;

-- FACILITY (Padang) — MAINTENANCE
INSERT INTO resources (id, name, type, status, attributes, location)
VALUES (
    'resource-004',
    'Evacuation Shelter - Padang',
    'FACILITY',
    'MAINTENANCE',
    '{"facilityType": "Evacuation Shelter", "capacity": 200}'::jsonb,
    ST_SetSRID(ST_MakePoint(100.4172, -0.9471), 4326)::geography
)
ON CONFLICT (id) DO NOTHING;

-- EQUIPMENT (Bandung) — AVAILABLE
INSERT INTO resources (id, name, type, status, attributes, location)
VALUES (
    'resource-005',
    'Water Pump Unit - Bandung',
    'EQUIPMENT',
    'AVAILABLE',
    '{"equipmentType": "Water Pump", "quantity": 10}'::jsonb,
    ST_SetSRID(ST_MakePoint(107.6098, -6.9147), 4326)::geography
)
ON CONFLICT (id) DO NOTHING;

-- EQUIPMENT (Lombok, earthquake-prone) — UNAVAILABLE
INSERT INTO resources (id, name, type, status, attributes, location)
VALUES (
    'resource-006',
    'Generator Set - Lombok',
    'EQUIPMENT',
    'UNAVAILABLE',
    '{"equipmentType": "Generator Set", "quantity": 5}'::jsonb,
    ST_SetSRID(ST_MakePoint(116.3000, -8.6500), 4326)::geography
)
ON CONFLICT (id) DO NOTHING;

-- IOT_DEVICE (Aceh, tsunami early-warning context) — AVAILABLE
INSERT INTO resources (id, name, type, status, attributes, location)
VALUES (
    'resource-007',
    'Flood Sensor - Banda Aceh',
    'IOT_DEVICE',
    'AVAILABLE',
    '{"deviceType": "Flood Sensor"}'::jsonb,
    ST_SetSRID(ST_MakePoint(95.3238, 5.5483), 4326)::geography
)
ON CONFLICT (id) DO NOTHING;

-- IOT_DEVICE (Jakarta) — IN_USE
INSERT INTO resources (id, name, type, status, attributes, location)
VALUES (
    'resource-008',
    'Seismic Sensor - Jakarta Selatan',
    'IOT_DEVICE',
    'IN_USE',
    '{"deviceType": "Seismic Sensor"}'::jsonb,
    ST_SetSRID(ST_MakePoint(106.8106, -6.2615), 4326)::geography
)
ON CONFLICT (id) DO NOTHING;
