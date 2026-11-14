package config

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"log"
	"os"
	"time"
)

type Config struct {
	Port         string
	DatabaseURL  string
	AdminUser    string
	AdminEmail   string
	AdminPass    string
	JWTSecret    string
	CookieSecure bool
	TokenTTL     time.Duration
}

func Load() *Config {
	c := &Config{
		Port:         get("PORT", "8080"),
		DatabaseURL:  os.Getenv("DATABASE_URL"),
		AdminUser:    get("ADMIN_USER", "admin"),
		AdminEmail:   get("ADMIN_EMAIL", "admin@wedding.local"),
		AdminPass:    os.Getenv("ADMIN_PASSWORD"),
		JWTSecret:    os.Getenv("JWT_SECRET"),
		CookieSecure: os.Getenv("COOKIE_SECURE") == "true",
		TokenTTL:     getDuration("TOKEN_TTL", 24*time.Hour),
	}
	if c.JWTSecret == "" {
		b := make([]byte, 32)
		_, _ = rand.Read(b)
		c.JWTSecret = hex.EncodeToString(b)
		log.Println("CẢNH BÁO: chưa có JWT_SECRET, dùng secret ngẫu nhiên (restart là mất phiên đăng nhập)")
	}
	return c
}

func (c *Config) Validate() error {
	if c.DatabaseURL == "" {
		return errors.New("thiếu DATABASE_URL")
	}
	if c.AdminPass == "" {
		return errors.New("thiếu ADMIN_PASSWORD")
	}
	return nil
}

func get(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func getDuration(k string, def time.Duration) time.Duration {
	if v := os.Getenv(k); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
		log.Printf("CẢNH BÁO: %s=%q không hợp lệ, dùng mặc định %s", k, v, def)
	}
	return def
}