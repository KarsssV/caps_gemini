package snapshots

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

func (s *Service) Add(ctx context.Context, req SnapshotAdd) (*db.Snapshot, error) {
	snapshot, err := s.q.CreateSnapshot(ctx, db.CreateSnapshotParams{
		SourceID:        req.SourceID,
		ImagePath:       req.ImagePath,
		HeadCountAtTime: req.HeadCountAtTime,
	})
	return &snapshot, err
}

func (s *Service) Request(ctx context.Context) (*[]db.Snapshot, error) {
	snapshots, err := s.q.GetSnapshots(ctx)
	if err != nil {
		return nil, errors.New("Snapshot not found")
	}

	return &snapshots, nil
}

func (s *Service) RequestById(ctx context.Context, snapshotId uuid.UUID) (*db.Snapshot, error) {
	snapshot, err := s.q.GetSnapshotById(ctx, snapshotId)
	if err != nil {
		return nil, errors.New("Snapshot not found")
	}

	return &snapshot, nil
}

func (s *Service) RequestBySource(ctx context.Context, sourceId uuid.UUID) (*[]db.Snapshot, error) {
	snapshots, err := s.q.GetSnapshotsBySource(ctx, sourceId)
	if err != nil {
		return nil, errors.New("Snapshots or Source not found")
	}

	return &snapshots, nil
}

func (s *Service) DeleteById(ctx context.Context, snapshotId uuid.UUID) (*db.Snapshot, error) {
	snapshot, err := s.q.DeleteSnapshot(ctx, snapshotId)
	if err != nil {
		return nil, errors.New("Snapshot not found")
	}

	return &snapshot, nil
}
