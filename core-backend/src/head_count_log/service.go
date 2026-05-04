package headCountLog

import (
	"context"
	"errors"

	"gin-auth-supabase/src/db"
)

type Service struct {
	q *db.Queries
}

func NewService(q *db.Queries) *Service {
	return &Service{q: q}
}

func (s *Service) Add(ctx context.Context, req HeadCountLogAdd) (*db.HeadCountLog, error) {
	sourceName, err := s.q.GetSourceNameByID(ctx, req.SourceID)
	println(sourceName)
	headCountLog, err := s.q.CreateHeadCountLog(ctx, db.CreateHeadCountLogParams{
		SourceName: sourceName,
		HeadCount:  req.HeadCount,
		CurrentFps: req.CurrentFps,
		Timestamp:  req.Timestamp,
	})
	return &headCountLog, err
}

func (s *Service) RequestBySource(ctx context.Context, sourceName string) (*[]db.HeadCountLog, error) {
	headCountLogs, err := s.q.GetHeadCountLogBySource(ctx, sourceName)
	if err != nil {
		return nil, errors.New("Source not found")
	}

	return &headCountLogs, nil
}

func (s *Service) RequestLatestBySource(ctx context.Context, sourceName string) (*[]db.HeadCountLog, error) {
	headCountLogs, err := s.q.GetLatestHeadCountLogBySource(ctx, sourceName)
	if err != nil {
		return nil, errors.New("Source not found")
	}

	return &headCountLogs, nil
}
