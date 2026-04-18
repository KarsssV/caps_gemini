package headCountLog

import (
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type HeadCountLogAdd struct {
	SourceID   uuid.UUID        `json:"source_id" binding:"required"`
	HeadCount  int32            `json:"head_count" binding:"required"`
	CurrentFps float64          `json:"current_fps" binding:"required"`
	Timestamp  pgtype.Timestamp `json:"timestamp" binding:"required"`
}

type HeadCountLogResponse struct {
	HeadCountLogs any `json:"head_count_logs"`
}
