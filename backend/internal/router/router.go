package router

import (
	"net/http"

	"github.com/yourname/online-wedding-invitation/internal/handler"
)

func New() http.Handler {
	mux := http.NewServeMux()

	// API
	mux.HandleFunc("GET /api/hello", handler.Hello)

	// Static (trang thiệp cưới)
	mux.Handle("GET /", http.FileServer(http.Dir("web/static")))

	return mux
}
