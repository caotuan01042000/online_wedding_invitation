package storage

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// R2 talks to Cloudflare R2 through its S3-compatible API (AWS Signature V4, stdlib only).
type R2 struct {
	host      string
	bucket    string
	accessKey string
	secretKey string
	publicURL string
	client    *http.Client
}

func NewR2(accountID, accessKey, secretKey, bucket, publicURL string) *R2 {
	return &R2{
		host:      accountID + ".r2.cloudflarestorage.com",
		bucket:    bucket,
		accessKey: accessKey,
		secretKey: secretKey,
		publicURL: strings.TrimRight(publicURL, "/"),
		client:    &http.Client{Timeout: 60 * time.Second},
	}
}

func (r *R2) Save(ctx context.Context, key, contentType string, data []byte) error {
	return r.do(ctx, http.MethodPut, key, contentType, data)
}

func (r *R2) Delete(ctx context.Context, key string) error {
	return r.do(ctx, http.MethodDelete, key, "", nil)
}

func (r *R2) URL(key string) string { return r.publicURL + "/" + key }

func (r *R2) do(ctx context.Context, method, key, contentType string, body []byte) error {
	path := "/" + r.bucket + "/" + key
	req, err := http.NewRequestWithContext(ctx, method, "https://"+r.host+path, bytes.NewReader(body))
	if err != nil {
		return err
	}

	now := time.Now().UTC()
	amzDate := now.Format("20060102T150405Z")
	day := now.Format("20060102")
	payloadHash := hexSHA256(body)

	req.Header.Set("x-amz-date", amzDate)
	req.Header.Set("x-amz-content-sha256", payloadHash)
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
		req.Header.Set("Cache-Control", "public, max-age=31536000, immutable")
	}

	signedHeaders := "host;x-amz-content-sha256;x-amz-date"
	canonicalHeaders := "host:" + r.host + "\n" +
		"x-amz-content-sha256:" + payloadHash + "\n" +
		"x-amz-date:" + amzDate + "\n"
	canonicalRequest := strings.Join([]string{method, path, "", canonicalHeaders, signedHeaders, payloadHash}, "\n")

	scope := day + "/auto/s3/aws4_request"
	stringToSign := "AWS4-HMAC-SHA256\n" + amzDate + "\n" + scope + "\n" + hexSHA256([]byte(canonicalRequest))

	k := hmacSHA256([]byte("AWS4"+r.secretKey), day)
	k = hmacSHA256(k, "auto")
	k = hmacSHA256(k, "s3")
	k = hmacSHA256(k, "aws4_request")
	signature := hex.EncodeToString(hmacSHA256(k, stringToSign))

	req.Header.Set("Authorization", fmt.Sprintf(
		"AWS4-HMAC-SHA256 Credential=%s/%s, SignedHeaders=%s, Signature=%s",
		r.accessKey, scope, signedHeaders, signature))

	resp, err := r.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode/100 != 2 {
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return fmt.Errorf("r2 %s %s: %s: %s", method, key, resp.Status, strings.TrimSpace(string(msg)))
	}
	return nil
}

func hexSHA256(b []byte) string {
	h := sha256.Sum256(b)
	return hex.EncodeToString(h[:])
}

func hmacSHA256(key []byte, msg string) []byte {
	m := hmac.New(sha256.New, key)
	m.Write([]byte(msg))
	return m.Sum(nil)
}