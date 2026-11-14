package router

import (
	"net/http"

	"online-wedding-invitation/internal/auth"
	"online-wedding-invitation/internal/config"
	"online-wedding-invitation/internal/handler"
)

func New(cfg *config.Config, users handler.UserStore) http.Handler {
	secret := []byte(cfg.JWTSecret)
	mux := http.NewServeMux()

	authH := &handler.Auth{Store: users, Secret: secret, Secure: cfg.CookieSecure, TTL: cfg.TokenTTL}

	registerSystemRoutes(mux)
	registerAuthRoutes(mux, authH, secret)
	// Sau này: registerInvitationRoutes(mux, ...), registerRSVPRoutes(mux, ...)

	mux.Handle("GET /", http.FileServer(http.Dir("web/static")))

	return chain(mux, recoverer, logger) // ngoài cùng là recoverer
}

func registerSystemRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/hello", handler.Hello)
}

func registerAuthRoutes(mux *http.ServeMux, a *handler.Auth, secret []byte) {
	mux.HandleFunc("POST /api/auth/register", a.Register)
	mux.HandleFunc("POST /api/auth/login", a.Login)
	mux.HandleFunc("POST /api/auth/logout", a.Logout)
	mux.HandleFunc("GET /api/auth/me", auth.Require(secret, a.Me))
	// Route chỉ admin: auth.Require(secret, h, user.RoleAdmin)
}