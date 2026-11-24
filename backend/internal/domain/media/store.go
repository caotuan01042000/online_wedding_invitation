package media

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct{ pool *pgxpool.Pool }

func New(pool *pgxpool.Pool) *Store { return &Store{pool: pool} }

func pgCode(err error) string {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code
	}
	return ""
}

const cols = `id::text, invitation_id::text, kind, url, mime_type, size_bytes, sort_order, created_at`

type scanner interface{ Scan(dest ...any) error }

func scan(row scanner) (*Media, error) {
	var m Media
	if err := row.Scan(&m.ID, &m.InvitationID, &m.Kind, &m.URL, &m.MimeType, &m.SizeBytes, &m.SortOrder, &m.CreatedAt); err != nil {
		return nil, err
	}
	return &m, nil
}

func (s *Store) InvitationExists(ctx context.Context, id string) (bool, error) {
	var ok bool
	err := s.pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM tbl_invitations WHERE id = $1::uuid)`, id).Scan(&ok)
	if pgCode(err) == "22P02" {
		return false, nil
	}
	return ok, err
}

func (s *Store) List(ctx context.Context, invID, kind string) ([]Media, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT `+cols+` FROM tbl_media
				WHERE invitation_id = $1::uuid AND ($2::text = '' OR kind = $2::text)
		ORDER BY kind, sort_order, created_at`, invID, kind)
	if err != nil {
		if pgCode(err) == "22P02" {
			return nil, ErrInvitationNotFound
		}
		return nil, err
	}
	defer rows.Close()

	items := []Media{}
	for rows.Next() {
		m, err := scan(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *m)
	}
	return items, rows.Err()
}

// Add inserts a file. Single-slot kinds replace the old file; the old storage keys are returned
// so the caller can delete them from R2 after the commit.
func (s *Store) Add(ctx context.Context, n NewMedia) (*Media, []string, error) {
	spec := Kinds[n.Kind]

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, nil, err
	}
	defer tx.Rollback(ctx)

	var lockedID string
	err = tx.QueryRow(ctx, `SELECT id::text FROM tbl_invitations WHERE id = $1::uuid FOR UPDATE`, n.InvitationID).Scan(&lockedID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) || pgCode(err) == "22P02" {
			return nil, nil, ErrInvitationNotFound
		}
		return nil, nil, err
	}

	var replaced []string
	if spec.Multi {
		var count int
		if err := tx.QueryRow(ctx,
			`SELECT count(*) FROM tbl_media WHERE invitation_id = $1::uuid AND kind = $2`, n.InvitationID, n.Kind).Scan(&count); err != nil {
			return nil, nil, err
		}
		if count >= spec.Max {
			return nil, nil, ErrTooMany
		}
	} else {
		rows, err := tx.Query(ctx,
			`DELETE FROM tbl_media WHERE invitation_id = $1::uuid AND kind = $2 RETURNING storage_key`, n.InvitationID, n.Kind)
		if err != nil {
			return nil, nil, err
		}
		for rows.Next() {
			var key string
			if err := rows.Scan(&key); err != nil {
				rows.Close()
				return nil, nil, err
			}
			replaced = append(replaced, key)
		}
		rows.Close()
		if err := rows.Err(); err != nil {
			return nil, nil, err
		}
	}

	m, err := scan(tx.QueryRow(ctx, `
		INSERT INTO tbl_media (invitation_id, kind, storage_key, url, mime_type, size_bytes, sort_order)
		VALUES ($1::uuid, $2::varchar, $3, $4, $5, $6,
		  COALESCE((SELECT max(sort_order) + 1 FROM tbl_media WHERE invitation_id = $1::uuid AND kind = $2::varchar), 0))
		RETURNING `+cols,
		n.InvitationID, n.Kind, n.StorageKey, n.URL, n.MimeType, n.SizeBytes))
	if err != nil {
		return nil, nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, nil, err
	}
	return m, replaced, nil
}

func (s *Store) Delete(ctx context.Context, invID, id string) (string, error) {
	var key string
	err := s.pool.QueryRow(ctx,
		`DELETE FROM tbl_media WHERE id = $1::uuid AND invitation_id = $2::uuid RETURNING storage_key`, id, invID).Scan(&key)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) || pgCode(err) == "22P02" {
			return "", ErrNotFound
		}
		return "", err
	}
	return key, nil
}

func (s *Store) Reorder(ctx context.Context, invID string, ids []string) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for i, id := range ids {
		tag, err := tx.Exec(ctx, `
			UPDATE tbl_media SET sort_order = $3
			WHERE id = $1::uuid AND invitation_id = $2::uuid AND kind = 'photo'`, id, invID, i)
		if err != nil {
			if pgCode(err) == "22P02" {
				return ErrNotFound
			}
			return err
		}
		if tag.RowsAffected() == 0 {
			return ErrNotFound
		}
	}
	return tx.Commit(ctx)
}