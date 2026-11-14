package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"online-wedding-invitation/internal/config"
	"online-wedding-invitation/internal/db"
	"online-wedding-invitation/internal/domain/user"
	"online-wedding-invitation/internal/router"
)

func main() {
	if err := run(config.Load()); err != nil {
		log.Fatal(err)
	}
}

func run(cfg *config.Config) error {
	if err := cfg.Validate(); err != nil {
		return err
	}

	startCtx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	pool, err := db.Connect(startCtx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	users := user.New(pool)
	if err := users.EnsureAdmin(startCtx, cfg.AdminUser, cfg.AdminEmail, cfg.AdminPass); err != nil {
		return err
	}

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router.New(cfg, users),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	sig, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	errCh := make(chan error, 1)
	go func() {
		log.Printf("Server đang chạy tại http://localhost:%s", cfg.Port)
		errCh <- srv.ListenAndServe()
	}()

	select {
	case err := <-errCh:
		if !errors.Is(err, http.ErrServerClosed) {
			return err
		}
		return nil
	case <-sig.Done():
		log.Println("đang tắt server...")
	}

	shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelShutdown()
	return srv.Shutdown(shutdownCtx)
}