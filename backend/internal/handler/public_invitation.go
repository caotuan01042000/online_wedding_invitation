package handler

import (
	"context"
	"errors"
	"log"
	"net/http"

	"online-wedding-invitation/internal/domain/invitation"
)

type PublicInvitationStore interface {
	RenderPublished(ctx context.Context, slug string) (*invitation.Render, error)
}

type Public struct {
	Invitations PublicInvitationStore
}

// Render returns the data a template needs, for guests (no login).
//
//	GET /api/public/invitations/{slug}
//	200   : same payload as /api/admin/invitations/{id}/render
//	404   : slug does not exist or the invitation is not published
func (h *Public) Render(w http.ResponseWriter, r *http.Request) {
	out, err := h.Invitations.RenderPublished(r.Context(), r.PathValue("slug"))
	switch {
	case errors.Is(err, invitation.ErrNotFound):
		writeError(w, http.StatusNotFound, "không tìm thấy thiệp")
	case err != nil:
		log.Printf("public render: %v", err)
		writeError(w, http.StatusInternalServerError, "lỗi hệ thống")
	default:
		writeJSON(w, http.StatusOK, out)
	}
}