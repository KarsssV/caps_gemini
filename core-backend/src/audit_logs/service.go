package auditLog

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

func (s *Service) Add(ctx context.Context, userId uuid.UUID, req AuditLogAdd) error {
	err := s.q.CreateAuditLog(ctx, db.CreateAuditLogParams{
		UserID:   userId,
		Action:   db.Audittype(req.Action),
		OldValue: req.OldValue,
		NewValue: req.NewValue,
	})
	return err
}

func (s *Service) Request(ctx context.Context) (*[]db.AuditLog, error) {
	crudLogs, err := s.q.GetAuditLogs(ctx)
	if err != nil {
		return nil, errors.New("Audit logs not found")
	}

	return &crudLogs, nil
}

func (s *Service) RequestByUserID(ctx context.Context, crudLogId uuid.UUID) (*[]db.AuditLog, error) {
	crudLog, err := s.q.GetAuditLogsByUser(ctx, crudLogId)
	if err != nil {
		return nil, errors.New("Audit logs not found")
	}

	return &crudLog, nil
}
