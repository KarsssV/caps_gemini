-- +goose Up
ALTER TABLE snapshots
DROP COLUMN source_id;
ALTER TABLE snapshots
ADD source_name VARCHAR;

-- +goose Down
ALTER TABLE snapshots
ADD source_id UUID;
ALTER TABLE snapshots
ADD FOREIGN KEY (source_id) REFERENCES sources(id);
ALTER TABLE snapshots
DROP COLUMN source_name;