package handler

import (
	"errors"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"

	"online-wedding-invitation/internal/auth"
	"online-wedding-invitation/internal/domain/template"
)

var templateCodeRe = regexp.MustCompile(`^[a-z0-9_-]{2,50}$`)

// ---------- Request DTOs ----------

type createTemplateReq struct {
	Code         string         `json:"code"`          // required, 2-50 chars [a-z0-9_-], must match a key in the FE registry, immutable
	Name         string         `json:"name"`          // required, max 150 chars
	Description  string         `json:"description"`   // optional
	ThumbnailURL string         `json:"thumbnail_url"` // optional, max 500 chars
	Config       map[string]any `json:"config"`        // optional JSON object (default theme + sections)
	IsActive     *bool          `json:"is_active"`     // optional, default true
}

func (r *createTemplateReq) normalize() {
	r.Code = strings.ToLower(strings.TrimSpace(r.Code))
	r.Name = strings.TrimSpace(r.Name)
	r.Description = strings.TrimSpace(r.Description)
	r.ThumbnailURL = strings.TrimSpace(r.ThumbnailURL)
}

func (r createTemplateReq) check() map[string]string {
	errs := map[string]string{}
	if !templateCodeRe.MatchString(r.Code) {
		errs["code"] = "2-50 ký tự, chỉ gồm a-z, 0-9, '_' hoặc '-'"
	}
	if n := utf8.RuneCountInString(r.Name); n == 0 || n > 150 {
		errs["name"] = "bắt buộc, tối đa 150 ký tự"
	}
	if utf8.RuneCountInString(r.ThumbnailURL) > 500 {
		errs["thumbnail_url"] = "tối đa 500 ký tự"
	}
	return errs
}

type updateTemplateReq struct {
	Name         *string        `json:"name"`          // optional, 1-150 chars
	Description  *string        `json:"description"`   // optional ("" clears it)
	ThumbnailURL *string        `json:"thumbnail_url"` // optional, max 500 chars ("" clears it)
	Config       map[string]any `json:"config"`        // optional JSON object, replaces the whole config
	IsActive     *bool          `json:"is_active"`     // optional
}

func (r updateTemplateReq) check() map[string]string {
	errs := map[string]string{}
	if r.Name != nil {
		if n := utf8.RuneCountInString(strings.TrimSpace(*r.Name)); n == 0 || n > 150 {
			errs["name"] = "không được trống, tối đa 150 ký tự"
		}
	}
	if r.ThumbnailURL != nil && utf8.RuneCountInString(strings.TrimSpace(*r.ThumbnailURL)) > 500 {
		errs["thumbnail_url"] = "tối đa 500 ký tự"
	}
	return errs
}

// ---------- Handlers ----------

