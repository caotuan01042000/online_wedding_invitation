package auth

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"
)

const CookieName = "token"

type Claims struct {
	Sub string `json:"sub"`
	Exp int64  `json:"exp"`
}

var header = base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"HS256","typ":"JWT"}`))

func mac(secret []byte, msg string) string {
	m := hmac.New(sha256.New, secret)
	m.Write([]byte(msg))
	return base64.RawURLEncoding.EncodeToString(m.Sum(nil))
}

func Sign(secret []byte, sub string, ttl time.Duration) (string, error) {
	p, err := json.Marshal(Claims{Sub: sub, Exp: time.Now().Add(ttl).Unix()})
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

// Require: middleware bảo vệ route, yêu cầu cookie token hợp lệ.
func Require(secret []byte, next http.HandlerFunc) http.HandlerFunc {
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
		next(w, r.WithContext(context.WithValue(r.Context(), ctxKey{}, claims.Sub)))
	}
}

func UserFrom(ctx context.Context) string {
	s, _ := ctx.Value(ctxKey{}).(string)
	return s
}

func unauthorized(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusUnauthorized)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": "chưa đăng nhập"})
}