package handler

import (
	"context"
	"net/http"

	"online-wedding-invitation/internal/domain/template"
	"online-wedding-invitation/internal/domain/user"
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

// Admin groups all /api/admin/* handlers. Later: Invitations, Media, ...
type Admin struct {
	Users     AdminUserStore
	Templates TemplateStore
}

func writeFields(w http.ResponseWriter, fields map[string]string) {
	writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"error": "dữ liệu không hợp lệ", "fields": fields})
}