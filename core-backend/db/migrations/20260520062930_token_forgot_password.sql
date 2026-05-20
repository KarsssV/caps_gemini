-- +goose Up
SET TIME ZONE 'Asia/Jakarta';

CREATE TABLE token_forgot_password (
    token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    used BOOLEAN DEFAULT false,
    expired TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 minutes')
);


-- +goose Down
DROP TABLE token_forgot_password;
