package store

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

var ErrNotFound = errors.New("không tìm thấy")

type Store struct{ pool *pgxpool.Pool }

func New(pool *pgxpool.Pool) *Store { return &Store{pool: pool} }

type User struct {
	ID           string  `json:"id"`
	Username     string  `json:"username"`
	Email        *string `json:"email"`
	FullName     *string `json:"full_name"`
	Role         string  `json:"role"`
	IsActive     bool    `json:"is_active"`
	PasswordHash string  `json:"-"`
}

const userSelect = `
	SELECT u.id::text, u.username, u.email, u.full_name, r.code, u.is_active, u.password_hash
	FROM tbl_users u JOIN tbl_roles r ON r.id = u.role_id
	WHERE u.deleted_at IS NULL AND `

func (s *Store) scan(row pgx.Row) (*User, error) {
	var u User
	err := row.Scan(&u.ID, &u.Username, &u.Email, &u.FullName, &u.Role, &u.IsActive, &u.PasswordHash)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &u, err
}

func (s *Store) FindByUsername(ctx context.Context, username string) (*User, error) {
	return s.scan(s.pool.QueryRow(ctx, userSelect+`lower(u.username) = lower($1)`, username))
}

func (s *Store) FindByID(ctx context.Context, id string) (*User, error) {
	return s.scan(s.pool.QueryRow(ctx, userSelect+`u.id::text = $1`, id))
}

func (s *Store) TouchLogin(ctx context.Context, id string) {
	_, _ = s.pool.Exec(ctx, `UPDATE tbl_users SET last_login_at = now() WHERE id::text = $1`, id)
}

// EnsureAdmin tạo tài khoản admin nếu chưa có; đã có thì giữ nguyên (không ghi đè mật khẩu).
func (s *Store) EnsureAdmin(ctx context.Context, username, email, password string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx, `
		INSERT INTO tbl_users (role_id, username, email, password_hash, full_name)
		SELECT r.id, $1, $2, $3, 'Administrator' FROM tbl_roles r WHERE r.code = 'admin'
		ON CONFLICT DO NOTHING`, username, email, string(hash))
	return err
}