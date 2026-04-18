-- +goose Up
CREATE TYPE SourceType AS ENUM ('RTSP', 'MP4', 'Webcam');

CREATE TABLE sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    type SourceType NOT NULL,
    url TEXT NOT NULL,
    fps_target INT NOT NULL,
    resolution VARCHAR NOT NULL,
    status BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE head_count_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES sources(id),
    head_count INT NOT NULL,
    current_fps FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    timestamp TIMESTAMP NOT NULL
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR UNIQUE NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    password VARCHAR NOT NULL, -- hashed
    first_name VARCHAR NOT NULL,
    last_name VARCHAR NOT NULL
);

CREATE TABLE snapshots (
    id UUID PRIMARY KEY,
    source_id UUID NOT NULL REFERENCES sources(id),
    image_path TEXT NOT NULL,
    head_count_at_time INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- +goose Down
DROP TABLE IF EXISTS sources;
DROP TABLE IF EXISTS head_count_logs;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS snapshots;
