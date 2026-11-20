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
	R2AccountID string
	R2AccessKey string
	R2SecretKey string
	R2Bucket    string
	R2PublicURL string
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

		R2AccountID: os.Getenv("R2_ACCOUNT_ID"),
		R2AccessKey: os.Getenv("R2_ACCESS_KEY_ID"),
		R2SecretKey: os.Getenv("R2_SECRET_ACCESS_KEY"),
		R2Bucket:    os.Getenv("R2_BUCKET"),
		R2PublicURL: os.Getenv("R2_PUBLIC_URL"),
	}
	if c.JWTSecret == "" {
		b := make([]byte, 32)
		_, _ = rand.Read(b)
		c.JWTSecret = hex.EncodeToString(b)
		log.Println("CẢNH BÁO: chưa có JWT_SECRET, dùng secret ngẫu nhiên (restart là mất phiên đăng nhập)")
	}
	return c
}

func (c *Config) R2Enabled() bool {
	return c.R2AccountID != "" && c.R2AccessKey != "" && c.R2SecretKey != "" && c.R2Bucket != "" && c.R2PublicURL != ""
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