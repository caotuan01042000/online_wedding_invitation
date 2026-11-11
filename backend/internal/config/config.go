package config

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"os"
)

type Config struct {
	Port         string
	AdminUser    string
	AdminPass    string
	JWTSecret    string
	CookieSecure bool
}

func Load() *Config {
	c := &Config{
		Port:         get("PORT", "8080"),
		AdminUser:    get("ADMIN_USER", "admin"),
		AdminPass:    os.Getenv("ADMIN_PASSWORD"),
		JWTSecret:    os.Getenv("JWT_SECRET"),
		CookieSecure: os.Getenv("COOKIE_SECURE") == "true",
	}
	if c.JWTSecret == "" {
		b := make([]byte, 32)
		_, _ = rand.Read(b)
		c.JWTSecret = hex.EncodeToString(b)
		log.Println("CẢNH BÁO: chưa có JWT_SECRET, dùng secret ngẫu nhiên (restart là mất phiên đăng nhập)")
	}
	return c
}

func get(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}