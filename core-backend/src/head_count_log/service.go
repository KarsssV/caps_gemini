package headCountLog

import (
	"context"
	"errors"

	"gin-auth-supabase/src/db"

	"github.com/google/uuid"
)

type Service struct {
	q *db.Queries
}

func NewService(q *db.Queries) *Service {
	return &Service{q: q}
}

func (s *Service) Add(ctx context.Context, req HeadCountLogAdd) (*db.HeadCountLog, error) {

	headCountLog, err := s.q.CreateHeadCountLog(ctx, db.CreateHeadCountLogParams{
		SourceID:   req.SourceID,
		HeadCount:  req.HeadCount,
		CurrentFps: req.CurrentFps,
		Timestamp:  req.Timestamp,
	})
	return &headCountLog, err
}

func (s *Service) RequestBySource(ctx context.Context, sourceId uuid.UUID) (*[]db.HeadCountLog, error) {
	headCountLogs, err := s.q.GetHeadCountLogBySource(ctx, sourceId)
	if err != nil {
		return nil, errors.New("Source not found")
	}

	return &headCountLogs, nil
}
