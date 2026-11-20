package media

import (
	"errors"
	"time"
)

const (
	KindCover      = "cover"
	KindHero       = "hero"
	KindGroom      = "groom"
	KindBride      = "bride"
	KindPhoto      = "photo"
	KindBackground = "background"
	KindQR         = "qr"
	KindMusic      = "music"
)

var (
	ErrNotFound           = errors.New("không tìm thấy file")
	ErrInvitationNotFound = errors.New("không tìm thấy thiệp")
	ErrTooMany            = errors.New("đã đạt số lượng file tối đa cho loại này")
)

type Spec struct {
	Label    string
	Multi    bool              // false = one slot, a new upload replaces the old file
	Max      int               // max files when Multi
	MaxBytes int64
	Mimes    map[string]string // sniffed content type -> extension
}

var (
	imageMimes = map[string]string{"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
	audioMimes = map[string]string{"audio/mpeg": ".mp3"}
)

const (
	imageMax = 5 << 20
	audioMax = 10 << 20
)

var Kinds = map[string]Spec{
	KindCover:      {Label: "Ảnh bìa", MaxBytes: imageMax, Mimes: imageMimes},
	KindHero:       {Label: "Ảnh chính", MaxBytes: imageMax, Mimes: imageMimes},
	KindGroom:      {Label: "Ảnh chú rể", MaxBytes: imageMax, Mimes: imageMimes},
	KindBride:      {Label: "Ảnh cô dâu", MaxBytes: imageMax, Mimes: imageMimes},
	KindPhoto:      {Label: "Album ảnh cưới", Multi: true, Max: 30, MaxBytes: imageMax, Mimes: imageMimes},
	KindBackground: {Label: "Ảnh nền", MaxBytes: imageMax, Mimes: imageMimes},
	KindQR:         {Label: "Ảnh QR nhận mừng", Multi: true, Max: 6, MaxBytes: imageMax, Mimes: imageMimes},
	KindMusic:      {Label: "Nhạc nền", MaxBytes: audioMax, Mimes: audioMimes},
}

type Media struct {
	ID           string    `json:"id"`
	InvitationID string    `json:"invitation_id"`
	Kind         string    `json:"kind"`
	URL          string    `json:"url"`
	MimeType     string    `json:"mime_type"`
	SizeBytes    int64     `json:"size_bytes"`
	SortOrder    int       `json:"sort_order"`
	CreatedAt    time.Time `json:"created_at"`
}

type NewMedia struct {
	InvitationID string
	Kind         string
	StorageKey   string
	URL          string
	MimeType     string
	SizeBytes    int64
}