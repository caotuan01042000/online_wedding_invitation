package main

import (
	"log"
	"net/http"

	"github.com/yourname/online-wedding-invitation/internal/config"
	"github.com/yourname/online-wedding-invitation/internal/router"
)

func main() {
	cfg := config.Load()

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: router.New(),
	}

	log.Printf("Server đang chạy tại http://localhost:%s", cfg.Port)
	if err := srv.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
