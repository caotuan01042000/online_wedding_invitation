# 02. Thiết kế API

## 1. Quy ước chung

| Mục | Quy ước |
|---|---|
| Định dạng | JSON, UTF-8, `Content-Type: application/json` (trừ upload dùng `multipart/form-data`) |
| Xác thực | Cookie `token` (HttpOnly) do `/api/auth/login` hoặc `/register` cấp |
| Prefix | `/api/auth/*` (đã có), `/api/admin/*` (role admin), `/api/public/*` (không cần đăng nhập) |
| Lỗi chung | `{"error": "thông báo"}` |
| Lỗi validate | `422` + `{"error": "...", "fields": {"email": "..."}}` |
| Phân trang | `?page=1&page_size=20` (tối đa 100), trả `{"items": [...], "page": 1, "page_size": 20, "total": 135}` |
| ID | UUID dạng chuỗi |
| Thời gian | ISO 8601, ví dụ `2027-01-17T10:00:00+07:00` |

| Mã | Ý nghĩa |
|---|---|
| 400 | Body không phải JSON, có field lạ, quá lớn |
| 401 | Chưa đăng nhập hoặc token hết hạn |
| 403 | Không đủ quyền (không phải admin) |
| 404 | Không tìm thấy (hoặc thiệp chưa xuất bản khi gọi public) |
| 409 | Trùng dữ liệu (`slug`, `username`, `email`) |
| 422 | Dữ liệu không hợp lệ |
| 429 | Gọi quá nhiều (RSVP / lời chúc) |

---

## 2. Public API (khách mời)

Chỉ làm việc với thiệp có `status = 'published'`. Thiệp nháp trả `404`.

### 2.1 `GET /api/public/invitations/{slug}`: lấy dữ liệu để render thiệp

Output `200`:

```json
{
  "id": "0b7c...",
  "slug": "minh-tuan-ngoc-anh",
  "title": "Đám cưới Minh Tuấn & Ngọc Anh",
  "template": { "code": "rose" },
  "theme": { "bg": "#FDEEF2", "acc": "#E8668B" },
  "sections": { "album": true, "countdown": true, "gifts": true },
  "couple": {
    "groom": {
      "short_name": "Minh Tuấn",
      "full_name": "Nguyễn Minh Tuấn",
      "rank": "Trưởng nam",
      "father": "Nguyễn Văn A",
      "mother": "Trần Thị B",
      "address": "Biên Hòa, Đồng Nai"
    },
    "bride": { "short_name": "Ngọc Anh", "full_name": "Lê Ngọc Anh", "rank": "Út nữ", "father": "Lê Văn C", "mother": "Phạm Thị D", "address": "Quận 1, TP. Hồ Chí Minh" }
  },
  "event": {
    "ceremony_at": "2027-01-17T10:00:00+07:00",
    "ceremony_place": "Lễ thành hôn được cử hành tại tư gia",
    "party_at": "2027-01-17T11:30:00+07:00",
    "venue_name": "Nhà hàng tiệc cưới Hoa Mẫu Đơn",
    "venue_address": "123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
    "map_url": "",
    "lunar_text": "Tức ngày 9 tháng 12 năm Bính Ngọ",
    "dress_code": "Tông hồng phấn, trắng hoặc kem",
    "dress_colors": ["#F8D3DD", "#FFFFFF"],
    "closing_message": "Sự hiện diện của quý khách là niềm vinh hạnh của gia đình chúng tôi"
  },
  "schedule": [
    { "time": "11:00", "title": "Đón khách" },
    { "time": "11:30", "title": "Khai tiệc" }
  ],
  "gifts": [
    { "side": "groom", "bank": "Vietcombank", "account_no": "0123456789", "account_name": "NGUYEN MINH TUAN", "qr_url": "/uploads/2027/01/ab12.png" }
  ],
  "media": {
    "cover_url": "/uploads/2027/01/cover.jpg",
    "hero_url": null,
    "music_url": "/uploads/2027/01/song.mp3",
    "photos": [{ "id": "…", "url": "/uploads/2027/01/p1.jpg" }]
  },
  "wishes": [
    { "id": "…", "guest_name": "Gia đình cô Lan", "message": "Chúc hai cháu trăm năm hạnh phúc!", "created_at": "2027-01-01T08:00:00+07:00" }
  ]
}
```

