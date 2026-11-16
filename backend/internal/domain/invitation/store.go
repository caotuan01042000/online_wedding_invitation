package invitation

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrNotFound     = errors.New("không tìm thấy thiệp")
	ErrSlugTaken    = errors.New("slug đã được sử dụng")
	ErrBadReference = errors.New("template hoặc chủ thiệp không tồn tại")
)

// Vietnam has no DST, so a fixed offset is enough (and works without tzdata on alpine).
var vnZone = time.FixedZone("ICT", 7*3600)

var likeEscaper = strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)

type Store struct{ pool *pgxpool.Pool }

func New(pool *pgxpool.Pool) *Store { return &Store{pool: pool} }

func pgCode(err error) string {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code
	}
	return ""
}

// mapErr turns common Postgres errors into domain errors.
func mapErr(err error) error {
	switch pgCode(err) {
	case "23505": // unique_violation (slug)
		return ErrSlugTaken
	case "23503", "22P02": // foreign_key_violation, malformed uuid
		return ErrBadReference
	}
	return err
}

// Create inserts the invitation and all of its child rows in one transaction.
func (s *Store) Create(ctx context.Context, createdBy string, c Content) (string, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx) // no-op after a successful Commit

	var id string
	err = tx.QueryRow(ctx, `
		INSERT INTO tbl_invitations (user_id, template_id, slug, title, data, created_by)
		VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6::uuid)
		RETURNING id::text`,
		c.UserID, c.TemplateID, c.Slug, c.Title, c.Settings, createdBy).Scan(&id)
	if err != nil {
		return "", mapErr(err)
	}
	if err := writeChildren(ctx, tx, id, c); err != nil {
		return "", err
	}
	if err := tx.Commit(ctx); err != nil {
		return "", err
	}
	return id, nil
}

