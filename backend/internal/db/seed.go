package db

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

// SeedAdmin tạo tài khoản admin nếu chưa tồn tại (chạy nhiều lần vẫn an toàn).
func SeedAdmin(ctx context.Context, pool *pgxpool.Pool, username, email, password string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	_, err = pool.Exec(ctx, `
		INSERT INTO tbl_users (role_id, username, email, password_hash, full_name)
		SELECT r.id, $1::varchar, $2::varchar, $3::text, 'Administrator'
		FROM tbl_roles r
		WHERE r.code = 'admin'
		  AND NOT EXISTS (
		    SELECT 1 FROM tbl_users
		    WHERE lower(username) = lower($1::varchar) AND deleted_at IS NULL
		  )`,
		username, email, string(hash))
	return err
}