package handler

import (
	"net/http"
	"strconv"
)

const (
	defaultPageSize = 20
	maxPageSize     = 100
	maxPage         = 1_000_000
)

type paging struct{ Page, Size int }

func (p paging) Offset() int { return (p.Page - 1) * p.Size }

// readPaging reads ?page=1&page_size=20 (page_size capped at 100).
func readPaging(r *http.Request) paging {
	p := paging{Page: 1, Size: defaultPageSize}
	q := r.URL.Query()
	if n, err := strconv.Atoi(q.Get("page")); err == nil && n > 0 {
		p.Page = min(n, maxPage)
	}
	if n, err := strconv.Atoi(q.Get("page_size")); err == nil && n > 0 {
		p.Size = min(n, maxPageSize)
	}
	return p
}

type pageBody[T any] struct {
	Items    []T `json:"items"`
	Page     int `json:"page"`
	PageSize int `json:"page_size"`
	Total    int `json:"total"`
}

func writePage[T any](w http.ResponseWriter, items []T, p paging, total int) {
	if items == nil {
		items = []T{}
	}
	writeJSON(w, http.StatusOK, pageBody[T]{Items: items, Page: p.Page, PageSize: p.Size, Total: total})
}