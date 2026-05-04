-- +goose Up
ALTER TABLE head_count_logs
DROP COLUMN source_id;
ALTER TABLE head_count_logs
ADD source_name VARCHAR;
ALTER TABLE sources ADD UNIQUE (name);

-- +goose Down
ALTER TABLE head_count_logs
ADD source_id UUID;

ALTER TABLE head_count_logs
ADD FOREIGN KEY (source_id) REFERENCES sources(id);

ALTER TABLE head_count_logs
DROP COLUMN source_name;

ALTER TABLE sources DROP COLUMN name;
ALTER TABLE sources ADD name VARCHAR;