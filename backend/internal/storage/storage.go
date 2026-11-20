package storage

import "context"

type Storage interface {
	Save(ctx context.Context, key, contentType string, data []byte) error
	Delete(ctx context.Context, key string) error
	URL(key string) string
}