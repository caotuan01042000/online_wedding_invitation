package router

import (
	"net/http"
	"time"

	"github.com/yourname/online-wedding-invitation/internal/auth"
	"github.com/yourname/online-wedding-invitation/internal/config"
	"github.com/yourname/online-wedding-invitation/internal/handler"
)

func New(cfg *config.Config) http.Handler {
	mux := http.NewServeMux()
	secret := []byte(cfg.JWTSecret)

	a := &handler.Auth{
		User:   cfg.AdminUser,
		Pass:   cfg.AdminPass,
		Secret: secret,
		Secure: cfg.CookieSecure,
		TTL:    24 * time.Hour,
	}

	// API
	mux.HandleFunc("GET /api/hello", handler.Hello)
	mux.HandleFunc("POST /api/auth/login", a.Login)
	mux.HandleFunc("POST /api/auth/logout", a.Logout)
	mux.HandleFunc("GET /api/auth/me", auth.Require(secret, a.Me))

	// Static
	mux.Handle("GET /", http.FileServer(http.Dir("web/static")))

	return mux
}