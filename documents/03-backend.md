# 03. Kiến trúc backend (Go)

## 1. Cấu trúc thư mục đề xuất

```
backend/
├── cmd/server/main.go
├── internal/
│   ├── config/config.go
│   ├── auth/token.go                  # JWT + Require middleware (đã có)
│   ├── db/db.go                       # Connect (chỉ giữ Connect)
│   │   └── migrations/*.sql           # 001, 002, ... chạy bằng golang-migrate
│   │
│   ├── domain/                        # mỗi nghiệp vụ một thư mục
│   │   ├── user/        model.go  store.go
│   │   ├── template/    model.go  store.go
│   │   ├── invitation/  model.go  store.go  service.go  validate.go
│   │   ├── media/       model.go  store.go
│   │   ├── rsvp/        model.go  store.go
│   │   └── wish/        model.go  store.go
│   │
│   ├── storage/                       # lưu file upload
│   │   ├── storage.go                 # interface Storage
│   │   └── local.go                   # ghi ra đĩa
│   │
│   ├── handler/                       # lớp HTTP: parse, validate, gọi service, trả JSON
│   │   ├── response.go                # writeJSON, writeError, decodeJSON
│   │   ├── paging.go                  # đọc page, page_size
│   │   ├── auth.go
│   │   ├── admin_user.go
│   │   ├── admin_template.go
│   │   ├── admin_invitation.go
│   │   ├── admin_media.go
│   │   ├── admin_feedback.go          # RSVP + wishes phía admin
│   │   └── public_invitation.go       # render, rsvp, wishes phía khách
│   │
│   └── router/
│       ├── router.go                  # ghép các nhóm route + middleware
│       ├── routes_admin.go
│       ├── routes_public.go
│       └── middleware.go              # recoverer, logger, rateLimit
├── web/static/
└── uploads/                           # volume docker, không commit
```

### Quy tắc phụ thuộc (một chiều)

```
handler  →  domain (service, store)  →  db / storage
router   →  handler
```

- `domain/*` **không import** `handler` hay `router`.
- `handler` phụ thuộc vào **interface** do chính nó khai báo (như `UserStore` đang làm), để viết test bằng mock.
- Domain nào chỉ là CRUD đơn giản (`template`, `rsvp`, `wish`) thì handler gọi thẳng `store`. Domain có logic nhiều bước (`invitation`) thì có thêm `service`.

## 2. Domain `invitation`

### `model.go`

```go
package invitation

import "time"

const (
	StatusDraft     = "draft"
	StatusPublished = "published"
	StatusArchived  = "archived"
)

type Person struct {
	ShortName string `json:"short_name"`
	FullName  string `json:"full_name"`
	Rank      string `json:"rank"`
	Father    string `json:"father"`
	Mother    string `json:"mother"`
	Address   string `json:"address"`
}

type Event struct {
	CeremonyAt     time.Time  `json:"ceremony_at"`
	CeremonyPlace  string     `json:"ceremony_place"`
	PartyAt        *time.Time `json:"party_at"`
	VenueName      string     `json:"venue_name"`
	VenueAddress   string     `json:"venue_address"`
	MapURL         string     `json:"map_url"`
	LunarText      string     `json:"lunar_text"`
	DressCode      string     `json:"dress_code"`
	DressColors    []string   `json:"dress_colors"`
	ClosingMessage string     `json:"closing_message"`
}

type ScheduleItem struct {
	Time  string `json:"time"` // "HH:MM"
	Title string `json:"title"`
}

type Gift struct {
	Side        string  `json:"side"` // groom | bride
	Bank        string  `json:"bank"`
	AccountNo   string  `json:"account_no"`
	AccountName string  `json:"account_name"`
	QRMediaID   *string `json:"qr_media_id"`
}

// Content is everything an admin edits for one invitation (the body of POST/PUT).
type Content struct {
	UserID     string         `json:"user_id"`
	TemplateID string         `json:"template_id"`
	Slug       string         `json:"slug"`
	Title      string         `json:"title"`
	Settings   map[string]any `json:"settings"`
	Groom      Person         `json:"groom"`
	Bride      Person         `json:"bride"`
	Event      Event          `json:"event"`
	Schedule   []ScheduleItem `json:"schedule"`
	Gifts      []Gift         `json:"gifts"`
}
```

### `validate.go`