func writeChildren(ctx context.Context, tx pgx.Tx, id string, c Content) error {
	for side, p := range map[string]Person{"groom": c.Groom, "bride": c.Bride} {
		if _, err := tx.Exec(ctx, `
			INSERT INTO tbl_wedding_people
			  (invitation_id, side, short_name, full_name, rank_label, father_name, mother_name, family_address)
			VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8)`,
			id, side, p.ShortName, p.FullName, p.Rank, p.Father, p.Mother, p.Address); err != nil {
			return err
		}
	}

	e := c.Event
	if _, err := tx.Exec(ctx, `
		INSERT INTO tbl_wedding_infos
		  (invitation_id, ceremony_at, ceremony_place, party_at, venue_name, venue_address,
		   map_url, lunar_text, dress_code, dress_colors, closing_message)
		VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		id, e.CeremonyAt, e.CeremonyPlace, e.PartyAt, e.VenueName, e.VenueAddress,
		e.MapURL, e.LunarText, e.DressCode, e.DressColors, e.ClosingMessage); err != nil {
		return err
	}

	for i, sc := range c.Schedule {
		// ::text::time keeps the parameter a plain string for pgx.
		if _, err := tx.Exec(ctx, `
			INSERT INTO tbl_wedding_schedules (invitation_id, at_time, title, sort_order)
			VALUES ($1::uuid, $2::text::time, $3, $4)`, id, sc.Time, sc.Title, i); err != nil {
			return err
		}
	}
	for i, g := range c.Gifts {
		if _, err := tx.Exec(ctx, `
			INSERT INTO tbl_wedding_gifts (invitation_id, side, bank_name, account_no, account_name, sort_order)
			VALUES ($1::uuid, $2, $3, $4, $5, $6)`,
			id, g.Side, g.Bank, g.AccountNo, g.AccountName, i); err != nil {
			return err
		}
	}
	return nil
}

const listFrom = `
	FROM tbl_invitations i
	JOIN tbl_templates t ON t.id = i.template_id
	LEFT JOIN tbl_wedding_people g ON g.invitation_id = i.id AND g.side = 'groom'
	LEFT JOIN tbl_wedding_people b ON b.invitation_id = i.id AND b.side = 'bride'
	LEFT JOIN tbl_wedding_infos  w ON w.invitation_id = i.id
	WHERE ($1::text = '' OR i.slug ILIKE $2 OR i.title ILIKE $2 OR g.short_name ILIKE $2 OR b.short_name ILIKE $2)`

// List returns one page of invitations (newest first) plus the total number of matches.
func (s *Store) List(ctx context.Context, f ListFilter) ([]Summary, int, error) {
	like := "%" + likeEscaper.Replace(f.Q) + "%"

	var total int
	if err := s.pool.QueryRow(ctx, `SELECT count(*)`+listFrom, f.Q, like).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := s.pool.Query(ctx, `
		SELECT i.id::text, i.slug, COALESCE(i.title, ''), i.status, t.code, t.name,
		       COALESCE(g.short_name, ''), COALESCE(b.short_name, ''), w.ceremony_at, i.created_at`+
		listFrom+` ORDER BY i.created_at DESC, i.id LIMIT $3 OFFSET $4`,
		f.Q, like, f.Limit, f.Offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := []Summary{}
	for rows.Next() {
		var x Summary
		if err := rows.Scan(&x.ID, &x.Slug, &x.Title, &x.Status, &x.TemplateCode, &x.TemplateName,
			&x.Groom, &x.Bride, &x.CeremonyAt, &x.CreatedAt); err != nil {
			return nil, 0, err
		}
		if x.CeremonyAt != nil {
			t := x.CeremonyAt.In(vnZone)
			x.CeremonyAt = &t
		}
		items = append(items, x)
	}
	return items, total, rows.Err()
}

// RenderByID gathers everything a template needs. It does NOT check status (admin preview of drafts).
func (s *Store) RenderByID(ctx context.Context, id string) (*Render, error) {
	r := &Render{
		Schedule: []ScheduleItem{},
		Gifts:    []RenderGift{},
		Wishes:   []map[string]any{},
		Media:    RenderMedia{Photos: []map[string]string{}},
	}

	var tplConfig, custom map[string]any
	err := s.pool.QueryRow(ctx, `
		SELECT i.id::text, i.slug, COALESCE(i.title, ''), i.status, t.code, t.config, i.data
		FROM tbl_invitations i JOIN tbl_templates t ON t.id = i.template_id
		WHERE i.id = $1::uuid`, id).
		Scan(&r.ID, &r.Slug, &r.Title, &r.Status, &r.Template.Code, &tplConfig, &custom)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) || pgCode(err) == "22P02" {
			return nil, ErrNotFound
		}
		return nil, err
	}
	// invitation.data overrides template.config
	r.Theme = merge(tplConfig["theme"], custom["theme"])
	r.Sections = merge(tplConfig["sections"], custom["sections"])

	if err := s.loadPeople(ctx, id, r); err != nil {
		return nil, err
	}
	e := &r.Event
	err = s.pool.QueryRow(ctx, `
		SELECT ceremony_at, COALESCE(ceremony_place, ''), party_at, COALESCE(venue_name, ''),
		       COALESCE(venue_address, ''), COALESCE(map_url, ''), COALESCE(lunar_text, ''),
		       COALESCE(dress_code, ''), dress_colors, COALESCE(closing_message, '')
		FROM tbl_wedding_infos WHERE invitation_id = $1::uuid`, id).
		Scan(&e.CeremonyAt, &e.CeremonyPlace, &e.PartyAt, &e.VenueName, &e.VenueAddress,
			&e.MapURL, &e.LunarText, &e.DressCode, &e.DressColors, &e.ClosingMessage)
	if err != nil {
		return nil, err
	}
	e.CeremonyAt = e.CeremonyAt.In(vnZone)
	if e.PartyAt != nil {
		t := e.PartyAt.In(vnZone)
		e.PartyAt = &t
	}
	if e.DressColors == nil {
		e.DressColors = []string{}
	}

	if err := s.loadSchedule(ctx, id, r); err != nil {
		return nil, err
	}
	if err := s.loadGifts(ctx, id, r); err != nil {
		return nil, err
	}
	return r, nil
}

func (s *Store) loadPeople(ctx context.Context, id string, r *Render) error {
	rows, err := s.pool.Query(ctx, `
		SELECT side, short_name, full_name, COALESCE(rank_label, ''), COALESCE(father_name, ''),
		       COALESCE(mother_name, ''), COALESCE(family_address, '')
		FROM tbl_wedding_people WHERE invitation_id = $1::uuid`, id)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var side string
		var p Person
		if err := rows.Scan(&side, &p.ShortName, &p.FullName, &p.Rank, &p.Father, &p.Mother, &p.Address); err != nil {
			return err
		}
		if side == "groom" {
			r.Couple.Groom = p
		} else {
			r.Couple.Bride = p
		}
	}
	return rows.Err()
}

func (s *Store) loadSchedule(ctx context.Context, id string, r *Render) error {
	rows, err := s.pool.Query(ctx, `
		SELECT to_char(at_time, 'HH24:MI'), title
		FROM tbl_wedding_schedules WHERE invitation_id = $1::uuid ORDER BY sort_order`, id)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var x ScheduleItem
		if err := rows.Scan(&x.Time, &x.Title); err != nil {
			return err
		}
		r.Schedule = append(r.Schedule, x)
	}
	return rows.Err()
}

func (s *Store) loadGifts(ctx context.Context, id string, r *Render) error {
	rows, err := s.pool.Query(ctx, `
		SELECT side, bank_name, account_no, account_name
		FROM tbl_wedding_gifts WHERE invitation_id = $1::uuid ORDER BY sort_order`, id)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var g RenderGift
		if err := rows.Scan(&g.Side, &g.Bank, &g.AccountNo, &g.AccountName); err != nil {
			return err
		}
		r.Gifts = append(r.Gifts, g)
	}
	return rows.Err()
}

// merge copies base, then overlays over. Both may be nil or not an object.
func merge(base, over any) map[string]any {
	out := map[string]any{}
	if b, ok := base.(map[string]any); ok {
		for k, v := range b {
			out[k] = v
		}
	}
	if o, ok := over.(map[string]any); ok {
		for k, v := range o {
			out[k] = v
		}
	}
	return out
}