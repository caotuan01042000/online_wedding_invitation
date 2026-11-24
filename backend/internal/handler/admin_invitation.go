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
	if !h.templateOK(w, r, c.TemplateID) {
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
	case errors.Is(err, invitation.ErrBadMedia):
		writeFields(w, map[string]string{"gifts": err.Error()})
	default:
		log.Printf("%s: %v", op, err)
		writeError(w, http.StatusInternalServerError, "lỗi hệ thống")
	}
}

// GetInvitation returns the content of one invitation, shaped like the PUT body (used by the edit form).
//
//	GET /api/admin/invitations/{id}
//	Cookie: token (admin)
//	200   : {"id","status","user_id","template_id","slug","title","settings","groom","bride","event","schedule","gifts"}
//	404   : not found (also when {id} is not a valid UUID)
func (h *Admin) GetInvitation(w http.ResponseWriter, r *http.Request) {
	d, err := h.Invitations.GetByID(r.Context(), r.PathValue("id"))
	if err != nil {
		h.failInvitation(w, err, "get invitation")
		return
	}
	writeJSON(w, http.StatusOK, d)
}

// ReplaceInvitation overwrites the whole content of an invitation (PUT semantics, one transaction).
// Status and uploaded media are not changed.
//
//	PUT /api/admin/invitations/{id}
//	Cookie: token (admin)
//	Body  : same as POST. Send every field: missing ones are cleared (settings included).
//	        user_id empty = keep the current owner. gifts[].qr_media_id must be a "qr" file of THIS invitation.
//	200   : {"id": "<uuid>", "slug": "..."}
//	400   : not JSON / unknown field / too large
//	404   : not found
//	409   : slug already taken
//	422   : {"error": "...", "fields": {...}}
func (h *Admin) ReplaceInvitation(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var c invitation.Content
	if err := decodeJSON(w, r, &c, 64<<10); err != nil {
		writeError(w, http.StatusBadRequest, "dữ liệu gửi lên không hợp lệ")
		return
	}
	c.Normalize()
	if fields := c.Validate(); len(fields) > 0 {
		writeFields(w, fields)
		return
	}

	// Also gives an early 404. The template is only re-checked when it changes, so an invitation
	// can still be edited after its template was switched off.
	cur, err := h.Invitations.GetByID(r.Context(), id)
	if err != nil {
		h.failInvitation(w, err, "replace invitation: get")
		return
	}
	if !strings.EqualFold(c.TemplateID, cur.TemplateID) && !h.templateOK(w, r, c.TemplateID) {
		return
	}

	if err := h.Invitations.Replace(r.Context(), id, c); err != nil {
		h.failInvitation(w, err, "replace invitation")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"id": id, "slug": c.Slug})
}

// templateOK answers 422 / 500 itself and returns false when the template is missing or switched off.
func (h *Admin) templateOK(w http.ResponseWriter, r *http.Request, id string) bool {
	t, err := h.Templates.Get(r.Context(), id)
	switch {
	case errors.Is(err, template.ErrNotFound), err == nil && !t.IsActive:
		writeFields(w, map[string]string{"template_id": "template không tồn tại hoặc đã bị tắt"})
		return false
	case err != nil:
		h.failInvitation(w, err, "get template")
		return false
	}
	return true
}

// SetInvitationStatus publishes / unpublishes / archives an invitation.
//
//	PATCH /api/admin/invitations/{id}/status
//	Cookie: token (admin)
//	Body  : {"status": "draft" | "published" | "archived"}  (max 1KB)
//	200   : {"id": "<uuid>", "status": "published"}
//	400   : bad body
//	404   : not found
//	422   : invalid status
func (h *Admin) SetInvitationStatus(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Status string `json:"status"`
	}
	if err := decodeJSON(w, r, &req, 1<<10); err != nil {
		writeError(w, http.StatusBadRequest, "dữ liệu gửi lên không hợp lệ")
		return
	}
	switch req.Status {
	case invitation.StatusDraft, invitation.StatusPublished, invitation.StatusArchived:
	default:
		writeFields(w, map[string]string{"status": "phải là draft, published hoặc archived"})
		return
	}
	id := r.PathValue("id")
	if err := h.Invitations.SetStatus(r.Context(), id, req.Status); err != nil {
		h.failInvitation(w, err, "set invitation status")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"id": id, "status": req.Status})
}