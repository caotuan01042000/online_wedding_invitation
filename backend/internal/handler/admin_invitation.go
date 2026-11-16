package handler

import (
	"errors"
	"log"
	"net/http"
	"strings"

	"online-wedding-invitation/internal/auth"
	"online-wedding-invitation/internal/domain/invitation"
	"online-wedding-invitation/internal/domain/template"
)

// CreateInvitation creates an invitation together with all of its content (one transaction).
//
//	POST /api/admin/invitations
//	Cookie: token (admin)
//	Body  : invitation.Content JSON, max 64KB. user_id is optional (defaults to the calling admin).
//	        {"template_id":"<uuid>","slug":"minh-tuan-ngoc-anh","groom":{...},"bride":{...},
//	         "event":{"ceremony_at":"2027-01-17T10:00:00+07:00",...},"schedule":[...],"gifts":[...]}
//	201   : {"id": "<uuid>", "slug": "..."}   (status is "draft")
//	400   : not JSON / unknown field / too large
//	409   : slug already taken
//	422   : {"error": "...", "fields": {"groom.short_name": "..."}}
func (h *Admin) CreateInvitation(w http.ResponseWriter, r *http.Request) {
	var c invitation.Content
	if err := decodeJSON(w, r, &c, 64<<10); err != nil {
		writeError(w, http.StatusBadRequest, "dữ liệu gửi lên không hợp lệ")
		return
	}
	c.Normalize()
	if c.UserID == "" {
		c.UserID = auth.UserFrom(r.Context())
	}
	if fields := c.Validate(); len(fields) > 0 {
		writeFields(w, fields)
		return
	}

	// The template must exist and be active.
	t, err := h.Templates.Get(r.Context(), c.TemplateID)
	switch {
	case errors.Is(err, template.ErrNotFound), err == nil && !t.IsActive:
		writeFields(w, map[string]string{"template_id": "template không tồn tại hoặc đã bị tắt"})
		return
	case err != nil:
		h.failInvitation(w, err, "create invitation: get template")
		return
	}

	id, err := h.Invitations.Create(r.Context(), auth.UserFrom(r.Context()), c)
	if err != nil {
		h.failInvitation(w, err, "create invitation")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"id": id, "slug": c.Slug})
}

// ListInvitations returns a page of invitations, newest first.
//
//	GET /api/admin/invitations?q=&page=1&page_size=20
//	Cookie: token (admin)
//	q     : optional, matches slug / title / groom / bride short name
//	200   : {"items": [summary...], "page": 1, "page_size": 20, "total": 3}
func (h *Admin) ListInvitations(w http.ResponseWriter, r *http.Request) {
	p := readPaging(r)
	f := invitation.ListFilter{
		Q:      strings.TrimSpace(r.URL.Query().Get("q")),
		Limit:  p.Size,
		Offset: p.Offset(),
	}
	items, total, err := h.Invitations.List(r.Context(), f)
	if err != nil {
		h.failInvitation(w, err, "list invitations")
		return
	}
	writePage(w, items, p, total)
}

// RenderInvitation returns the full payload used to draw a template (drafts included, for admin preview).
//
//	GET /api/admin/invitations/{id}/render
//	Cookie: token (admin)
//	200   : see invitation.Render / documents/02-api.md section 2.1
//	404   : not found (also when {id} is not a valid UUID)
func (h *Admin) RenderInvitation(w http.ResponseWriter, r *http.Request) {
	out, err := h.Invitations.RenderByID(r.Context(), r.PathValue("id"))
	if err != nil {
		h.failInvitation(w, err, "render invitation")
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *Admin) failInvitation(w http.ResponseWriter, err error, op string) {
	switch {
	case errors.Is(err, invitation.ErrNotFound):
		writeError(w, http.StatusNotFound, err.Error())
	case errors.Is(err, invitation.ErrSlugTaken):
		writeError(w, http.StatusConflict, err.Error())
	case errors.Is(err, invitation.ErrBadReference):
		writeError(w, http.StatusUnprocessableEntity, err.Error())
	default:
		log.Printf("%s: %v", op, err)
		writeError(w, http.StatusInternalServerError, "lỗi hệ thống")
	}
}