// ListTemplates returns all templates (small list, no paging).
//
//	GET /api/admin/templates?is_active=true
//	Cookie: token (admin)
//	is_active : optional, "true" | "false"
//	200       : {"items": [template...]}
//	400       : is_active has an invalid value
func (h *Admin) ListTemplates(w http.ResponseWriter, r *http.Request) {
	var active *bool
	if v := r.URL.Query().Get("is_active"); v != "" {
		b, err := strconv.ParseBool(v)
		if err != nil {
			writeError(w, http.StatusBadRequest, "is_active phải là true hoặc false")
			return
		}
		active = &b
	}
	items, err := h.Templates.List(r.Context(), active)
	if err != nil {
		h.failTemplate(w, err, "list templates")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

// CreateTemplate creates a template.
//
//	POST /api/admin/templates
//	Cookie: token (admin)
//	Body  : {"code":"rose2","name":"Hồng 2","description":"...","thumbnail_url":"/x.png","config":{"theme":{},"sections":{}},"is_active":true}
//	        Max 16KB. See createTemplateReq for the rules.
//	201   : template JSON
//	400   : not JSON / unknown field / too large
//	409   : code already exists
//	422   : {"error": "...", "fields": {"code": "..."}}
func (h *Admin) CreateTemplate(w http.ResponseWriter, r *http.Request) {
	var req createTemplateReq
	if err := decodeJSON(w, r, &req, 16<<10); err != nil {
		writeError(w, http.StatusBadRequest, "dữ liệu gửi lên không hợp lệ")
		return
	}
	req.normalize()
	if fields := req.check(); len(fields) > 0 {
		writeFields(w, fields)
		return
	}
	active := true
	if req.IsActive != nil {
		active = *req.IsActive
	}
	t, err := h.Templates.Create(r.Context(), auth.UserFrom(r.Context()), template.NewTemplate{
		Code: req.Code, Name: req.Name, Description: req.Description,
		ThumbnailURL: req.ThumbnailURL, Config: req.Config, IsActive: active,
	})
	if err != nil {
		h.failTemplate(w, err, "create template")
		return
	}
	writeJSON(w, http.StatusCreated, t)
}

// GetTemplate returns one template.
//
//	GET /api/admin/templates/{id}
//	Cookie: token (admin)
//	200   : template JSON
//	404   : not found
func (h *Admin) GetTemplate(w http.ResponseWriter, r *http.Request) {
	t, err := h.Templates.Get(r.Context(), r.PathValue("id"))
	if err != nil {
		h.failTemplate(w, err, "get template")
		return
	}
	writeJSON(w, http.StatusOK, t)
}

// UpdateTemplate changes only the fields present in the body ("code" cannot be changed).
//
//	PATCH /api/admin/templates/{id}
//	Cookie: token (admin)
//	Body  : any of {"name","description","thumbnail_url","config","is_active"}. Max 16KB.
//	        "config" replaces the whole config object when present.
//	200   : updated template JSON
//	400   : bad body (including an unknown field such as "code")
//	404   : not found
//	422   : {"error": "...", "fields": {...}}
func (h *Admin) UpdateTemplate(w http.ResponseWriter, r *http.Request) {
	var req updateTemplateReq
	if err := decodeJSON(w, r, &req, 16<<10); err != nil {
		writeError(w, http.StatusBadRequest, "dữ liệu gửi lên không hợp lệ")
		return
	}
	if fields := req.check(); len(fields) > 0 {
		writeFields(w, fields)
		return
	}
	p := template.Patch{Config: req.Config, IsActive: req.IsActive}
	if req.Name != nil {
		v := strings.TrimSpace(*req.Name)
		p.Name = &v
	}
	if req.Description != nil {
		v := strings.TrimSpace(*req.Description)
		p.Description = &v
	}
	if req.ThumbnailURL != nil {
		v := strings.TrimSpace(*req.ThumbnailURL)
		p.ThumbnailURL = &v
	}
	t, err := h.Templates.Update(r.Context(), r.PathValue("id"), p)
	if err != nil {
		h.failTemplate(w, err, "update template")
		return
	}
	writeJSON(w, http.StatusOK, t)
}

// DeleteTemplate removes a template that no invitation uses.
//
//	DELETE /api/admin/templates/{id}
//	Cookie: token (admin)
//	204   : success, no body
//	404   : not found
//	409   : still used by invitations (set is_active=false instead)
func (h *Admin) DeleteTemplate(w http.ResponseWriter, r *http.Request) {
	if err := h.Templates.Delete(r.Context(), r.PathValue("id")); err != nil {
		h.failTemplate(w, err, "delete template")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Admin) failTemplate(w http.ResponseWriter, err error, op string) {
	switch {
	case errors.Is(err, template.ErrNotFound):
		writeError(w, http.StatusNotFound, err.Error())
	case errors.Is(err, template.ErrCodeTaken), errors.Is(err, template.ErrInUse):
		writeError(w, http.StatusConflict, err.Error())
	default:
		log.Printf("%s: %v", op, err)
		writeError(w, http.StatusInternalServerError, "lỗi hệ thống")
	}
}