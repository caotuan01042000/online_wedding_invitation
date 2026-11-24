package handler

import (
	"context"
	"net/http"

	"online-wedding-invitation/internal/domain/invitation"
	"online-wedding-invitation/internal/domain/template"
	"online-wedding-invitation/internal/domain/user"
	"online-wedding-invitation/internal/domain/media"
	"online-wedding-invitation/internal/storage"
)
// AdminUserStore is everything the admin user handlers need (easy to mock in tests).
type AdminUserStore interface {
	List(ctx context.Context, f user.ListFilter) ([]user.User, int, error)
	FindByID(ctx context.Context, id string) (*user.User, error)
	Create(ctx context.Context, n user.NewUser) (*user.User, error)
	Update(ctx context.Context, id string, p user.Patch) (*user.User, error)
	SoftDelete(ctx context.Context, id string) error
	SetPassword(ctx context.Context, id, hash string) error
}

type TemplateStore interface {
	List(ctx context.Context, isActive *bool) ([]template.Template, error)
	Get(ctx context.Context, id string) (*template.Template, error)
	Create(ctx context.Context, createdBy string, n template.NewTemplate) (*template.Template, error)
	Update(ctx context.Context, id string, p template.Patch) (*template.Template, error)
	Delete(ctx context.Context, id string) error
}


// type InvitationStore interface {
// 	Create(ctx context.Context, createdBy string, c invitation.Content) (string, error)
// 	Replace(ctx context.Context, id string, c invitation.Content) error
// 	GetByID(ctx context.Context, id string) (*invitation.Detail, error)
// 	List(ctx context.Context, f invitation.ListFilter) ([]invitation.Summary, int, error)
// 	RenderByID(ctx context.Context, id string) (*invitation.Render, error)
// }

type MediaStore interface {
	InvitationExists(ctx context.Context, id string) (bool, error)
	List(ctx context.Context, invID, kind string) ([]media.Media, error)
	Add(ctx context.Context, n media.NewMedia) (*media.Media, []string, error)
	Delete(ctx context.Context, invID, id string) (string, error)
	Reorder(ctx context.Context, invID string, ids []string) error
}

type Admin struct {
	Users       AdminUserStore
	Templates   TemplateStore
	Invitations InvitationStore
	Media       MediaStore
	Storage     storage.Storage // nil when R2 is not configured: uploads answer 503
}

func writeFields(w http.ResponseWriter, fields map[string]string) {
	writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"error": "dữ liệu không hợp lệ", "fields": fields})
}

type InvitationStore interface {
	Create(ctx context.Context, createdBy string, c invitation.Content) (string, error)
	Replace(ctx context.Context, id string, c invitation.Content) error
	GetByID(ctx context.Context, id string) (*invitation.Detail, error)
	List(ctx context.Context, f invitation.ListFilter) ([]invitation.Summary, int, error)
	RenderByID(ctx context.Context, id string) (*invitation.Render, error)
	SetStatus(ctx context.Context, id, status string) error // NEW
}