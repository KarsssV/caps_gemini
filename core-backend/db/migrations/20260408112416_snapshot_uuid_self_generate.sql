-- +goose Up
ALTER TABLE snapshots ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- +goose Down
ALTER TABLE snapshots ALTER COLUMN id DROP DEFAULT;
