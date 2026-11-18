package router

import (
	"net/http"

	"online-wedding-invitation/internal/auth"
	"online-wedding-invitation/internal/config"
	"online-wedding-invitation/internal/domain/template"
	"online-wedding-invitation/internal/domain/user"
	"online-wedding-invitation/internal/handler"
	"online-wedding-invitation/internal/domain/invitation"
)

func New(cfg *config.Config, users *user.Store, templates *template.Store, invitations *invitation.Store) http.Handler {
	secret := []byte(cfg.JWTSecret)
	mux := http.NewServeMux()

	authH := &handler.Auth{Store: users, Secret: secret, Secure: cfg.CookieSecure, TTL: cfg.TokenTTL}
	adminH := &handler.Admin{Users: users, Templates: templates, Invitations: invitations}
	

	registerSystemRoutes(mux)
	registerAuthRoutes(mux, authH, secret)
	registerAdminRoutes(mux, secret, users, adminH)
	// Phase 2: registerPublicRoutes(mux, ...)

	mux.Handle("GET /", http.FileServer(http.Dir("web/static")))

	return chain(mux, recoverer, logger) // recoverer is the outermost
}

func registerSystemRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/hello", handler.Hello)
}

func registerAuthRoutes(mux *http.ServeMux, a *handler.Auth, secret []byte) {
	mux.HandleFunc("POST /api/auth/register", a.Register)
	mux.HandleFunc("POST /api/auth/login", a.Login)
	mux.HandleFunc("POST /api/auth/logout", a.Logout)
	mux.HandleFunc("GET /api/auth/me", auth.Require(secret, a.Me))
}