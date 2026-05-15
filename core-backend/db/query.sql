-- name: CreateUser :one
INSERT INTO users (
    username,
    email,
    password,
    first_name,
    last_name
) VALUES (
    $1, $2, $3, $4, $5
)
RETURNING *;

-- name: UpdateUser :one
UPDATE users
SET
    username = $2,
    email = $3,
    first_name = $4,
    last_name = $5
WHERE Id = $1
RETURNING *;

-- name: GetUserByEmailUsername :one
SELECT * FROM users WHERE username = $1 OR email = $1;

-- name: GetUserById :one
SELECT * FROM users WHERE Id = $1;

-- name: CreateSource :one
INSERT INTO sources (
    id,
    name,
    type,
    url,
    fps_target,
    resolution,
    status
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
)
RETURNING *;

-- name: UpdateSource :one
UPDATE sources
SET
    name = $2,
    type = $3,
    url = $4,
    fps_target = $5,
    resolution = $6,
    status = $7
WHERE id = $1
RETURNING *;

-- name: UpdateSourceStatus :one
UPDATE sources
SET
    status = $2
WHERE id = $1
RETURNING *;

-- name: DeleteSource :one
DELETE FROM sources WHERE id = $1
RETURNING *;

-- name: GetSources :many
SELECT * FROM sources;

-- name: GetSourcesId :many
SELECT id FROM sources;

-- name: GetSourceByID :one
SELECT * FROM sources WHERE id = $1;

-- name: GetSourceNameByID :one
SELECT name FROM sources WHERE id = $1;

-- name: CreateHeadCountLog :one
INSERT INTO head_count_logs (
    source_name,
    head_count,
    current_fps,
    timestamp
) VALUES (
    $1, $2, $3, $4
) RETURNING *;

-- name: GetHeadCountLogBySource :many
SELECT * FROM head_count_logs WHERE source_name = $1;

-- name: GetLatestHeadCountLogBySource :many
SELECT * FROM head_count_logs WHERE source_name = $1 ORDER BY timestamp DESC LIMIT 1;

-- name: CreateSnapshot :one
INSERT INTO snapshots (
    source_name,
    image_path,
    head_count_at_time
) VALUES (
    $1, $2, $3
)
RETURNING *;

-- name: GetSnapshots :many
SELECT * FROM snapshots;

-- name: GetSnapshotById :one
SELECT * FROM snapshots WHERE id = $1;

-- name: DeleteSnapshot :one
DELETE FROM snapshots WHERE id = $1
RETURNING *;

-- name: CreateAuditLog :exec
INSERT INTO audit_logs (
    user_id,
    action,
    table_name,
    old_value,
    new_value
) VALUES (
    $1, $2, $3, $4, $5
);

-- name: GetAuditLogs :many
SELECT * FROM audit_logs;

-- name: GetAuditLogsByUser :many
SELECT * FROM audit_logs WHERE user_id = $1;

-- name: CreateForgotPasswordToken :one
INSERT INTO token_forgot_password (
    user_id
) VALUES (
    $1
)
RETURNING *;

-- name: GetForgotPasswordToken :one
SELECT * FROM token_forgot_password
WHERE token = $1
LIMIT 1;