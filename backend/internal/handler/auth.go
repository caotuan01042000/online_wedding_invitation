package handler

import (
	"context"
	"errors"
	"log"
	"net/http"
	"net/mail"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"golang.org/x/crypto/bcrypt"

	"online-wedding-invitation/internal/auth"
	"online-wedding-invitation/internal/domain/user"
)

// UserStore: handler chỉ phụ thuộc interface này -> dễ mock khi viết test.
type UserStore interface {
	FindByUsername(ctx context.Context, username string) (*user.User, error)
	FindByID(ctx context.Context, id string) (*user.User, error)
	TouchLogin(ctx context.Context, id string)
	Create(ctx context.Context, n user.NewUser) (*user.User, error)
}

type Auth struct {
	Store  UserStore
	Secret []byte
	Secure bool
	TTL    time.Duration
}

// Hash giả để so sánh khi user không tồn tại, tránh lộ "user có tồn tại hay không" qua thời gian phản hồi.
var dummyHash, _ = bcrypt.GenerateFromPassword([]byte("dummy-password"), bcrypt.DefaultCost)

var usernameRe = regexp.MustCompile(`^[a-zA-Z0-9_.]{3,50}$`)

// ---------- Request DTO ----------

type loginReq struct {
	Username string `json:"username"` // bắt buộc
	Password string `json:"password"` // bắt buộc
}

type registerReq struct {
	Username string `json:"username"`  // bắt buộc, 3-50 ký tự: chữ, số, "_" hoặc "."
	Email    string `json:"email"`     // bắt buộc, email hợp lệ, tối đa 255 ký tự (lưu dạng chữ thường)
	Password string `json:"password"`  // bắt buộc, 8-72 byte (giới hạn của bcrypt)
	FullName string `json:"full_name"` // tùy chọn, tối đa 150 ký tự
}

func (r *registerReq) normalize() {
	r.Username = strings.TrimSpace(r.Username)
	r.Email = strings.ToLower(strings.TrimSpace(r.Email))
	r.FullName = strings.TrimSpace(r.FullName)
}

func (r registerReq) validate() map[string]string {
	errs := map[string]string{}
	if !usernameRe.MatchString(r.Username) {
		errs["username"] = "3-50 ký tự, chỉ gồm chữ, số, '_' hoặc '.'"
	}
	if a, err := mail.ParseAddress(r.Email); err != nil || a.Address != r.Email || len(r.Email) > 255 {
		errs["email"] = "email không hợp lệ"
	}
	if n := len(r.Password); n < 8 || n > 72 {
		errs["password"] = "mật khẩu từ 8 đến 72 ký tự"
	}
	if utf8.RuneCountInString(r.FullName) > 150 {
		errs["full_name"] = "tối đa 150 ký tự"
	}
	return errs
}

// ---------- Handlers ----------

// Register đăng ký tài khoản mới (role luôn là "user", client không được chọn role).
//
//	POST /api/auth/register
//	Content-Type: application/json
//	Body  : {"username":"tuan_01","email":"a@b.com","password":"12345678","full_name":"Minh Tuấn"}
//	201   : user JSON + Set-Cookie token (đăng nhập luôn sau khi đăng ký)
//	400   : body không phải JSON / có field lạ / quá lớn (>2KB)
//	409   : username hoặc email đã tồn tại
//	422   : dữ liệu không hợp lệ -> {"error": "...", "fields": {"email": "..."}}
func (h *Auth) Register(w http.ResponseWriter, r *http.Request) {
	var req registerReq
	if err := decodeJSON(w, r, &req, 2<<10); err != nil {
		writeError(w, http.StatusBadRequest, "dữ liệu gửi lên không hợp lệ")
		return
	}
	req.normalize()
	if fields := req.validate(); len(fields) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"error": "dữ liệu không hợp lệ", "fields": fields})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("register: bcrypt: %v", err)
		writeError(w, http.StatusInternalServerError, "lỗi hệ thống")
		return
	}

	u, err := h.Store.Create(r.Context(), user.NewUser{
		Role:         user.RoleUser,
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: string(hash),
		FullName:     req.FullName,
	})
	switch {
	case errors.Is(err, user.ErrUsernameTaken), errors.Is(err, user.ErrEmailTaken):
		writeError(w, http.StatusConflict, err.Error())
		return
	case err != nil:
		log.Printf("register: create: %v", err)
		writeError(w, http.StatusInternalServerError, "lỗi hệ thống")
		return
	}

	if err := h.startSession(w, u); err != nil {
		log.Printf("register: session: %v", err)
		writeError(w, http.StatusInternalServerError, "lỗi hệ thống")
		return
	}
	writeJSON(w, http.StatusCreated, u)
}

