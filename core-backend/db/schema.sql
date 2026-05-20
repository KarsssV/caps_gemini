CREATE TYPE SourceType AS ENUM ('RTSP', 'MP4', 'Webcam', 'Youtube', 'Other');
CREATE TYPE AuditType AS ENUM ('CREATE', 'UPDATE', 'DELETE');

CREATE TABLE sources (
    id UUID PRIMARY KEY,
    name VARCHAR UNIQUE NOT NULL,
    type SourceType NOT NULL,
    url VARCHAR NOT NULL,
    fps_target INT NOT NULL,
    resolution VARCHAR NOT NULL,
    status BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE head_count_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name VARCHAR NOT NULL,
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name VARCHAR NOT NULL,
    image_path VARCHAR NOT NULL,
    head_count_at_time INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    action AuditType NOT NULL,
    table_name VARCHAR NOT NULL,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE token_forgot_password (
    token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    used BOOLEAN DEFAULT false,
    expired TIMESTAMP
);
