package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"online-wedding-invitation/internal/config"
	"online-wedding-invitation/internal/db"
	"online-wedding-invitation/internal/router"
	store "online-wedding-invitation/internal/domain/user"
)

func main() {
	cfg := config.Load()
	if cfg.DatabaseURL == "" {
		log.Fatal("thiếu DATABASE_URL")
	}
	if cfg.AdminPass == "" {
		log.Fatal("thiếu ADMIN_PASSWORD")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	// // 1. migrate trước
	// if err := db.Migrate(ctx, pool); err != nil {
	// 	log.Fatal("migrate: ", err)
	// }

	// 2. rồi mới seed admin
	st := store.New(pool)
	if err := st.EnsureAdmin(ctx, cfg.AdminUser, cfg.AdminEmail, cfg.AdminPass); err != nil {
		log.Fatal("seed admin: ", err)
	}

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: router.New(cfg, st),
	}
	log.Printf("Server đang chạy tại http://localhost:%s", cfg.Port)
	log.Fatal(srv.ListenAndServe())
}