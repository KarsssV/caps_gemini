-- +goose Up
ALTER TYPE SourceType ADD VALUE 'Youtube';
ALTER TYPE SourceType ADD VALUE 'Other';

-- +goose Down
ALTER TYPE SourceType RENAME TO old_SourceType;
CREATE TYPE SourceType AS ENUM ('RTSP', 'MP4', 'Webcam');
ALTER TABLE sources 
  ALTER COLUMN type TYPE SourceType 
  USING type::text::SourceType;
DROP TYPE old_SourceType;