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
	ErrBadMedia     = errors.New("ảnh QR không tồn tại hoặc không thuộc thiệp này")
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

func mapErr(err error) error {
	switch pgCode(err) {
	case "23505":
		return ErrSlugTaken
	case "23503", "22P02":
		return ErrBadReference
	}
	return err
}

func (s *Store) Create(ctx context.Context, createdBy string, c Content) (string, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)

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

// Replace overwrites the content of an existing invitation (PUT semantics) in one transaction.
// Status and uploaded media are NOT touched. An empty UserID keeps the current owner.
func (s *Store) Replace(ctx context.Context, id string, c Content) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `
		UPDATE tbl_invitations
		SET user_id = COALESCE(NULLIF($2::text, '')::uuid, user_id),
		    template_id = $3::uuid, slug = $4, title = $5, data = $6
		WHERE id = $1::uuid`,
		id, c.UserID, c.TemplateID, c.Slug, c.Title, c.Settings)
	if err != nil {
		if pgCode(err) == "22P02" && !isUUIDLike(id) {
			return ErrNotFound
		}
		return mapErr(err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	for _, table := range []string{"tbl_wedding_people", "tbl_wedding_infos", "tbl_wedding_schedules", "tbl_wedding_gifts"} {
		if _, err := tx.Exec(ctx, `DELETE FROM `+table+` WHERE invitation_id = $1::uuid`, id); err != nil {
			return err
		}
	}
	if err := writeChildren(ctx, tx, id, c); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func isUUIDLike(s string) bool {
	if len(s) != 36 {
		return false
	}
	for i, r := range s {
		switch {
		case i == 8 || i == 13 || i == 18 || i == 23:
			if r != '-' {
				return false
			}
		case !(r >= '0' && r <= '9' || r >= 'a' && r <= 'f' || r >= 'A' && r <= 'F'):
			return false
		}
	}
	return true
}

func qrID(g Gift) *string {
	if g.QRMediaID == nil {
		return nil
	}
	v := strings.ToLower(strings.TrimSpace(*g.QRMediaID))
	if v == "" {
		return nil
	}
	return &v
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
		if _, err := tx.Exec(ctx, `
			INSERT INTO tbl_wedding_schedules (invitation_id, at_time, title, sort_order)
			VALUES ($1::uuid, $2::text::time, $3, $4)`, id, sc.Time, sc.Title, i); err != nil {
			return err
		}
	}

	// Every QR id must be a "qr" file of this same invitation.
	distinct := map[string]bool{}
	for _, g := range c.Gifts {
		if q := qrID(g); q != nil {
			distinct[*q] = true
		}
	}
	if len(distinct) > 0 {
		ids := make([]string, 0, len(distinct))
		for k := range distinct {
			ids = append(ids, k)
		}
		var found int
		if err := tx.QueryRow(ctx, `
			SELECT count(*) FROM tbl_media
			WHERE invitation_id = $1::uuid AND kind = 'qr' AND id::text = ANY($2::text[])`, id, ids).Scan(&found); err != nil {
			return err
		}
		if found != len(ids) {
			return ErrBadMedia
		}
	}

	for i, g := range c.Gifts {
		if _, err := tx.Exec(ctx, `
			INSERT INTO tbl_wedding_gifts (invitation_id, side, bank_name, account_no, account_name, qr_media_id, sort_order)
			VALUES ($1::uuid, $2, $3, $4, $5, $6::uuid, $7)`,
			id, g.Side, g.Bank, g.AccountNo, g.AccountName, qrID(g), i); err != nil {
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

// GetByID loads everything the edit form needs (same shape as the PUT body, plus id and status).
func (s *Store) GetByID(ctx context.Context, id string) (*Detail, error) {
	d := &Detail{}
	err := s.pool.QueryRow(ctx, `
		SELECT id::text, status, user_id::text, template_id::text, slug, COALESCE(title, ''), data
		FROM tbl_invitations WHERE id = $1::uuid`, id).
		Scan(&d.ID, &d.Status, &d.UserID, &d.TemplateID, &d.Slug, &d.Title, &d.Settings)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) || pgCode(err) == "22P02" {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if d.Settings == nil {
		d.Settings = map[string]any{}
	}

	couple, err := s.loadPeople(ctx, id)
	if err != nil {
		return nil, err
	}
	d.Groom, d.Bride = couple.Groom, couple.Bride

	if d.Event, err = s.loadEvent(ctx, id); err != nil {
		return nil, err
	}
	if d.Schedule, err = s.loadSchedule(ctx, id); err != nil {
		return nil, err
	}
	gifts, err := s.loadGifts(ctx, id)
	if err != nil {
		return nil, err
	}
	d.Gifts = make([]Gift, 0, len(gifts))
	for _, g := range gifts {
		d.Gifts = append(d.Gifts, Gift{Side: g.Side, Bank: g.Bank, AccountNo: g.AccountNo, AccountName: g.AccountName, QRMediaID: g.QRMediaID})
	}
	return d, nil
}

// RenderByID gathers everything a template needs. It does NOT check status (admin preview of drafts).
func (s *Store) RenderByID(ctx context.Context, id string) (*Render, error) {
	r := &Render{Wishes: []map[string]any{}}

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
	r.Theme = merge(tplConfig["theme"], custom["theme"])
	r.Sections = merge(tplConfig["sections"], custom["sections"])

	if r.Couple, err = s.loadPeople(ctx, id); err != nil {
		return nil, err
	}
	if r.Event, err = s.loadEvent(ctx, id); err != nil {
		return nil, err
	}
	if r.Schedule, err = s.loadSchedule(ctx, id); err != nil {
		return nil, err
	}
	if r.Gifts, err = s.loadGifts(ctx, id); err != nil {
		return nil, err
	}
	if r.Media, err = s.loadMedia(ctx, id); err != nil {
		return nil, err
	}
	return r, nil
}

func (s *Store) loadPeople(ctx context.Context, id string) (Couple, error) {
	var c Couple
	rows, err := s.pool.Query(ctx, `
		SELECT side, short_name, full_name, COALESCE(rank_label, ''), COALESCE(father_name, ''),
		       COALESCE(mother_name, ''), COALESCE(family_address, '')
		FROM tbl_wedding_people WHERE invitation_id = $1::uuid`, id)
	if err != nil {
		return c, err
	}
	defer rows.Close()
	for rows.Next() {
		var side string
		var p Person
		if err := rows.Scan(&side, &p.ShortName, &p.FullName, &p.Rank, &p.Father, &p.Mother, &p.Address); err != nil {
			return c, err
		}
		if side == "groom" {
			c.Groom = p
		} else {
			c.Bride = p
		}
	}
	return c, rows.Err()
}

func (s *Store) loadEvent(ctx context.Context, id string) (Event, error) {
	var e Event
	err := s.pool.QueryRow(ctx, `
		SELECT ceremony_at, COALESCE(ceremony_place, ''), party_at, COALESCE(venue_name, ''),
		       COALESCE(venue_address, ''), COALESCE(map_url, ''), COALESCE(lunar_text, ''),
		       COALESCE(dress_code, ''), dress_colors, COALESCE(closing_message, '')
		FROM tbl_wedding_infos WHERE invitation_id = $1::uuid`, id).
		Scan(&e.CeremonyAt, &e.CeremonyPlace, &e.PartyAt, &e.VenueName, &e.VenueAddress,
			&e.MapURL, &e.LunarText, &e.DressCode, &e.DressColors, &e.ClosingMessage)
	if err != nil {
		return e, err
	}
	e.CeremonyAt = e.CeremonyAt.In(vnZone)
	if e.PartyAt != nil {
		t := e.PartyAt.In(vnZone)
		e.PartyAt = &t
	}
	if e.DressColors == nil {
		e.DressColors = []string{}
	}
	return e, nil
}

func (s *Store) loadSchedule(ctx context.Context, id string) ([]ScheduleItem, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT to_char(at_time, 'HH24:MI'), title
		FROM tbl_wedding_schedules WHERE invitation_id = $1::uuid ORDER BY sort_order`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []ScheduleItem{}
	for rows.Next() {
		var x ScheduleItem
		if err := rows.Scan(&x.Time, &x.Title); err != nil {
			return nil, err
		}
		items = append(items, x)
	}
	return items, rows.Err()
}

func (s *Store) loadGifts(ctx context.Context, id string) ([]RenderGift, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT g.side, g.bank_name, g.account_no, g.account_name, g.qr_media_id::text, m.url
		FROM tbl_wedding_gifts g
		LEFT JOIN tbl_media m ON m.id = g.qr_media_id
		WHERE g.invitation_id = $1::uuid ORDER BY g.sort_order`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []RenderGift{}
	for rows.Next() {
		var g RenderGift
		if err := rows.Scan(&g.Side, &g.Bank, &g.AccountNo, &g.AccountName, &g.QRMediaID, &g.QRURL); err != nil {
			return nil, err
		}
		items = append(items, g)
	}
	return items, rows.Err()
}

// loadMedia maps uploaded files to the slots a template can use. QR files are reached through gifts.
func (s *Store) loadMedia(ctx context.Context, id string) (RenderMedia, error) {
	m := RenderMedia{Photos: []map[string]string{}}
	rows, err := s.pool.Query(ctx, `
		SELECT id::text, kind, url FROM tbl_media
		WHERE invitation_id = $1::uuid AND kind <> 'qr'
		ORDER BY sort_order, created_at`, id)
	if err != nil {
		return m, err
	}
	defer rows.Close()
	for rows.Next() {
		var mid, kind, url string
		if err := rows.Scan(&mid, &kind, &url); err != nil {
			return m, err
		}
		u := url
		switch kind {
		case "cover":
			m.CoverURL = &u
		case "hero":
			m.HeroURL = &u
		case "groom":
			m.GroomURL = &u
		case "bride":
			m.BrideURL = &u
		case "background":
			m.BackgroundURL = &u
		case "music":
			m.MusicURL = &u
		case "photo":
			m.Photos = append(m.Photos, map[string]string{"id": mid, "url": url})
		}
	}
	return m, rows.Err()
}

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

// RenderPublished loads a PUBLISHED invitation by slug (guests). Drafts and archived ones are "not found".
func (s *Store) RenderPublished(ctx context.Context, slug string) (*Render, error) {
	var id string
	err := s.pool.QueryRow(ctx,
		`SELECT id::text FROM tbl_invitations WHERE slug = $1 AND status = 'published'`,
		strings.ToLower(strings.TrimSpace(slug))).Scan(&id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	out, err := s.RenderByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Count the view without blocking the response.
	go func() {
		c, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_, _ = s.pool.Exec(c, `UPDATE tbl_invitations SET view_count = view_count + 1 WHERE id = $1::uuid`, id)
	}()
	return out, nil
}

// SetStatus switches draft / published / archived. published_at is set only the first time.
func (s *Store) SetStatus(ctx context.Context, id, status string) error {
	tag, err := s.pool.Exec(ctx, `
		UPDATE tbl_invitations
		SET status = $2::varchar,
		    published_at = CASE WHEN $2::varchar = 'published' THEN COALESCE(published_at, now()) ELSE published_at END
		WHERE id = $1::uuid`, id, status)
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