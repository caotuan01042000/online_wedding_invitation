package invitation

import (
	"fmt"
	"regexp"
	"strings"
	"unicode/utf8"
)

var (
	slugRe = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)
	timeRe = regexp.MustCompile(`^([01][0-9]|2[0-3]):[0-5][0-9]$`)
)

func runes(s string) int { return utf8.RuneCountInString(s) }

// Normalize trims input and fills defaults in place. Call it before Validate.
func (c *Content) Normalize() {
	c.UserID = strings.TrimSpace(c.UserID)
	c.TemplateID = strings.TrimSpace(c.TemplateID)
	c.Slug = strings.ToLower(strings.TrimSpace(c.Slug))
	c.Title = strings.TrimSpace(c.Title)

	for _, p := range []*Person{&c.Groom, &c.Bride} {
		p.ShortName = strings.TrimSpace(p.ShortName)
		p.FullName = strings.TrimSpace(p.FullName)
		p.Rank = strings.TrimSpace(p.Rank)
		p.Father = strings.TrimSpace(p.Father)
		p.Mother = strings.TrimSpace(p.Mother)
		p.Address = strings.TrimSpace(p.Address)
	}
	e := &c.Event
	e.CeremonyPlace = strings.TrimSpace(e.CeremonyPlace)
	e.VenueName = strings.TrimSpace(e.VenueName)
	e.VenueAddress = strings.TrimSpace(e.VenueAddress)
	e.MapURL = strings.TrimSpace(e.MapURL)
	e.LunarText = strings.TrimSpace(e.LunarText)
	e.DressCode = strings.TrimSpace(e.DressCode)
	e.ClosingMessage = strings.TrimSpace(e.ClosingMessage)
	if e.DressColors == nil {
		e.DressColors = []string{} // the column is NOT NULL
	}
	for i := range c.Schedule {
		c.Schedule[i].Time = strings.TrimSpace(c.Schedule[i].Time)
		c.Schedule[i].Title = strings.TrimSpace(c.Schedule[i].Title)
	}
	for i := range c.Gifts {
		g := &c.Gifts[i]
		g.Bank = strings.TrimSpace(g.Bank)
		g.AccountNo = strings.TrimSpace(g.AccountNo)
		g.AccountName = strings.TrimSpace(g.AccountName)
	}
	if c.Settings == nil {
		c.Settings = map[string]any{}
	}
	if c.Title == "" && c.Groom.ShortName != "" && c.Bride.ShortName != "" {
		c.Title = "Đám cưới " + c.Groom.ShortName + " & " + c.Bride.ShortName
	}
}

// Validate returns field errors keyed by JSON path, e.g. {"groom.short_name": "bắt buộc"}.
func (c Content) Validate() map[string]string {
	errs := map[string]string{}
	max := func(key, val string, n int) {
		if runes(val) > n {
			errs[key] = fmt.Sprintf("tối đa %d ký tự", n)
		}
	}

	if c.TemplateID == "" {
		errs["template_id"] = "bắt buộc"
	}
	if n := len(c.Slug); n < 3 || n > 100 || !slugRe.MatchString(c.Slug) {
		errs["slug"] = "3-100 ký tự, chỉ gồm a-z, 0-9 và dấu '-'"
	}
	max("title", c.Title, 200)

	checkPerson := func(prefix string, p Person) {
		if p.ShortName == "" || runes(p.ShortName) > 50 {
			errs[prefix+".short_name"] = "bắt buộc, tối đa 50 ký tự"
		}
		if p.FullName == "" || runes(p.FullName) > 150 {
			errs[prefix+".full_name"] = "bắt buộc, tối đa 150 ký tự"
		}
		max(prefix+".rank", p.Rank, 50)
		max(prefix+".father", p.Father, 150)
		max(prefix+".mother", p.Mother, 150)
	}
	checkPerson("groom", c.Groom)
	checkPerson("bride", c.Bride)

	e := c.Event
	if e.CeremonyAt.IsZero() {
		errs["event.ceremony_at"] = "bắt buộc"
	}
	max("event.venue_name", e.VenueName, 200)
	max("event.lunar_text", e.LunarText, 100)
	max("event.dress_code", e.DressCode, 200)

	if len(c.Schedule) > 20 {
		errs["schedule"] = "tối đa 20 dòng"
	}
	for _, s := range c.Schedule {
		if !timeRe.MatchString(s.Time) || s.Title == "" || runes(s.Title) > 200 {
			errs["schedule"] = "mỗi dòng cần giờ HH:MM và nội dung (tối đa 200 ký tự)"
			break
		}
	}

	if len(c.Gifts) > 6 {
		errs["gifts"] = "tối đa 6 dòng"
	}
	for _, g := range c.Gifts {
		if g.Side != "groom" && g.Side != "bride" {
			errs["gifts"] = "side phải là groom hoặc bride"
			break
		}
		if g.Bank == "" || g.AccountNo == "" || g.AccountName == "" ||
			runes(g.Bank) > 100 || runes(g.AccountNo) > 50 || runes(g.AccountName) > 150 {
			errs["gifts"] = "mỗi dòng cần ngân hàng, số tài khoản, tên chủ tài khoản (độ dài hợp lệ)"
			break
		}
	}
	return errs
}