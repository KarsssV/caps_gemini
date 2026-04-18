package store

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"gin-auth-supabase/src/db"
)

type Store interface {
	db.Querier
	ExecTx(ctx context.Context, fn func(*db.Queries) error) error
}

type SQLStore struct {
	*db.Queries
	db *pgxpool.Pool
}

func NewStore(connPool *pgxpool.Pool) Store {
	return &SQLStore{
		db:      connPool,
		Queries: db.New(connPool),
	}
}

func (s *SQLStore) ExecTx(ctx context.Context, fn func(*db.Queries) error) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return err
	}

	q := db.New(tx)
	err = fn(q)
	if err != nil {
		tx.Rollback(ctx)
		return err
	}

	return tx.Commit(ctx)
}