```go
package invitation

import (
	"regexp"
	"strings"
	"unicode/utf8"
)

var (
	slugRe  = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)
	colorRe = regexp.MustCompile(`^#[0-9A-Fa-f]{6}$`)
	timeRe  = regexp.MustCompile(`^([01][0-9]|2[0-3]):[0-5][0-9]$`)
)

// Normalize trims input in place. Call it before Validate.
func (c *Content) Normalize() {
	c.Slug = strings.ToLower(strings.TrimSpace(c.Slug))
	c.Title = strings.TrimSpace(c.Title)
	c.Groom.ShortName = strings.TrimSpace(c.Groom.ShortName)
	c.Groom.FullName = strings.TrimSpace(c.Groom.FullName)
	c.Bride.ShortName = strings.TrimSpace(c.Bride.ShortName)
	c.Bride.FullName = strings.TrimSpace(c.Bride.FullName)
}

// Validate returns field errors keyed by JSON path, e.g. {"groom.short_name": "bắt buộc"}.
func (c Content) Validate() map[string]string {
	errs := map[string]string{}
	if c.UserID == "" {
		errs["user_id"] = "bắt buộc"
	}
	if c.TemplateID == "" {
		errs["template_id"] = "bắt buộc"
	}
	if n := len(c.Slug); n < 3 || n > 100 || !slugRe.MatchString(c.Slug) {
		errs["slug"] = "3-100 ký tự, chỉ gồm a-z, 0-9 và dấu '-'"
	}
	if utf8.RuneCountInString(c.Title) > 200 {
		errs["title"] = "tối đa 200 ký tự"
	}
	checkPerson := func(prefix string, p Person) {
		if p.ShortName == "" || utf8.RuneCountInString(p.ShortName) > 50 {
			errs[prefix+".short_name"] = "bắt buộc, tối đa 50 ký tự"
		}
		if p.FullName == "" || utf8.RuneCountInString(p.FullName) > 150 {
			errs[prefix+".full_name"] = "bắt buộc, tối đa 150 ký tự"
		}
	}
	checkPerson("groom", c.Groom)
	checkPerson("bride", c.Bride)

	if c.Event.CeremonyAt.IsZero() {
		errs["event.ceremony_at"] = "bắt buộc"
	}
	if len(c.Event.DressColors) > 6 {
		errs["event.dress_colors"] = "tối đa 6 màu"
	}
	for _, col := range c.Event.DressColors {
		if !colorRe.MatchString(col) {
			errs["event.dress_colors"] = "màu phải dạng #RRGGBB"
			break
		}
	}
	if len(c.Schedule) > 20 {
		errs["schedule"] = "tối đa 20 dòng"
	}
	for _, s := range c.Schedule {
		if !timeRe.MatchString(s.Time) || s.Title == "" {
			errs["schedule"] = "mỗi dòng cần giờ HH:MM và nội dung"
			break
		}
	}
	if len(c.Gifts) > 6 {
		errs["gifts"] = "tối đa 6 dòng"
	}
	for _, g := range c.Gifts {
		if g.Side != "groom" && g.Side != "bride" {
			errs["gifts"] = "side phải là groom hoặc bride"
			break
		}
	}
	return errs
}
```

### `store.go`: ghi nội dung thiệp bằng một transaction

```go
package invitation

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrNotFound  = errors.New("không tìm thấy thiệp")
	ErrSlugTaken = errors.New("slug đã được sử dụng")
)

type Store struct{ pool *pgxpool.Pool }

func New(pool *pgxpool.Pool) *Store { return &Store{pool: pool} }

// Create inserts the invitation and all of its child rows atomically.
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
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" { // unique_violation on slug
			return "", ErrSlugTaken
		}
		return "", err
	}

	if err := writeChildren(ctx, tx, id, c); err != nil {
		return "", err
	}
	return id, tx.Commit(ctx)
}

