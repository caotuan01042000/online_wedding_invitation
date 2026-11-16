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
	Side        string `json:"side"` // groom | bride
	Bank        string `json:"bank"`
	AccountNo   string `json:"account_no"`
	AccountName string `json:"account_name"`
}

// Content is everything an admin enters for one invitation (the body of POST).
type Content struct {
	UserID     string         `json:"user_id"` // optional: defaults to the admin who creates it
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

// ---------- Read models ----------

type ListFilter struct {
	Q      string
	Limit  int
	Offset int
}

// Summary is one row of the admin list.
type Summary struct {
	ID           string     `json:"id"`
	Slug         string     `json:"slug"`
	Title        string     `json:"title"`
	Status       string     `json:"status"`
	TemplateCode string     `json:"template_code"`
	TemplateName string     `json:"template_name"`
	Groom        string     `json:"groom"`
	Bride        string     `json:"bride"`
	CeremonyAt   *time.Time `json:"ceremony_at"`
	CreatedAt    time.Time  `json:"created_at"`
}

// Render is the payload the frontend feeds into a template (see documents/02-api.md section 2.1).
type Render struct {
	ID       string         `json:"id"`
	Slug     string         `json:"slug"`
	Title    string         `json:"title"`
	Status   string         `json:"status"`
	Template RenderTemplate `json:"template"`
	Theme    map[string]any `json:"theme"`
	Sections map[string]any `json:"sections"`
	Couple   Couple         `json:"couple"`
	Event    Event          `json:"event"`
	Schedule []ScheduleItem `json:"schedule"`
	Gifts    []RenderGift   `json:"gifts"`
	Media    RenderMedia    `json:"media"`
	Wishes   []map[string]any `json:"wishes"`
}

type RenderTemplate struct {
	Code string `json:"code"`
}

type Couple struct {
	Groom Person `json:"groom"`
	Bride Person `json:"bride"`
}

type RenderGift struct {
	Side        string  `json:"side"`
	Bank        string  `json:"bank"`
	AccountNo   string  `json:"account_no"`
	AccountName string  `json:"account_name"`
	QRURL       *string `json:"qr_url"`
}

type RenderMedia struct {
	CoverURL *string             `json:"cover_url"`
	HeroURL  *string             `json:"hero_url"`
	MusicURL *string             `json:"music_url"`
	Photos   []map[string]string `json:"photos"`
}