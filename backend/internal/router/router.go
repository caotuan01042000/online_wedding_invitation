package router

import (
	"net/http"
	"time"

	"online-wedding-invitation/internal/auth"
	"online-wedding-invitation/internal/config"
	store "online-wedding-invitation/internal/domain/user"
	"online-wedding-invitation/internal/handler"

)

func New(cfg *config.Config, st *store.Store) http.Handler {
	mux := http.NewServeMux()
	secret := []byte(cfg.JWTSecret)

	a := &handler.Auth{
		Store:  st,
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