Lỗi: `404` nếu không có `slug` hoặc thiệp chưa xuất bản.

Ghi chú:
- `theme` và `sections` đã gộp `template.config` với `invitation.data`.
- `wishes` chỉ trả 50 lời chúc mới nhất có `is_visible = true`. Muốn xem thêm thì dùng 2.4.
- Không trả `user_id`, `created_by`, thông tin tài khoản chủ thiệp.
- Mỗi lần gọi tăng `view_count` (làm bất đồng bộ, không chặn response).

### 2.2 `POST /api/public/invitations/{slug}/rsvp`: xác nhận tham dự

Input (tối đa 2KB):

| Field | Kiểu | Bắt buộc | Quy tắc |
|---|---|---|---|
| `guest_name` | string | có | 1-150 ký tự |
| `is_attending` | boolean | có | |
| `guest_count` | integer | không | 0-20, mặc định 1; nếu `is_attending = false` thì ép về 0 |
| `phone` | string | không | tối đa 20 ký tự |
| `note` | string | không | tối đa 500 ký tự |

```json
{ "guest_name": "Nguyễn Văn Khách", "is_attending": true, "guest_count": 2, "note": "Đi cùng vợ" }
```

Output `201`: `{"message": "đã ghi nhận"}`. Lỗi: `404`, `422`, `429`.

### 2.3 `POST /api/public/invitations/{slug}/wishes`: gửi lời chúc

| Field | Kiểu | Bắt buộc | Quy tắc |
|---|---|---|---|
| `guest_name` | string | không | tối đa 150 ký tự, trống thì lưu "Khách mời" |
| `message` | string | có | 1-1000 ký tự |

Output `201`: object lời chúc vừa tạo (`id`, `guest_name`, `message`, `created_at`). Lỗi: `404`, `422`, `429`.

### 2.4 `GET /api/public/invitations/{slug}/wishes?page=1&page_size=20`

Output `200`: danh sách phân trang các lời chúc có `is_visible = true`, mới nhất trước.

---

## 3. Admin API (bắt buộc role `admin`)

Tất cả route dưới đây trả `401` nếu chưa đăng nhập và `403` nếu không phải admin.

### 3.1 Quản lý user

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/admin/users?q=&role=&is_active=&page=` | Danh sách, tìm theo username / email / tên |
| POST | `/api/admin/users` | Tạo user (có thể chọn role) |
| GET | `/api/admin/users/{id}` | Chi tiết |
| PATCH | `/api/admin/users/{id}` | Sửa `full_name`, `phone`, `role`, `is_active` |
| POST | `/api/admin/users/{id}/reset-password` | Đặt mật khẩu mới |
| DELETE | `/api/admin/users/{id}` | Xóa mềm (`deleted_at`) |

`POST /api/admin/users`:

| Field | Bắt buộc | Quy tắc |
|---|---|---|
| `username` | có | 3-50 ký tự: chữ, số, `_`, `.` |
| `email` | có | email hợp lệ, tối đa 255 |
| `password` | có | 8-72 byte |
| `full_name` | không | tối đa 150 ký tự |
| `phone` | không | tối đa 20 ký tự |
| `role` | không | `admin` hoặc `user`, mặc định `user` |

`PATCH` chỉ cập nhật các field gửi lên (field vắng mặt thì giữ nguyên).

Ràng buộc: admin không được tự khóa, tự xóa hoặc tự hạ quyền chính mình (tránh mất hết admin).

`POST .../reset-password`: body `{"password": "mật-khẩu-mới"}`, `204` khi thành công.

### 3.2 Quản lý template

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/admin/templates?is_active=` | Danh sách |
| POST | `/api/admin/templates` | Tạo |
| GET | `/api/admin/templates/{id}` | Chi tiết |
| PATCH | `/api/admin/templates/{id}` | Sửa tên, mô tả, thumbnail, `config`, `is_active` |
| DELETE | `/api/admin/templates/{id}` | Xóa; `409` nếu đang có thiệp dùng (khuyên dùng `is_active=false`) |

