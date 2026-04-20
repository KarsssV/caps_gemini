package snapshots

import "github.com/google/uuid"

type SnapshotAdd struct {
	SourceID        uuid.UUID `json:"source_id" binding:"required"`
	ImagePath       string    `json:"image_path"`
	HeadCountAtTime int32     `json:"head_count_at_time" binding:"required"`
}

type SnapshotResponse struct {
	Snapshots any `json:"snapshots"`
}
