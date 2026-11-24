package template

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrNotFound  = errors.New("không tìm thấy template")
	ErrCodeTaken = errors.New("mã template đã tồn tại")
	ErrInUse     = errors.New("template đang được thiệp sử dụng, hãy tắt (is_active=false) thay vì xóa")
)

type Template struct {
	ID           string         `json:"id"`
	Code         string         `json:"code"` // must match a key in the frontend registry
	Name         string         `json:"name"`
	Description  *string        `json:"description"`
	ThumbnailURL *string        `json:"thumbnail_url"`
	Config       map[string]any `json:"config"` // default theme + sections
	IsActive     bool           `json:"is_active"`
	CreatedAt    time.Time      `json:"created_at"`
}

type NewTemplate struct {
	Code         string
	Name         string
	Description  string
	ThumbnailURL string
	Config       map[string]any
	IsActive     bool
}

// Patch: a nil field is left untouched. Code is immutable.
type Patch struct {
	Name         *string
	Description  *string
	ThumbnailURL *string
	Config       map[string]any
	IsActive     *bool
}

type Store struct{ pool *pgxpool.Pool }

func New(pool *pgxpool.Pool) *Store { return &Store{pool: pool} }

const cols = `id::text, code, name, description, thumbnail_url, config, is_active, created_at`

type scanner interface{ Scan(dest ...any) error }

func scan(row scanner) (*Template, error) {
	var t Template
	if err := row.Scan(&t.ID, &t.Code, &t.Name, &t.Description, &t.ThumbnailURL, &t.Config, &t.IsActive, &t.CreatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) || pgCode(err) == "22P02" {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &t, nil
}

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

// List returns all templates, optionally filtered by is_active (nil = all).
func (s *Store) List(ctx context.Context, isActive *bool) ([]Template, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT `+cols+` FROM tbl_templates WHERE ($1::boolean IS NULL OR is_active = $1) ORDER BY created_at, code`, isActive)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []Template{}
	for rows.Next() {
		t, err := scan(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *t)
	}
	return items, rows.Err()
}

func (s *Store) Get(ctx context.Context, id string) (*Template, error) {
	return scan(s.pool.QueryRow(ctx, `SELECT `+cols+` FROM tbl_templates WHERE id = $1::uuid`, id))
}

func (s *Store) Create(ctx context.Context, createdBy string, n NewTemplate) (*Template, error) {
	if n.Config == nil {
		n.Config = map[string]any{}
	}
	t, err := scan(s.pool.QueryRow(ctx, `
		INSERT INTO tbl_templates (code, name, description, thumbnail_url, config, is_active, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7::uuid)
		RETURNING `+cols,
		n.Code, n.Name, nullIfEmpty(n.Description), nullIfEmpty(n.ThumbnailURL), n.Config, n.IsActive, nullIfEmpty(createdBy)))
	if pgCode(err) == "23505" { // unique_violation on code
		return nil, ErrCodeTaken
	}
	return t, err
}

// Update applies only the non-nil fields of p and returns the fresh template.
func (s *Store) Update(ctx context.Context, id string, p Patch) (*Template, error) {
	args, sets := []any{id}, []string{}
	set := func(expr string, v any) {
		args = append(args, v)
		sets = append(sets, fmt.Sprintf(expr, len(args)))
	}
	if p.Name != nil {
		set(`name = $%d`, *p.Name)
	}
	if p.Description != nil {
		set(`description = $%d`, nullIfEmpty(*p.Description))
	}
	if p.ThumbnailURL != nil {
		set(`thumbnail_url = $%d`, nullIfEmpty(*p.ThumbnailURL))
	}
	if p.Config != nil {
		set(`config = $%d`, p.Config)
	}
	if p.IsActive != nil {
		set(`is_active = $%d`, *p.IsActive)
	}
	if len(sets) > 0 {
		tag, err := s.pool.Exec(ctx, `UPDATE tbl_templates SET `+strings.Join(sets, ", ")+` WHERE id = $1::uuid`, args...)
		if err != nil {
			if pgCode(err) == "22P02" {
				return nil, ErrNotFound
			}
			return nil, err
		}
		if tag.RowsAffected() == 0 {
			return nil, ErrNotFound
		}
	}
	return s.Get(ctx, id)
}

// Delete removes a template. Returns ErrInUse when invitations still reference it (FK violation).
func (s *Store) Delete(ctx context.Context, id string) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM tbl_templates WHERE id = $1::uuid`, id)
	switch pgCode(err) {
	case "23503":
		return ErrInUse
	case "22P02":
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}