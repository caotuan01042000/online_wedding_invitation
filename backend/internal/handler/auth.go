package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

	"online-wedding-invitation/internal/auth"
	"online-wedding-invitation/internal/domain/user"
)

type Auth struct {
	Store  *store.Store
	Secret []byte
	Secure bool
	TTL    time.Duration
}

type loginReq struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// Hash giả để so sánh khi user không tồn tại, tránh lộ "user có tồn tại hay không" qua thời gian phản hồi.
var dummyHash, _ = bcrypt.GenerateFromPassword([]byte("dummy-password"), bcrypt.DefaultCost)

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func (h *Auth) Login(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<10)
	var req loginReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "dữ liệu không hợp lệ"})
		return
	}

	u, err := h.Store.FindByUsername(r.Context(), strings.TrimSpace(req.Username))
	if err != nil && !errors.Is(err, store.ErrNotFound) {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "lỗi hệ thống"})
		return
	}

	hash := dummyHash
	if u != nil {
		hash = []byte(u.PasswordHash)
	}
	okPass := bcrypt.CompareHashAndPassword(hash, []byte(req.Password)) == nil
	if u == nil || !okPass || !u.IsActive {
		time.Sleep(500 * time.Millisecond)
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "sai tài khoản hoặc mật khẩu"})
		return
	}

	token, err := auth.Sign(h.Secret, u.ID, u.Role, h.TTL)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "lỗi hệ thống"})
		return
	}
	h.Store.TouchLogin(r.Context(), u.ID)
	http.SetCookie(w, &http.Cookie{
		Name:     auth.CookieName,
		Value:    token,
		Path:     "/",
		MaxAge:   int(h.TTL.Seconds()),
		HttpOnly: true,
		Secure:   h.Secure,
		SameSite: http.SameSiteLaxMode,
	})
	writeJSON(w, http.StatusOK, u)
}

func (h *Auth) Logout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name: auth.CookieName, Value: "", Path: "/", MaxAge: -1,
		HttpOnly: true, Secure: h.Secure, SameSite: http.SameSiteLaxMode,
	})
	writeJSON(w, http.StatusOK, map[string]string{"message": "đã đăng xuất"})
}

// Me đọc lại từ DB nên user bị khóa/xóa sẽ mất phiên ngay.
func (h *Auth) Me(w http.ResponseWriter, r *http.Request) {
	c := auth.ClaimsFrom(r.Context())
	u, err := h.Store.FindByID(r.Context(), c.Sub)
	if err != nil || !u.IsActive {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "chưa đăng nhập"})
		return
	}
	writeJSON(w, http.StatusOK, u)
}