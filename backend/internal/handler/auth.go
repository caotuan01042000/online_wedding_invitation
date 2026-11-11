package handler

import (
	"crypto/sha256"
	"crypto/subtle"
	"encoding/json"
	"net/http"
	"time"

	"github.com/yourname/online-wedding-invitation/internal/auth"
)

type Auth struct {
	User, Pass string
	Secret     []byte
	Secure     bool
	TTL        time.Duration
}

type loginReq struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func eq(a, b string) bool {
	ha, hb := sha256.Sum256([]byte(a)), sha256.Sum256([]byte(b))
	return subtle.ConstantTimeCompare(ha[:], hb[:]) == 1
}

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

	okUser, okPass := eq(req.Username, h.User), eq(req.Password, h.Pass)
	if !(okUser && okPass) {
		time.Sleep(500 * time.Millisecond) // làm chậm dò mật khẩu
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "sai tài khoản hoặc mật khẩu"})
		return
	}

	token, err := auth.Sign(h.Secret, h.User, h.TTL)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "lỗi hệ thống"})
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     auth.CookieName,
		Value:    token,
		Path:     "/",
		MaxAge:   int(h.TTL.Seconds()),
		HttpOnly: true,
		Secure:   h.Secure,
		SameSite: http.SameSiteLaxMode,
	})
	writeJSON(w, http.StatusOK, map[string]string{"username": h.User})
}

func (h *Auth) Logout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name: auth.CookieName, Value: "", Path: "/", MaxAge: -1,
		HttpOnly: true, Secure: h.Secure, SameSite: http.SameSiteLaxMode,
	})
	writeJSON(w, http.StatusOK, map[string]string{"message": "đã đăng xuất"})
}

func (h *Auth) Me(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"username": auth.UserFrom(r.Context())})
}