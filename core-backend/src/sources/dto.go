package sources

import "github.com/google/uuid"

type SourceAdd struct {
	SourceID   uuid.UUID `json:"source_id"`
	Name       string    `json:"name" binding:"required"`
	Type       string    `json:"type" binding:"required,oneof=MP4 RTSP Webcam Youtube Other"`
	Url        string    `json:"url" binding:"required"`
	FpsTarget  int32     `json:"fps_target"`
	Resolution string    `json:"resolution"`
	Status     *bool     `json:"status"`
	UserID     uuid.UUID `json:"user_id"`
}

type SourceUpdate struct {
	Name       string    `json:"name" binding:"required"`
	Type       string    `json:"type" binding:"oneof=MP4 RTSP Webcam Youtube Other"`
	Url        string    `json:"url"  binding:"required"`
	FpsTarget  int32     `json:"fps_target"`
	Resolution string    `json:"resolution"`
	Status     *bool     `json:"status"`
	UserID     uuid.UUID `json:"user_id"`
}

type SourcesResponse struct {
	Sources any `json:"sources"`
}

type SourceDelete struct {
	UserID uuid.UUID `json:"user_id" binding:"required"`
}
