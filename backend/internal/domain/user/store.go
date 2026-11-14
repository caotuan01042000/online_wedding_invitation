package user

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

const (
	RoleAdmin = "admin"
	RoleUser  = "user"
)

var (
	ErrNotFound      = errors.New("không tìm thấy")
	ErrUsernameTaken = errors.New("tên đăng nhập đã tồn tại")
	ErrEmailTaken    = errors.New("email đã được sử dụng")
	ErrRoleNotFound  = errors.New("role không tồn tại (đã chạy migration chưa?)")
)

type User struct {
	ID           string  `json:"id"`
	Username     string  `json:"username"`
	Email        *string `json:"email"`
	FullName     *string `json:"full_name"`
	Role         string  `json:"role"`
	IsActive     bool    `json:"is_active"`
	PasswordHash string  `json:"-"`
}

// NewUser là dữ liệu để tạo user. PasswordHash phải là bcrypt hash, KHÔNG phải mật khẩu thô.
type NewUser struct {
	Role         string // RoleAdmin | RoleUser
	Username     string
	Email        string
	PasswordHash string
	FullName     string
}

type Store struct{ pool *pgxpool.Pool }

func New(pool *pgxpool.Pool) *Store { return &Store{pool: pool} }

const userSelect = `
	SELECT u.id::text, u.username, u.email, u.full_name, r.code, u.is_active, u.password_hash
	FROM tbl_users u JOIN tbl_roles r ON r.id = u.role_id
	WHERE u.deleted_at IS NULL AND `

func scan(row pgx.Row) (*User, error) {
	var u User
	if err := row.Scan(&u.ID, &u.Username, &u.Email, &u.FullName, &u.Role, &u.IsActive, &u.PasswordHash); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &u, nil
}

func (s *Store) FindByUsername(ctx context.Context, username string) (*User, error) {
	return scan(s.pool.QueryRow(ctx, userSelect+`lower(u.username) = lower($1)`, username))
}

// FindByID: dùng u.id = $1::uuid để tận dụng index PK (id không hợp lệ sẽ trả lỗi).
func (s *Store) FindByID(ctx context.Context, id string) (*User, error) {
	return scan(s.pool.QueryRow(ctx, userSelect+`u.id = $1::uuid`, id))
}

func (s *Store) TouchLogin(ctx context.Context, id string) {
	_, _ = s.pool.Exec(ctx, `UPDATE tbl_users SET last_login_at = now() WHERE id = $1::uuid`, id)
}

// Create thêm user mới. Trả ErrUsernameTaken / ErrEmailTaken nếu trùng, ErrRoleNotFound nếu role không có.
func (s *Store) Create(ctx context.Context, n NewUser) (*User, error) {
	var email, fullName *string
	if n.Email != "" {
		email = &n.Email
	}
	if n.FullName != "" {
		fullName = &n.FullName
	}

	var id string
	err := s.pool.QueryRow(ctx, `
		INSERT INTO tbl_users (role_id, username, email, password_hash, full_name)
		SELECT r.id, $2::varchar, $3::varchar, $4::text, $5::varchar
		FROM tbl_roles r WHERE r.code = $1
		RETURNING id::text`,
		n.Role, n.Username, email, n.PasswordHash, fullName).Scan(&id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrRoleNotFound
		}
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" { // unique_violation
			switch pgErr.ConstraintName {
			case "uq_users_username":
				return nil, ErrUsernameTaken
			case "uq_users_email":
				return nil, ErrEmailTaken
			}
		}
		return nil, err
	}
	return &User{ID: id, Username: n.Username, Email: email, FullName: fullName, Role: n.Role, IsActive: true}, nil
}

// EnsureAdmin tạo admin nếu chưa có; đã có thì giữ nguyên (không ghi đè mật khẩu).
func (s *Store) EnsureAdmin(ctx context.Context, username, email, password string) error {
	if _, err := s.FindByUsername(ctx, username); err == nil {
		return nil
	} else if !errors.Is(err, ErrNotFound) {
		return err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	_, err = s.Create(ctx, NewUser{
		Role: RoleAdmin, Username: username, Email: email,
		PasswordHash: string(hash), FullName: "Administrator",
	})
	if errors.Is(err, ErrUsernameTaken) || errors.Is(err, ErrEmailTaken) {
		return nil
	}
	return err
}