package handler

import "net/http"

// Hello dùng cho healthcheck.
//
//	GET /api/hello
//	Input : không có
//	200   : {"message": "Hello World"}
func Hello(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"message": "Hello World"})
}