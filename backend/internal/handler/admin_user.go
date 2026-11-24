package handler

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"
	"unicode/utf8"

	"golang.org/x/crypto/bcrypt"

	"online-wedding-invitation/internal/auth"
	"online-wedding-invitation/internal/domain/user"
)

// ---------- Request DTOs ----------

type createUserReq struct {
	registerReq        // username (required), email (required), password (required), full_name (optional)
	Phone       string `json:"phone"` // optional, max 20 chars
	Role        string `json:"role"`  // optional: "admin" | "user" (default "user")
}

func (r *createUserReq) normalizeAll() {
	r.registerReq.normalize()
	r.Phone = strings.TrimSpace(r.Phone)
	r.Role = strings.TrimSpace(r.Role)
	if r.Role == "" {
		r.Role = user.RoleUser
	}
}

func (r createUserReq) check() map[string]string {
	errs := r.registerReq.validate()
	if utf8.RuneCountInString(r.Phone) > 20 {
		errs["phone"] = "tối đa 20 ký tự"
	}
	if r.Role != user.RoleAdmin && r.Role != user.RoleUser {
		errs["role"] = "role phải là admin hoặc user"
	}
	return errs
}

type updateUserReq struct {
	FullName *string `json:"full_name"` // optional, max 150 chars ("" clears it)
	Phone    *string `json:"phone"`     // optional, max 20 chars ("" clears it)
	Role     *string `json:"role"`      // optional: "admin" | "user"
	IsActive *bool   `json:"is_active"` // optional: false = locked
}

func (r updateUserReq) check() map[string]string {
	errs := map[string]string{}
	if r.FullName != nil && utf8.RuneCountInString(strings.TrimSpace(*r.FullName)) > 150 {
		errs["full_name"] = "tối đa 150 ký tự"
	}
	if r.Phone != nil && utf8.RuneCountInString(strings.TrimSpace(*r.Phone)) > 20 {
		errs["phone"] = "tối đa 20 ký tự"
	}
	if r.Role != nil && *r.Role != user.RoleAdmin && *r.Role != user.RoleUser {
		errs["role"] = "role phải là admin hoặc user"
	}
	return errs
}

type resetPasswordReq struct {
	Password string `json:"password"` // required, 8-72 bytes (bcrypt limit)
}

// ---------- Handlers ----------

// ListUsers returns a page of users.
//
//	GET /api/admin/users?q=&role=&is_active=&page=1&page_size=20
//	Cookie: token (admin)
//	q          : optional, matches username / email / full name
//	role       : optional, "admin" | "user"
//	is_active  : optional, "true" | "false"
//	page_size  : optional, default 20, max 100
//	200        : {"items": [user...], "page": 1, "page_size": 20, "total": 135}
//	400        : role or is_active has an invalid value
//	401/403    : not logged in / not an admin
func (h *Admin) ListUsers(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	f := user.ListFilter{Q: strings.TrimSpace(q.Get("q")), Role: q.Get("role")}
	if f.Role != "" && f.Role != user.RoleAdmin && f.Role != user.RoleUser {
		writeError(w, http.StatusBadRequest, "role không hợp lệ")
		return
	}
	if v := q.Get("is_active"); v != "" {
		b, err := strconv.ParseBool(v)
		if err != nil {
			writeError(w, http.StatusBadRequest, "is_active phải là true hoặc false")
			return
		}
		f.IsActive = &b
	}
	p := readPaging(r)
	f.Limit, f.Offset = p.Size, p.Offset()

	items, total, err := h.Users.List(r.Context(), f)
	if err != nil {
		h.failUser(w, err, "list users")
		return
	}
	writePage(w, items, p, total)
}

// CreateUser creates a user (the admin may choose the role).
//
//	POST /api/admin/users
//	Cookie: token (admin)
//	Body  : {"username":"khach01","email":"a@b.com","password":"12345678","full_name":"Nguyễn A","phone":"0901234567","role":"user"}
//	        username 3-50 chars [a-zA-Z0-9_.]; email valid; password 8-72 bytes;
//	        full_name <= 150; phone <= 20; role "admin"|"user" (default "user"). Max body 4KB.
//	201   : user JSON
//	400   : not JSON / unknown field / too large
//	409   : username or email already exists
//	422   : {"error": "...", "fields": {"email": "..."}}
func (h *Admin) CreateUser(w http.ResponseWriter, r *http.Request) {
	var req createUserReq
	if err := decodeJSON(w, r, &req, 4<<10); err != nil {
		writeError(w, http.StatusBadRequest, "dữ liệu gửi lên không hợp lệ")
		return
	}
	req.normalizeAll()
	if fields := req.check(); len(fields) > 0 {
		writeFields(w, fields)
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		h.failUser(w, err, "create user: bcrypt")
		return
	}
	u, err := h.Users.Create(r.Context(), user.NewUser{
		Role: req.Role, Username: req.Username, Email: req.Email,
		PasswordHash: string(hash), FullName: req.FullName, Phone: req.Phone,
	})
	if err != nil {
		h.failUser(w, err, "create user")
		return
	}
	writeJSON(w, http.StatusCreated, u)
}

