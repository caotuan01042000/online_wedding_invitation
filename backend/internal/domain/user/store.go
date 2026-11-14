package user

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

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
	ID           string     `json:"id"`
	Username     string     `json:"username"`
	Email        *string    `json:"email"`
	FullName     *string    `json:"full_name"`
	Phone        *string    `json:"phone"`
	Role         string     `json:"role"`
	IsActive     bool       `json:"is_active"`
	CreatedAt    time.Time  `json:"created_at"`
	LastLoginAt  *time.Time `json:"last_login_at"`
	PasswordHash string     `json:"-"`
}

// NewUser is the data to create a user. PasswordHash must be a bcrypt hash, NOT the raw password.
type NewUser struct {
	Role         string // RoleAdmin | RoleUser
	Username     string
	Email        string
	PasswordHash string
	FullName     string
	Phone        string
}

// ListFilter drives the admin user list. Zero values mean "no filter".
type ListFilter struct {
	Q        string // matches username, email or full name (case-insensitive)
	Role     string
	IsActive *bool
	Limit    int
	Offset   int
}

// Patch holds the fields an admin may change. A nil field is left untouched.
type Patch struct {
	FullName *string
	Phone    *string
	Role     *string
	IsActive *bool
}

type Store struct{ pool *pgxpool.Pool }

func New(pool *pgxpool.Pool) *Store { return &Store{pool: pool} }

const (
	userCols = `u.id::text, u.username, u.email, u.full_name, u.phone, r.code, u.is_active, u.password_hash, u.created_at, u.last_login_at`
	userFrom = ` FROM tbl_users u JOIN tbl_roles r ON r.id = u.role_id `
)

const userSelect = `SELECT ` + userCols + userFrom + `WHERE u.deleted_at IS NULL AND `

var likeEscaper = strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)

type scanner interface{ Scan(dest ...any) error }

func pgCode(err error) string {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code
	}
	return ""
}

func nullIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func scan(row scanner) (*User, error) {
	var u User
	err := row.Scan(&u.ID, &u.Username, &u.Email, &u.FullName, &u.Phone, &u.Role,
		&u.IsActive, &u.PasswordHash, &u.CreatedAt, &u.LastLoginAt)
	if err != nil {
		// 22P02 = invalid_text_representation (a malformed UUID in the URL)
		if errors.Is(err, pgx.ErrNoRows) || pgCode(err) == "22P02" {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &u, nil
}

// affected turns an UPDATE/DELETE result into ErrNotFound when no row matched.
func affected(tag pgconn.CommandTag, err error) error {
	if err != nil {
		if pgCode(err) == "22P02" {
			return ErrNotFound
		}
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) FindByUsername(ctx context.Context, username string) (*User, error) {
	return scan(s.pool.QueryRow(ctx, userSelect+`lower(u.username) = lower($1)`, username))
}

// FindByID uses u.id = $1::uuid so the PK index is used.
func (s *Store) FindByID(ctx context.Context, id string) (*User, error) {
	return scan(s.pool.QueryRow(ctx, userSelect+`u.id = $1::uuid`, id))
}

func (s *Store) TouchLogin(ctx context.Context, id string) {
	_, _ = s.pool.Exec(ctx, `UPDATE tbl_users SET last_login_at = now() WHERE id = $1::uuid`, id)
}

// List returns one page of users plus the total number of matches.
func (s *Store) List(ctx context.Context, f ListFilter) ([]User, int, error) {
	where, args := `u.deleted_at IS NULL`, []any{}
	add := func(cond string, v any) {
		args = append(args, v)
		where += " AND " + fmt.Sprintf(cond, len(args))
	}
	if f.Q != "" {
		add(`(u.username ILIKE $%[1]d OR u.email ILIKE $%[1]d OR u.full_name ILIKE $%[1]d)`,
			"%"+likeEscaper.Replace(f.Q)+"%")
	}
	if f.Role != "" {
		add(`r.code = $%d`, f.Role)
	}
	if f.IsActive != nil {
		add(`u.is_active = $%d`, *f.IsActive)
	}

	var total int
	if err := s.pool.QueryRow(ctx, `SELECT count(*)`+userFrom+`WHERE `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	args = append(args, f.Limit, f.Offset)
	rows, err := s.pool.Query(ctx,
		`SELECT `+userCols+userFrom+`WHERE `+where+
			fmt.Sprintf(` ORDER BY u.created_at DESC, u.id LIMIT $%d OFFSET $%d`, len(args)-1, len(args)),
		args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := []User{}
	for rows.Next() {
		u, err := scan(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, *u)
	}
	return items, total, rows.Err()
}

// Create inserts a user. Returns ErrUsernameTaken / ErrEmailTaken on duplicates, ErrRoleNotFound if the role is missing.
func (s *Store) Create(ctx context.Context, n NewUser) (*User, error) {
	u := User{
		Username: n.Username, Email: nullIfEmpty(n.Email), FullName: nullIfEmpty(n.FullName),
		Phone: nullIfEmpty(n.Phone), Role: n.Role, IsActive: true,
	}
	err := s.pool.QueryRow(ctx, `
		INSERT INTO tbl_users (role_id, username, email, password_hash, full_name, phone)
		SELECT r.id, $2::varchar, $3::varchar, $4::text, $5::varchar, $6::varchar
		FROM tbl_roles r WHERE r.code = $1
		RETURNING id::text, created_at`,
		n.Role, n.Username, u.Email, n.PasswordHash, u.FullName, u.Phone).Scan(&u.ID, &u.CreatedAt)
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
	return &u, nil
}

// Update applies only the non-nil fields of p and returns the fresh user.
func (s *Store) Update(ctx context.Context, id string, p Patch) (*User, error) {
	args, sets := []any{id}, []string{}
	set := func(expr string, v any) {
		args = append(args, v)
		sets = append(sets, fmt.Sprintf(expr, len(args)))
	}
	if p.FullName != nil {
		set(`full_name = $%d::varchar`, nullIfEmpty(*p.FullName))
	}
	if p.Phone != nil {
		set(`phone = $%d::varchar`, nullIfEmpty(*p.Phone))
	}
	if p.Role != nil {
		set(`role_id = (SELECT id FROM tbl_roles WHERE code = $%d::varchar)`, *p.Role)
	}
	if p.IsActive != nil {
		set(`is_active = $%d::boolean`, *p.IsActive)
	}
	if len(sets) > 0 {
		tag, err := s.pool.Exec(ctx,
			`UPDATE tbl_users SET `+strings.Join(sets, ", ")+` WHERE id = $1::uuid AND deleted_at IS NULL`, args...)
		if pgCode(err) == "23502" { // not_null_violation: role code did not match any role
			return nil, ErrRoleNotFound
		}
		if err := affected(tag, err); err != nil {
			return nil, err
		}
	}
	return s.FindByID(ctx, id)
}

// SoftDelete marks the user deleted (frees the username/email, keeps related data).
func (s *Store) SoftDelete(ctx context.Context, id string) error {
	tag, err := s.pool.Exec(ctx,
		`UPDATE tbl_users SET deleted_at = now(), is_active = false WHERE id = $1::uuid AND deleted_at IS NULL`, id)
	return affected(tag, err)
}

// SetPassword stores a new bcrypt hash.
func (s *Store) SetPassword(ctx context.Context, id, hash string) error {
	tag, err := s.pool.Exec(ctx,
		`UPDATE tbl_users SET password_hash = $2 WHERE id = $1::uuid AND deleted_at IS NULL`, id, hash)
	return affected(tag, err)
}

// EnsureAdmin creates the admin if missing; an existing one is left untouched (password not overwritten).
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