// Replace overwrites the content of an existing invitation (PUT semantics).
func (s *Store) Replace(ctx context.Context, id string, c Content) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `
		UPDATE tbl_invitations
		SET user_id = $2::uuid, template_id = $3::uuid, slug = $4, title = $5, data = $6
		WHERE id = $1::uuid`,
		id, c.UserID, c.TemplateID, c.Slug, c.Title, c.Settings)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return ErrSlugTaken
		}
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	// Children are replaced wholesale. Media is NOT touched here (it has its own API).
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

	for i, s := range c.Schedule {
		if _, err := tx.Exec(ctx, `
			INSERT INTO tbl_wedding_schedules (invitation_id, at_time, title, sort_order)
			VALUES ($1::uuid, $2::time, $3, $4)`, id, s.Time, s.Title, i); err != nil {
			return err
		}
	}
	for i, g := range c.Gifts {
		if _, err := tx.Exec(ctx, `
			INSERT INTO tbl_wedding_gifts
			  (invitation_id, side, bank_name, account_no, account_name, qr_media_id, sort_order)
			VALUES ($1::uuid, $2, $3, $4, $5, $6::uuid, $7)`,
			id, g.Side, g.Bank, g.AccountNo, g.AccountName, g.QRMediaID, i); err != nil {
			return err
		}
	}
	return nil
}
```

> Còn thiếu để đại ca tự viết tiếp theo cùng khuôn: `GetByID` (cho form sửa), `List` (phân trang), `SetStatus`, `Delete`, và **`LoadRender(ctx, slug, onlyPublished bool)`**, hàm gom toàn bộ dữ liệu (invitation + people + info + schedule + gifts + media + wishes + `template.config`) thành payload mục 2.1 của `02-api.md`. Admin preview và public dùng chung hàm này, chỉ khác tham số `onlyPublished`.

### `service.go`: nơi đặt quy tắc nghiệp vụ

```go
package invitation

import (
	"context"
	"errors"
)

var ErrIncomplete = errors.New("thiệp chưa đủ thông tin để xuất bản")

// Service wraps the store with rules that span several tables.
type Service struct{ store *Store }

func NewService(store *Store) *Service { return &Service{store: store} }

// Publish checks the invitation is complete, then flips its status.
func (s *Service) Publish(ctx context.Context, id string) error {
	ok, err := s.store.IsComplete(ctx, id) // groom + bride + wedding_infos all exist
	if err != nil {
		return err
	}
	if !ok {
		return ErrIncomplete
	}
	return s.store.SetStatus(ctx, id, StatusPublished)
}
```

Về sau, khi user tự sửa thiệp, thêm hàm kiểu `UpdateOwn(ctx, userID, id, c)` trong service: kiểm tra `invitation.user_id == userID` rồi gọi `store.Replace`. Handler admin và handler user cùng dùng service này.

## 3. Interface lưu file

```go
package storage

import (
	"context"
	"io"
)

// Storage hides where uploaded files live, so handlers do not care about disk vs S3.
type Storage interface {
	Save(ctx context.Context, key string, r io.Reader) error
	Delete(ctx context.Context, key string) error
	URL(key string) string // public URL, e.g. "/uploads/" + key
}
```

`local.go` ghi vào `cfg.UploadDir` (mặc định `./uploads`), tạo thư mục con theo `năm/tháng`. Sau này viết thêm `s3.go` implement cùng interface, không phải sửa handler.

Cấu hình thêm trong `config.go`:

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `UPLOAD_DIR` | `./uploads` | Thư mục lưu file |
| `UPLOAD_MAX_MB` | `10` | Giới hạn upload |

## 4. Router

```go
// router/routes_admin.go
package router

import (
	"net/http"

	"online-wedding-invitation/internal/auth"
	"online-wedding-invitation/internal/domain/user"
	"online-wedding-invitation/internal/handler"
)

// adminOnly wraps a handler so only logged-in admins can call it.
func adminOnly(secret []byte, h http.HandlerFunc) http.HandlerFunc {
	return auth.Require(secret, h, user.RoleAdmin)
}