`POST /api/admin/templates`:

| Field | Bắt buộc | Quy tắc |
|---|---|---|
| `code` | có | 2-50 ký tự `a-z0-9_-`, **phải trùng key trong registry FE** (`rose`, `dragon`), không đổi sau khi tạo |
| `name` | có | tối đa 150 ký tự |
| `description` | không | |
| `thumbnail_url` | không | |
| `config` | không | JSON theo mục 4 của `01-database.md` |

### 3.3 Quản lý thiệp

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/admin/invitations?q=&status=&user_id=&template_id=&page=` | Danh sách (kèm tên cô dâu chú rể, ngày cưới, số RSVP) |
| POST | `/api/admin/invitations` | Tạo thiệp cùng toàn bộ nội dung |
| GET | `/api/admin/invitations/{id}` | Chi tiết để đổ vào form sửa |
| PUT | `/api/admin/invitations/{id}` | Thay thế toàn bộ nội dung (transaction) |
| PATCH | `/api/admin/invitations/{id}/status` | Xuất bản, hủy xuất bản, lưu trữ |
| GET | `/api/admin/invitations/{id}/render` | Giống payload `2.1` nhưng **không kiểm tra status** (để xem trước bản nháp) |
| POST | `/api/admin/invitations/{id}/duplicate` | Nhân bản làm thiệp mới (slug mới, status `draft`) |
| DELETE | `/api/admin/invitations/{id}` | Xóa cứng (cascade) |

**`POST` và `PUT /api/admin/invitations`**: body cùng cấu trúc.

```json
{
  "user_id": "uuid-chủ-thiệp",
  "template_id": "uuid-template",
  "slug": "minh-tuan-ngoc-anh",
  "title": "Đám cưới Minh Tuấn & Ngọc Anh",
  "settings": { "theme": { "acc": "#E8D3A0" }, "sections": { "countdown": false } },
  "groom": {
    "short_name": "Minh Tuấn", "full_name": "Nguyễn Minh Tuấn", "rank": "Trưởng nam",
    "father": "Nguyễn Văn A", "mother": "Trần Thị B", "address": "Biên Hòa, Đồng Nai"
  },
  "bride": {
    "short_name": "Ngọc Anh", "full_name": "Lê Ngọc Anh", "rank": "Út nữ",
    "father": "Lê Văn C", "mother": "Phạm Thị D", "address": "Quận 1, TP. Hồ Chí Minh"
  },
  "event": {
    "ceremony_at": "2027-01-17T10:00:00+07:00",
    "ceremony_place": "Lễ thành hôn được cử hành tại tư gia",
    "party_at": "2027-01-17T11:30:00+07:00",
    "venue_name": "Nhà hàng tiệc cưới Hoa Mẫu Đơn",
    "venue_address": "123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
    "map_url": "",
    "lunar_text": "Tức ngày 9 tháng 12 năm Bính Ngọ",
    "dress_code": "Tông hồng phấn, trắng hoặc kem",
    "dress_colors": ["#F8D3DD", "#FFFFFF"],
    "closing_message": ""
  },
  "schedule": [{ "time": "11:00", "title": "Đón khách" }],
  "gifts": [{ "side": "groom", "bank": "Vietcombank", "account_no": "0123456789", "account_name": "NGUYEN MINH TUAN", "qr_media_id": null }]
}
```

Quy tắc validate:

| Field | Quy tắc |
|---|---|
| `user_id` | bắt buộc, phải là user tồn tại và chưa xóa |
| `template_id` | bắt buộc, template phải `is_active` |
| `slug` | bắt buộc, `^[a-z0-9]+(-[a-z0-9]+)*$`, 3-100 ký tự; trùng thì `409` |
| `title` | tối đa 200 ký tự |
| `groom`, `bride` | bắt buộc; `short_name` (tối đa 50) và `full_name` (tối đa 150) bắt buộc |
| `event.ceremony_at` | bắt buộc |
| `event.dress_colors` | tối đa 6 màu, mỗi màu `#RRGGBB` |
| `schedule` | tối đa 20 dòng; `time` dạng `HH:MM` |
| `gifts` | tối đa 6 dòng; `side` là `groom` hoặc `bride`; `qr_media_id` phải thuộc cùng thiệp |
| `settings` | JSON object tối đa 8KB |