// Login đăng nhập bằng tài khoản + mật khẩu.
//
//	POST /api/auth/login
//	Content-Type: application/json
//	Body  : {"username":"admin","password":"..."}   (tối đa 1KB)
//	200   : user JSON + Set-Cookie token (HttpOnly)
//	400   : body không hợp lệ
//	401   : sai tài khoản/mật khẩu hoặc tài khoản bị khóa
func (h *Auth) Login(w http.ResponseWriter, r *http.Request) {
	var req loginReq
	if err := decodeJSON(w, r, &req, 1<<10); err != nil {
		writeError(w, http.StatusBadRequest, "dữ liệu gửi lên không hợp lệ")
		return
	}

	u, err := h.Store.FindByUsername(r.Context(), strings.TrimSpace(req.Username))
	if err != nil && !errors.Is(err, user.ErrNotFound) {
		log.Printf("login: find: %v", err)
		writeError(w, http.StatusInternalServerError, "lỗi hệ thống")
		return
	}

	hash := dummyHash
	if u != nil {
		hash = []byte(u.PasswordHash)
	}
	okPass := bcrypt.CompareHashAndPassword(hash, []byte(req.Password)) == nil
	if u == nil || !okPass || !u.IsActive {
		time.Sleep(500 * time.Millisecond) // TODO: thay bằng rate limit theo IP
		writeError(w, http.StatusUnauthorized, "sai tài khoản hoặc mật khẩu")
		return
	}

	if err := h.startSession(w, u); err != nil {
		log.Printf("login: session: %v", err)
		writeError(w, http.StatusInternalServerError, "lỗi hệ thống")
		return
	}
	h.Store.TouchLogin(r.Context(), u.ID)
	writeJSON(w, http.StatusOK, u)
}

// Logout xóa cookie đăng nhập.
//
//	POST /api/auth/logout
//	Input : không có body
//	200   : {"message": "đã đăng xuất"}
func (h *Auth) Logout(w http.ResponseWriter, r *http.Request) {
	h.setCookie(w, "", -1)
	writeJSON(w, http.StatusOK, map[string]string{"message": "đã đăng xuất"})
}

// Me trả thông tin user hiện tại (đọc lại từ DB nên user bị khóa/xóa sẽ mất phiên ngay).
//
//	GET /api/auth/me
//	Cookie: token (bắt buộc, do middleware auth.Require kiểm tra)
//	200   : user JSON
//	401   : chưa đăng nhập / token hết hạn / user bị khóa
func (h *Auth) Me(w http.ResponseWriter, r *http.Request) {
	c := auth.ClaimsFrom(r.Context())
	u, err := h.Store.FindByID(r.Context(), c.Sub)
	if err != nil || !u.IsActive {
		writeError(w, http.StatusUnauthorized, "chưa đăng nhập")
		return
	}
	writeJSON(w, http.StatusOK, u)
}

// ---------- helpers ----------

func (h *Auth) startSession(w http.ResponseWriter, u *user.User) error {
	token, err := auth.Sign(h.Secret, u.ID, u.Role, h.TTL)
	if err != nil {
		return err
	}
	h.setCookie(w, token, int(h.TTL.Seconds()))
	return nil
}

func (h *Auth) setCookie(w http.ResponseWriter, value string, maxAge int) {
	http.SetCookie(w, &http.Cookie{
		Name: auth.CookieName, Value: value, Path: "/", MaxAge: maxAge,
		HttpOnly: true, Secure: h.Secure, SameSite: http.SameSiteLaxMode,
	})
}