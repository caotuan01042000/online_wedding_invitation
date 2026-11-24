package router

import (
	"errors"
	"log"
	"net/http"

	"online-wedding-invitation/internal/auth"
	"online-wedding-invitation/internal/domain/user"
	"online-wedding-invitation/internal/handler"
)

// adminOnly: valid JWT + the user is STILL an active admin in the DB.
// The DB check means locking or demoting an admin takes effect immediately (not after the token expires).
func adminOnly(secret []byte, users handler.UserStore, next http.HandlerFunc) http.HandlerFunc {
	return auth.Require(secret, func(w http.ResponseWriter, r *http.Request) {
		u, err := users.FindByID(r.Context(), auth.UserFrom(r.Context()))
		switch {
		case errors.Is(err, user.ErrNotFound), err == nil && !u.IsActive:
			jsonError(w, http.StatusUnauthorized, "chưa đăng nhập")
		case err != nil:
			log.Printf("adminOnly: find user: %v", err)
			jsonError(w, http.StatusInternalServerError, "lỗi hệ thống")
		case u.Role != user.RoleAdmin:
			jsonError(w, http.StatusForbidden, "không đủ quyền")
		default:
			next(w, r)
		}
	})
}

func registerAdminRoutes(mux *http.ServeMux, secret []byte, users handler.UserStore, h *handler.Admin) {
	admin := func(fn http.HandlerFunc) http.HandlerFunc { return adminOnly(secret, users, fn) }

	// users
	mux.HandleFunc("GET /api/admin/users", admin(h.ListUsers))
	mux.HandleFunc("POST /api/admin/users", admin(h.CreateUser))
	mux.HandleFunc("GET /api/admin/users/{id}", admin(h.GetUser))
	mux.HandleFunc("PATCH /api/admin/users/{id}", admin(h.UpdateUser))
	mux.HandleFunc("POST /api/admin/users/{id}/reset-password", admin(h.ResetPassword))
	mux.HandleFunc("DELETE /api/admin/users/{id}", admin(h.DeleteUser))

	// templates
	mux.HandleFunc("GET /api/admin/templates", admin(h.ListTemplates))
	mux.HandleFunc("POST /api/admin/templates", admin(h.CreateTemplate))
	mux.HandleFunc("GET /api/admin/templates/{id}", admin(h.GetTemplate))
	mux.HandleFunc("PATCH /api/admin/templates/{id}", admin(h.UpdateTemplate))
	mux.HandleFunc("DELETE /api/admin/templates/{id}", admin(h.DeleteTemplate))

		// invitations
	mux.HandleFunc("GET /api/admin/invitations", admin(h.ListInvitations))
	mux.HandleFunc("POST /api/admin/invitations", admin(h.CreateInvitation))
	mux.HandleFunc("GET /api/admin/invitations/{id}/render", admin(h.RenderInvitation))

	mux.HandleFunc("GET /api/admin/invitations/{id}", admin(h.GetInvitation))
	mux.HandleFunc("PUT /api/admin/invitations/{id}", admin(h.ReplaceInvitation))
	
	// media (files on Cloudflare R2)
	mux.HandleFunc("GET /api/admin/invitations/{id}/media", admin(h.ListMedia))
	mux.HandleFunc("POST /api/admin/invitations/{id}/media", admin(h.UploadMedia))
	mux.HandleFunc("PATCH /api/admin/invitations/{id}/media/order", admin(h.ReorderMedia))
	mux.HandleFunc("DELETE /api/admin/invitations/{id}/media/{mediaId}", admin(h.DeleteMedia))

	mux.HandleFunc("PATCH /api/admin/invitations/{id}/status", admin(h.SetInvitationStatus))
}