- `POST` trả `201` kèm object chi tiết. `status` mặc định `draft`.
- `PUT` luôn thay toàn bộ phần con (xóa rồi tạo lại trong 1 transaction). Ảnh album **không** đi qua `PUT`, dùng API media bên dưới.

**`PATCH /api/admin/invitations/{id}/status`**: body `{"status": "published"}` (`draft`, `published`, `archived`). Khi chuyển sang `published`, service kiểm tra đủ `groom`, `bride`, `event`; thiếu thì `422`. Lần đầu xuất bản ghi `published_at`.

### 3.4 Media của thiệp

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/admin/invitations/{id}/media?kind=` | Danh sách |
| POST | `/api/admin/invitations/{id}/media` | Upload (`multipart/form-data`: `kind`, `file`) |
| PATCH | `/api/admin/invitations/{id}/media/order` | Sắp xếp ảnh: `{"ids": ["…", "…"]}` |
| DELETE | `/api/admin/invitations/{id}/media/{mediaId}` | Xóa DB và file |

| Kind | Định dạng cho phép | Tối đa |
|---|---|---|
| `photo`, `cover`, `hero`, `qr` | `image/jpeg`, `image/png`, `image/webp` | 5 MB |
| `music` | `audio/mpeg` | 10 MB |

Backend kiểm tra loại file thật bằng `http.DetectContentType` (không tin tên file hay header của client) và đặt tên file mới bằng UUID. Mỗi thiệp tối đa 30 ảnh `photo`.

Output `201`: `{"id": "…", "kind": "photo", "url": "/uploads/2027/01/ab12.jpg"}`.

### 3.5 RSVP và lời chúc

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/admin/invitations/{id}/rsvps?is_attending=&page=` | Danh sách RSVP, kèm tổng số người tham dự |
| GET | `/api/admin/invitations/{id}/rsvps/export` | Tải CSV |
| DELETE | `/api/admin/invitations/{id}/rsvps/{rsvpId}` | Xóa |
| GET | `/api/admin/invitations/{id}/wishes?page=` | Danh sách lời chúc (cả đã ẩn) |
| PATCH | `/api/admin/invitations/{id}/wishes/{wishId}` | Ẩn hoặc hiện: `{"is_visible": false}` |
| DELETE | `/api/admin/invitations/{id}/wishes/{wishId}` | Xóa |

### 3.6 Thống kê (giai đoạn sau)

`GET /api/admin/stats` trả tổng user, số thiệp theo trạng thái, tổng RSVP, tổng lượt xem.

---

## 4. API cho user thường (giai đoạn sau)

Dùng chung service với admin nhưng **luôn kiểm tra `invitation.user_id == người đang đăng nhập`**.

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/me/invitations` | Thiệp của tôi |
| GET | `/api/me/invitations/{id}` | Chi tiết |
| PUT | `/api/me/invitations/{id}` | Sửa nội dung (không được đổi `user_id`, `template_id` nếu chưa được phép) |
| GET | `/api/me/invitations/{id}/rsvps` | Xem ai đã xác nhận |

## 5. Bảo mật tóm tắt

- Public API không bao giờ trả dữ liệu thiệp `draft` hoặc `archived`.
- RSVP và lời chúc cần **rate limit theo IP** (gợi ý 5 request/phút/IP/thiệp) và giới hạn độ dài.
- Nội dung lời chúc phải được escape khi hiển thị. React mặc định đã escape, **không dùng `dangerouslySetInnerHTML`**.
- Upload: kiểm tra content-type thật, giới hạn dung lượng bằng `http.MaxBytesReader`, đổi tên file, không cho đường dẫn tự do.
- `Require(secret, h, user.RoleAdmin)` đọc role từ JWT, nên đổi role của user chỉ có hiệu lực khi token hết hạn. Với thao tác nhạy cảm (đổi role, xóa user) nên đọc lại role từ DB.