func registerAdminRoutes(mux *http.ServeMux, secret []byte, h *handler.Admin) {
	// users
	mux.HandleFunc("GET /api/admin/users", adminOnly(secret, h.ListUsers))
	mux.HandleFunc("POST /api/admin/users", adminOnly(secret, h.CreateUser))
	mux.HandleFunc("GET /api/admin/users/{id}", adminOnly(secret, h.GetUser))
	mux.HandleFunc("PATCH /api/admin/users/{id}", adminOnly(secret, h.UpdateUser))
	mux.HandleFunc("DELETE /api/admin/users/{id}", adminOnly(secret, h.DeleteUser))

	// invitations
	mux.HandleFunc("GET /api/admin/invitations", adminOnly(secret, h.ListInvitations))
	mux.HandleFunc("POST /api/admin/invitations", adminOnly(secret, h.CreateInvitation))
	mux.HandleFunc("GET /api/admin/invitations/{id}", adminOnly(secret, h.GetInvitation))
	mux.HandleFunc("PUT /api/admin/invitations/{id}", adminOnly(secret, h.ReplaceInvitation))
	mux.HandleFunc("PATCH /api/admin/invitations/{id}/status", adminOnly(secret, h.SetInvitationStatus))
	mux.HandleFunc("GET /api/admin/invitations/{id}/render", adminOnly(secret, h.RenderInvitation))
	// ... templates, media, rsvps, wishes follow the same pattern
}
```

```go
// router/routes_public.go
func registerPublicRoutes(mux *http.ServeMux, h *handler.Public, limit middleware) {
	mux.HandleFunc("GET /api/public/invitations/{slug}", h.Render)
	// Write endpoints get a per-IP rate limit.
	mux.Handle("POST /api/public/invitations/{slug}/rsvp", limit(http.HandlerFunc(h.SubmitRSVP)))
	mux.Handle("POST /api/public/invitations/{slug}/wishes", limit(http.HandlerFunc(h.SubmitWish)))
}
```

Go 1.22 đọc path param bằng `r.PathValue("id")`. Thêm tuyến phục vụ file upload:

```go
mux.Handle("GET /uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir(cfg.UploadDir))))
```

## 5. Ví dụ handler: tạo thiệp

```go
// CreateInvitation creates an invitation together with all of its content.
//
//	POST /api/admin/invitations
//	Cookie: token (admin)
//	Body  : invitation.Content JSON (see docs/02-api.md section 3.3), max 64KB
//	201   : {"id": "<uuid>"}
//	400   : body is not valid JSON / unknown field / too large
//	409   : slug already taken
//	422   : validation failed -> {"error": "...", "fields": {"groom.short_name": "..."}}
func (h *Admin) CreateInvitation(w http.ResponseWriter, r *http.Request) {
	var c invitation.Content
	if err := decodeJSON(w, r, &c, 64<<10); err != nil {
		writeError(w, http.StatusBadRequest, "dữ liệu gửi lên không hợp lệ")
		return
	}
	c.Normalize()
	if fields := c.Validate(); len(fields) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"error": "dữ liệu không hợp lệ", "fields": fields})
		return
	}

	id, err := h.Invitations.Create(r.Context(), auth.UserFrom(r.Context()), c)
	switch {
	case errors.Is(err, invitation.ErrSlugTaken):
		writeError(w, http.StatusConflict, err.Error())
	case err != nil:
		log.Printf("create invitation: %v", err)
		writeError(w, http.StatusInternalServerError, "lỗi hệ thống")
	default:
		writeJSON(w, http.StatusCreated, map[string]string{"id": id})
	}
}
```

Mọi handler mới đều ghi doc comment theo khuôn này (method + path, input, các mã trả về) như đại ca yêu cầu.

## 6. Rate limit đơn giản cho route public

Bản đầu dùng bộ nhớ trong tiến trình (đủ cho 1 instance). Nếu chạy nhiều instance thì chuyển sang Redis.

```go
// rateLimit allows `max` requests per `window` for each client IP.
func rateLimit(max int, window time.Duration) middleware {
	var mu sync.Mutex
	hits := map[string][]time.Time{}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip, _, _ := net.SplitHostPort(r.RemoteAddr)
			now := time.Now()

			mu.Lock()
			recent := hits[ip][:0]
			for _, t := range hits[ip] {
				if now.Sub(t) < window {
					recent = append(recent, t)
				}
			}
			if len(recent) >= max {
				hits[ip] = recent
				mu.Unlock()
				w.Header().Set("Retry-After", "60")
				writeError(w, http.StatusTooManyRequests, "gửi quá nhiều, vui lòng thử lại sau")
				return
			}
			hits[ip] = append(recent, now)
			mu.Unlock()

			next.ServeHTTP(w, r)
		})
	}
}
```

Lưu ý: phía sau Next.js proxy thì `RemoteAddr` là IP của container frontend, không phải khách. Cần đọc `X-Forwarded-For` (chỉ tin header này khi request đến từ proxy của mình) rồi mới dùng làm khóa.

## 7. Test

- `invitation.Content.Validate()` là hàm thuần, viết table-driven test ngay (không cần DB).
- Handler test bằng `httptest` với mock `UserStore` / `invitation` interface.
- Test store bằng Postgres thật (docker compose `db`), mỗi test chạy trong một transaction rồi rollback.
