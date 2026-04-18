package auditLog

import (
	"encoding/json"
)

type AuditLogAdd struct {
	Action    string          `json:"details" binding:"required"`
	TableName string          `json:"table_name" binding:"required"`
	OldValue  json.RawMessage `json:"old_value"`
	NewValue  json.RawMessage `json:"new_value" binding:"required"`
}

type AuditLogResponse struct {
	AuditLog any `json:"audit_logs"`
}
