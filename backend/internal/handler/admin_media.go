package handler

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"

	"online-wedding-invitation/internal/domain/media"
)

var uuidRe = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)

// Largest allowed file (music) plus room for the multipart envelope.
const maxUploadBody = 10<<20 + 1<<20

// ListMedia returns the uploaded files of an invitation.
//
//	GET /api/admin/invitations/{id}/media?kind=
//	Cookie: token (admin)
//	kind  : optional: cover | hero | groom | bride | photo | background | qr | music
//	200   : {"items": [{"id","kind","url","mime_type","size_bytes","sort_order","created_at"}...]}
//	404   : invitation not found
func (h *Admin) ListMedia(w http.ResponseWriter, r *http.Request) {
	kind := r.URL.Query().Get("kind")
	if _, ok := media.Kinds[kind]; kind != "" && !ok {
		writeError(w, http.StatusBadRequest, "kind không hợp lệ")
		return
	}
	items, err := h.Media.List(r.Context(), r.PathValue("id"), kind)
	if err != nil {
		h.failMedia(w, err, "list media")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

// UploadMedia uploads one file to Cloudflare R2 and records its link.
// Single-slot kinds (cover, hero, groom, bride, background, music) replace the previous file.
// Multi kinds: photo (max 30), qr (max 6).
//
//	POST /api/admin/invitations/{id}/media
//	Cookie: token (admin)
//	Content-Type: multipart/form-data with fields "kind" and "file"
//	Limits: images jpeg/png/webp up to 5MB; music mp3 up to 10MB. The type is detected from the file bytes.
//	201   : media JSON (id, kind, url, ...)
//	404   : invitation not found
//	413   : request too large
//	422   : {"error": "...", "fields": {"kind"|"file": "..."}}
//	502   : R2 refused the upload
//	503   : R2 is not configured on the server
func (h *Admin) UploadMedia(w http.ResponseWriter, r *http.Request) {
	if h.Storage == nil {
		writeError(w, http.StatusServiceUnavailable, "chưa cấu hình Cloudflare R2 (biến R2_*)")
		return
	}
	invID := strings.ToLower(r.PathValue("id"))
	if !uuidRe.MatchString(invID) {
		writeError(w, http.StatusNotFound, "không tìm thấy thiệp")
		return
	}

	// The server-wide timeouts (10s read, 15s write) are too short for a 10MB upload on a mobile network.
	rc := http.NewResponseController(w)
	_ = rc.SetReadDeadline(time.Now().Add(2 * time.Minute))
	_ = rc.SetWriteDeadline(time.Now().Add(2 * time.Minute))

	r.Body = http.MaxBytesReader(w, r.Body, maxUploadBody)
	if err := r.ParseMultipartForm(1 << 20); err != nil {
		var tooBig *http.MaxBytesError
		if errors.As(err, &tooBig) {
			writeError(w, http.StatusRequestEntityTooLarge, "file quá lớn")
			return
		}
		writeError(w, http.StatusBadRequest, "dữ liệu gửi lên không hợp lệ")
		return
	}

	kind := r.FormValue("kind")
	spec, ok := media.Kinds[kind]
	if !ok {
		writeFields(w, map[string]string{"kind": "loại file không hợp lệ"})
		return
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		writeFields(w, map[string]string{"file": "bắt buộc"})
		return
	}
	defer file.Close()

	data, err := io.ReadAll(io.LimitReader(file, spec.MaxBytes+1))
	if err != nil {
		writeError(w, http.StatusBadRequest, "không đọc được file")
		return
	}
	if len(data) == 0 {
		writeFields(w, map[string]string{"file": "file rỗng"})
		return
	}
	if int64(len(data)) > spec.MaxBytes {
		writeFields(w, map[string]string{"file": fmt.Sprintf("quá lớn, tối đa %d MB", spec.MaxBytes>>20)})
		return
	}
	// Trust the bytes, not the file name or the client's Content-Type header.
	contentType := http.DetectContentType(data)
	ext, ok := spec.Mimes[contentType]
	if !ok {
		writeFields(w, map[string]string{"file": "định dạng không được hỗ trợ cho loại này"})
		return
	}

	exists, err := h.Media.InvitationExists(r.Context(), invID)
	if err != nil {
		h.failMedia(w, err, "upload media: exists")
		return
	}
	if !exists {
		writeError(w, http.StatusNotFound, "không tìm thấy thiệp")
		return
	}

	key := fmt.Sprintf("invitations/%s/%s/%s%s", invID, kind, randomID(), ext)
	if err := h.Storage.Save(r.Context(), key, contentType, data); err != nil {
		log.Printf("upload media: %v", err)
		writeError(w, http.StatusBadGateway, "không tải được file lên R2")
		return
	}

	m, replaced, err := h.Media.Add(r.Context(), media.NewMedia{
		InvitationID: invID, Kind: kind, StorageKey: key, URL: h.Storage.URL(key),
		MimeType: contentType, SizeBytes: int64(len(data)),
	})
	if err != nil {
		h.dropFiles(key) // do not leave an orphan object in R2
		h.failMedia(w, err, "upload media: add")
		return
	}
	h.dropFiles(replaced...) // old file of a single-slot kind
	writeJSON(w, http.StatusCreated, m)
}

// DeleteMedia removes a file from the DB and from R2.
//
//	DELETE /api/admin/invitations/{id}/media/{mediaId}
//	Cookie: token (admin)
//	204   : success, no body (gift rows that used it as QR lose the link)
//	404   : not found
func (h *Admin) DeleteMedia(w http.ResponseWriter, r *http.Request) {
	key, err := h.Media.Delete(r.Context(), r.PathValue("id"), r.PathValue("mediaId"))
	if err != nil {
		h.failMedia(w, err, "delete media")
		return
	}
	h.dropFiles(key)
	w.WriteHeader(http.StatusNoContent)
}

// ReorderMedia sets the album order.
//
//	PATCH /api/admin/invitations/{id}/media/order
//	Cookie: token (admin)
//	Body  : {"ids": ["<photo id>", ...]}  full list in the wanted order, max 30, max 8KB
//	204   : success, no body
//	404   : an id is not a photo of this invitation
func (h *Admin) ReorderMedia(w http.ResponseWriter, r *http.Request) {
	var req struct {
		IDs []string `json:"ids"`
	}
	if err := decodeJSON(w, r, &req, 8<<10); err != nil {
		writeError(w, http.StatusBadRequest, "dữ liệu gửi lên không hợp lệ")
		return
	}
	if len(req.IDs) > media.Kinds[media.KindPhoto].Max {
		writeFields(w, map[string]string{"ids": "quá nhiều ảnh"})
		return
	}
	if err := h.Media.Reorder(r.Context(), r.PathValue("id"), req.IDs); err != nil {
		h.failMedia(w, err, "reorder media")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func randomID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// dropFiles deletes objects from R2 on a fresh context (the request may already be over). Errors are only logged.
func (h *Admin) dropFiles(keys ...string) {
	if h.Storage == nil || len(keys) == 0 {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	for _, k := range keys {
		if err := h.Storage.Delete(ctx, k); err != nil {
			log.Printf("r2 delete %s: %v", k, err)
		}
	}
}

func (h *Admin) failMedia(w http.ResponseWriter, err error, op string) {
	switch {
	case errors.Is(err, media.ErrNotFound), errors.Is(err, media.ErrInvitationNotFound):
		writeError(w, http.StatusNotFound, err.Error())
	case errors.Is(err, media.ErrTooMany):
		writeFields(w, map[string]string{"file": err.Error()})
	default:
		log.Printf("%s: %v", op, err)
		writeError(w, http.StatusInternalServerError, "lỗi hệ thống")
	}
}