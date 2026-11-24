package router

import (
	"net/http"

	"online-wedding-invitation/internal/handler"
)

func registerPublicRoutes(mux *http.ServeMux, h *handler.Public) {
	mux.HandleFunc("GET /api/public/invitations/{slug}", h.Render)
}