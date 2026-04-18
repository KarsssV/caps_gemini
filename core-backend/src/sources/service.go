package sources

import (
	"context"
	"encoding/json"
	"errors"
	"gin-auth-supabase/src/db"
	store "gin-auth-supabase/src/internal"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	q     *db.Queries
	store store.Store
}

func NewService(q *db.Queries, pool *pgxpool.Pool) *Service {
	store := store.NewStore(pool)
	return &Service{q: q, store: store}
}

func (s *Service) Add(ctx context.Context, req SourceAdd) (*db.Source, error) {
	var source db.Source
	err := s.store.ExecTx(ctx, func(q *db.Queries) error {
		var err error
		source, err = s.q.CreateSource(ctx, db.CreateSourceParams{
			Name:       req.Name,
			Type:       db.Sourcetype(req.Type),
			Url:        req.Url,
			FpsTarget:  req.FpsTarget,
			Resolution: req.Resolution,
			Status:     *req.Status,
		})
		if err != nil {
			return err
		}

		// return nil // for BE AI Testing
		rawSourceJson, err := json.Marshal(source)

		return q.CreateAuditLog(ctx, db.CreateAuditLogParams{
			UserID:    req.UserID,
			Action:    db.AudittypeCREATE,
			TableName: "sources",
			NewValue:  json.RawMessage(rawSourceJson),
		})
	})

	return &source, err
}

func (s *Service) Request(ctx context.Context) (*[]db.Source, error) {
	sources, err := s.q.GetSources(ctx)
	if err != nil {
		return nil, errors.New("Source not found")
	}

	return &sources, nil
}

func (s *Service) RequestSourcesId(ctx context.Context) (*[]uuid.UUID, error) {
	sources, err := s.q.GetSourcesId(ctx)
	if err != nil {
		return nil, errors.New("Source not found")
	}

	return &sources, nil
}

func (s *Service) RequestByID(ctx context.Context, sourceId uuid.UUID) (*db.Source, error) {
	source, err := s.q.GetSourceByID(ctx, sourceId)
	if err != nil {
		return nil, errors.New("Source not found")
	}

	return &source, nil
}

func (s *Service) UpdateById(ctx context.Context, req SourceUpdate, sourceId uuid.UUID) (*db.Source, error) {
	var newSource db.Source
	err := s.store.ExecTx(ctx, func(q *db.Queries) error {
		var err error
		oldSource, err := s.q.GetSourceByID(ctx, sourceId)
		if err != nil {
			return err
		}

		newSource, err = s.q.UpdateSource(ctx, db.UpdateSourceParams{
			ID:         sourceId,
			Name:       req.Name,
			Type:       db.Sourcetype(req.Type),
			Url:        req.Url,
			FpsTarget:  req.FpsTarget,
			Resolution: req.Resolution,
			Status:     *req.Status,
		})
		if err != nil {
			return err
		}

		oldSourceJson, err := json.Marshal(oldSource)
		newSourceJson, err := json.Marshal(newSource)

		return q.CreateAuditLog(ctx, db.CreateAuditLogParams{
			UserID:    req.UserID,
			Action:    db.AudittypeUPDATE,
			TableName: "sources",
			OldValue:  json.RawMessage(oldSourceJson),
			NewValue:  json.RawMessage(newSourceJson),
		})
	})

	return &newSource, err
}

func (s *Service) DeleteById(ctx context.Context, sourceId uuid.UUID, userId uuid.UUID) (*db.Source, error) {
	var source db.Source

	err := s.store.ExecTx(ctx, func(q *db.Queries) error {
		var err error
		source, err = s.q.DeleteSource(ctx, sourceId)
		if err != nil {
			return err
		}

		sourceJson, err := json.Marshal(source)

		return q.CreateAuditLog(ctx, db.CreateAuditLogParams{
			UserID:    userId,
			Action:    db.AudittypeDELETE,
			TableName: "sources",
			OldValue:  json.RawMessage(sourceJson),
		})
	})

	return &source, err
}
