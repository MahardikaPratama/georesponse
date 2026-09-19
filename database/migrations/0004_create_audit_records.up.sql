-- Author       : Mahardika Pratama
-- Version      : 1.0.0
-- Created Date : 2026-09-19
-- Description  : Creates the audit_records table, the system-wide durable
--                audit trail backing AuditRecord (DATA_CONTRACT.md
--                section 9, BUSINESS_RULES.md BR-035 to BR-039), plus its
--                lookup indexes.
--
-- Changelog:
-- - 1.0.0 (2026-09-19): Initial creation.

CREATE TABLE IF NOT EXISTS audit_records (
    id            text PRIMARY KEY,
    operation     text NOT NULL
        CHECK (operation IN (
            'RESOURCE_CREATED',
            'RESOURCE_UPDATED',
            'RESOURCE_STATUS_CHANGED',
            'RESOURCE_RELOCATED',
            'RESOURCE_DELETED',
            'ROLE_CHANGED',
            'PERMISSION_CHANGED'
        )),
    user_id       text REFERENCES users (id) ON DELETE SET NULL,
    resource_id   text REFERENCES resources (id) ON DELETE SET NULL,
    occurred_at   timestamptz NOT NULL DEFAULT now(),
    details       jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_records_resource_id ON audit_records (resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_records_user_id ON audit_records (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_records_occurred_at ON audit_records (occurred_at);