// GetUser returns one user.
//
//	GET /api/admin/users/{id}
//	Cookie: token (admin)
//	200   : user JSON
//	404   : not found (also when {id} is not a valid UUID)
func (h *Admin) GetUser(w http.ResponseWriter, r *http.Request) {
	u, err := h.Users.FindByID(r.Context(), r.PathValue("id"))
	if err != nil {
		h.failUser(w, err, "get user")
		return
	}
	writeJSON(w, http.StatusOK, u)
}

// UpdateUser changes only the fields present in the body.
//
//	PATCH /api/admin/users/{id}
//	Cookie: token (admin)
//	Body  : any of {"full_name": "...", "phone": "...", "role": "admin|user", "is_active": true|false}. Max 2KB.
//	200   : updated user JSON
//	400   : bad body, or an admin tries to lock / demote themselves
//	404   : not found
//	422   : {"error": "...", "fields": {...}}
func (h *Admin) UpdateUser(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var req updateUserReq
	if err := decodeJSON(w, r, &req, 2<<10); err != nil {
		writeError(w, http.StatusBadRequest, "dữ liệu gửi lên không hợp lệ")
		return
	}
	if fields := req.check(); len(fields) > 0 {
		writeFields(w, fields)
		return
	}
	if isSelf(r, id) && ((req.IsActive != nil && !*req.IsActive) || (req.Role != nil && *req.Role != user.RoleAdmin)) {
		writeError(w, http.StatusBadRequest, "không thể tự khóa hoặc tự hạ quyền chính mình")
		return
	}

	p := user.Patch{Role: req.Role, IsActive: req.IsActive}
	if req.FullName != nil {
		v := strings.TrimSpace(*req.FullName)
		p.FullName = &v
	}
	if req.Phone != nil {
		v := strings.TrimSpace(*req.Phone)
		p.Phone = &v
	}
	u, err := h.Users.Update(r.Context(), id, p)
	if err != nil {
		h.failUser(w, err, "update user")
		return
	}
	writeJSON(w, http.StatusOK, u)
}

// ResetPassword sets a new password for a user.
//
//	POST /api/admin/users/{id}/reset-password
//	Cookie: token (admin)
//	Body  : {"password": "new-password"}  (8-72 bytes, max 1KB)
//	204   : success, no body
//	404   : not found
//	422   : {"error": "...", "fields": {"password": "..."}}
func (h *Admin) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req resetPasswordReq
	if err := decodeJSON(w, r, &req, 1<<10); err != nil {
		writeError(w, http.StatusBadRequest, "dữ liệu gửi lên không hợp lệ")
		return
	}
	if n := len(req.Password); n < 8 || n > 72 {
		writeFields(w, map[string]string{"password": "mật khẩu từ 8 đến 72 ký tự"})
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		h.failUser(w, err, "reset password: bcrypt")
		return
	}
	if err := h.Users.SetPassword(r.Context(), r.PathValue("id"), string(hash)); err != nil {
		h.failUser(w, err, "reset password")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// DeleteUser soft-deletes a user (sets deleted_at, the account can no longer log in).
//
//	DELETE /api/admin/users/{id}
//	Cookie: token (admin)
//	204   : success, no body
//	400   : an admin tries to delete themselves
//	404   : not found
func (h *Admin) DeleteUser(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if isSelf(r, id) {
		writeError(w, http.StatusBadRequest, "không thể tự xóa chính mình")
		return
	}
	if err := h.Users.SoftDelete(r.Context(), id); err != nil {
		h.failUser(w, err, "delete user")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ---------- helpers ----------

func isSelf(r *http.Request, id string) bool {
	return strings.EqualFold(auth.UserFrom(r.Context()), id)
}

func (h *Admin) failUser(w http.ResponseWriter, err error, op string) {
	switch {
	case errors.Is(err, user.ErrNotFound):
		writeError(w, http.StatusNotFound, "không tìm thấy người dùng")
	case errors.Is(err, user.ErrUsernameTaken), errors.Is(err, user.ErrEmailTaken):
		writeError(w, http.StatusConflict, err.Error())
	case errors.Is(err, user.ErrRoleNotFound):
		writeError(w, http.StatusUnprocessableEntity, err.Error())
	default:
		log.Printf("%s: %v", op, err)
		writeError(w, http.StatusInternalServerError, "lỗi hệ thống")
	}
}