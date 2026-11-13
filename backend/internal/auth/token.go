package auth

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"slices"
	"strings"
	"time"
)

const CookieName = "token"

var header = base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"HS256","typ":"JWT"}`))

func mac(secret []byte, msg string) string {
	m := hmac.New(sha256.New, secret)
	m.Write([]byte(msg))
	return base64.RawURLEncoding.EncodeToString(m.Sum(nil))
}

func Sign(secret []byte, sub, role string, ttl time.Duration) (string, error) {
  	p, err := json.Marshal(Claims{Sub: sub, Role: role, Exp: time.Now().Add(ttl).Unix()})
	if err != nil {
		return "", err
	}
	msg := header + "." + base64.RawURLEncoding.EncodeToString(p)
	return msg + "." + mac(secret, msg), nil
}

func Verify(secret []byte, token string) (*Claims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 || parts[0] != header {
		return nil, errors.New("token không hợp lệ")
	}
	if !hmac.Equal([]byte(mac(secret, parts[0]+"."+parts[1])), []byte(parts[2])) {
		return nil, errors.New("chữ ký sai")
	}
	raw, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, err
	}
	var c Claims
	if err := json.Unmarshal(raw, &c); err != nil {
		return nil, err
	}
	if time.Now().Unix() > c.Exp {
		return nil, errors.New("token hết hạn")
	}
	return &c, nil
}

type ctxKey struct{}

// Require: bắt buộc cookie hợp lệ. Truyền role để giới hạn theo vai trò (bỏ trống = mọi role).
func Require(secret []byte, next http.HandlerFunc, roles ...string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ck, err := r.Cookie(CookieName)
		if err != nil {
			unauthorized(w)
			return
		}
		claims, err := Verify(secret, ck.Value)
		if err != nil {
			unauthorized(w)
			return
		}
		if len(roles) > 0 && !slices.Contains(roles, claims.Role) {
			w.Header().Set("Content-Type", "application/json; charset=utf-8")
			w.WriteHeader(http.StatusForbidden)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "không đủ quyền"})
			return
		}
		next(w, r.WithContext(context.WithValue(r.Context(), ctxKey{}, claims)))
	}
}

func ClaimsFrom(ctx context.Context) *Claims {
	c, _ := ctx.Value(ctxKey{}).(*Claims)
	return c
}

func UserFrom(ctx context.Context) string {
	if c := ClaimsFrom(ctx); c != nil {
		return c.Sub
	}
	return ""
}

func unauthorized(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusUnauthorized)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": "chưa đăng nhập"})
}

type Claims struct {
	Sub  string `json:"sub"`
	Role string `json:"role"`
	Exp  int64  `json:"exp"`
}