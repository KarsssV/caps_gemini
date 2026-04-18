-- +goose Up
CREATE TYPE AuditType AS ENUM ('CREATE', 'UPDATE', 'DELETE');
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    action AuditType NOT NULL,
    table_name TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- +goose Down
DROP TABLE audit_logs;
DROP TYPE AuditType;