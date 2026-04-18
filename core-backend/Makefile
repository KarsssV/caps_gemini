include .env
export

MIGRATION_DIR=./db/migrations

migration:
	goose -dir $(MIGRATION_DIR) create $(name) sql

migrate-up:
	goose -dir $(MIGRATION_DIR) postgres "$(DATABASE_URL)" up

migrate-down:
	goose -dir $(MIGRATION_DIR) postgres "$(DATABASE_URL)" down

migrate-status:
	goose -dir $(MIGRATION_DIR) postgres "$(DATABASE_URL)" status

generate:
	sqlc generate

run:
	go run main.go
.PHONY: migration migrate-up migrate-down migrate-status