# 05. Lộ trình triển khai

Mỗi giai đoạn chạy được và kiểm tra được độc lập. Làm theo thứ tự, xong giai đoạn nào cho kiểm tra giai đoạn đó rồi mới sang giai đoạn kế tiếp.

## Giai đoạn 0: Dọn nền (0.5 ngày)

- [ ] Chỉ giữ `golang-migrate`: xóa `db.Migrate`, `//go:embed`, `db/seed.go`
- [ ] Tách seed (roles, permissions, templates) khỏi `001`, thêm `ON CONFLICT DO NOTHING`
- [ ] Sửa `001_init.down.sql` cho đủ bảng và đúng thứ tự drop
- [ ] Gom `writeJSON`, `writeError`, `decodeJSON` vào `handler/response.go`
- [ ] Thêm `handler/paging.go` đọc `page`, `page_size`
- [ ] Sửa `app/template/layout.tsx` (bỏ `<html>` lồng nhau)

**Xong khi:** `docker compose up` từ DB trống chạy migration, đăng nhập `admin` được.

## Giai đoạn 1: Admin quản lý user và template (1-2 ngày)

Backend
- [ ] `adminOnly` wrapper, `routes_admin.go`
- [ ] Domain `user`: thêm `List`, `Update`, `SoftDelete`, `SetPassword`
- [ ] Handler `admin_user.go` (kèm doc comment input / output)
- [ ] Domain `template` (`store.go`) và handler `admin_template.go`
- [ ] Chặn admin tự khóa, tự xóa, tự hạ quyền chính mình

Frontend
- [ ] `lib/api.ts`
- [ ] `admin/layout.tsx` với sidebar
- [ ] `admin/users` (bảng, thêm, sửa, khóa)
- [ ] `admin/templates` (danh sách, bật hoặc tắt, sửa config)

**Xong khi:** admin tạo được user mới, khóa user thì user đó mất phiên ngay (vì `Me` đọc lại DB), user thường vào `/admin` bị chuyển đi.

## Giai đoạn 2: Thông tin đám cưới và thiệp hiển thị bằng dữ liệu thật (3-4 ngày)

Backend
- [ ] Migration `002_invitation_content`
- [ ] `domain/invitation`: `model`, `validate`, `store` (Create, Replace, GetByID, List, SetStatus, Delete), `service.Publish`
- [ ] `LoadRender(slug, onlyPublished)` gom dữ liệu và gộp `template.config` với `invitation.data`
- [ ] Handler `admin_invitation.go` và `public_invitation.go` (Render)
- [ ] Test `Validate()` bằng table-driven test

Frontend
- [ ] `types/invitation.ts`, `registry.ts`, `sampleData.ts`
- [ ] Chuyển template `rose`, `dragon` sang đọc `data`
- [ ] `app/i/[slug]/page.tsx` (có `generateMetadata`)
- [ ] `admin/invitations` (danh sách) và form tạo hoặc sửa (tab 1-4, 6, 7)
- [ ] `admin/invitations/[id]/preview`
- [ ] Nút Xuất bản, Hủy xuất bản, Nhân bản

**Xong khi:** admin nhập thông tin cặp đôi, bấm Xuất bản, mở `/i/<slug>` thấy đúng thông tin vừa nhập; đổi template từ `rose` sang `dragon` thì giao diện đổi nhưng dữ liệu giữ nguyên; thiệp nháp mở bằng link public trả 404.

## Giai đoạn 3: Ảnh, QR, nhạc nền (2 ngày)

- [ ] `storage.Storage` + `local.go`, config `UPLOAD_DIR`, `UPLOAD_MAX_MB`
- [ ] Route `GET /uploads/`, rewrite trong `next.config.ts`, volume `uploads` trong docker-compose
- [ ] `domain/media` + handler `admin_media.go` (upload, xóa, sắp xếp)
- [ ] Kiểm tra content-type thật, giới hạn dung lượng, đổi tên bằng UUID
- [ ] Component `ImageUploader` (kéo thả, sắp xếp) cho tab 5
- [ ] Gắn `qr_media_id` cho tab quà mừng
- [ ] Xóa file trên đĩa khi xóa media hoặc xóa thiệp

**Xong khi:** upload ảnh album thì thấy ngay trong carousel của thiệp, xóa ảnh thì file biến mất khỏi `uploads/`.

## Giai đoạn 4: RSVP và lời chúc thật (1-2 ngày)

- [ ] `domain/rsvp`, `domain/wish`
- [ ] Public: `POST .../rsvp`, `POST` và `GET .../wishes`
- [ ] Middleware `rateLimit`, xử lý `X-Forwarded-For`
- [ ] Thay hai chỗ `// TODO` ở template bằng API thật
- [ ] Admin: danh sách RSVP, tổng số khách, xuất CSV
- [ ] Admin: ẩn hoặc hiện và xóa lời chúc
- [ ] Màn hình `admin/invitations/[id]/feedback`

**Xong khi:** khách gửi RSVP và lời chúc từ thiệp public thì admin thấy trong danh sách; gửi liên tục quá giới hạn thì nhận `429`.

## Giai đoạn 5: Hoàn thiện và mở rộng (làm dần)

| Hạng mục | Ghi chú |
|---|---|
| User tự sửa thiệp | Thêm `/api/me/invitations/*` và `service.UpdateOwn` có kiểm tra sở hữu |
| Phân quyền theo permission | Dùng `tbl_permissions`, middleware `RequirePermission("templates:manage")` thay cho kiểm tra role |
| Thống kê | `view_count`, tổng RSVP, biểu đồ cho dashboard admin |
| Gửi link riêng cho từng khách | Bảng `tbl_guests` với token, thiệp tự điền tên khách ("Trân trọng kính mời anh/chị ...") |
| Tên miền riêng cho thiệp | Cột `custom_domain`, proxy theo `Host` |
| Lưu file trên S3 / R2 | Implement thêm `storage/s3.go` |
| Nhạc nền, hiệu ứng | Bật theo `sections` và `features` trong config |
| Giám sát | Healthcheck sâu (ping DB), log có cấu trúc, backup Postgres định kỳ |
| Rate limit đăng nhập và đăng ký | Thay cho `time.Sleep(500ms)` tạm thời |
| CI | Chạy `go vet`, `go test`, `npm run lint`, `npm run build` |

## Rủi ro cần để ý

| Rủi ro | Cách giảm |
|---|---|
| Template trong DB có `code` mà FE chưa có component | Trang `/i/[slug]` gọi `notFound()`; admin chỉ cho chọn template `is_active`; ghi chú trong form tạo template là `code` phải trùng registry |
| Ảnh lớn làm thiệp tải chậm trên 4G | Giới hạn 5MB; về sau sinh bản thu nhỏ khi upload (WebP, nhiều kích thước) và dùng `loading="lazy"` |
| Mất file upload khi rebuild container | Mount volume `uploads`, nằm trong kế hoạch backup |
| Spam RSVP / lời chúc | Rate limit theo IP, giới hạn độ dài, admin có thể ẩn hoặc xóa |
| Lộ thông tin cá nhân (số điện thoại khách) | Public API không bao giờ trả RSVP, chỉ trả lời chúc đã được duyệt hiển thị |
| Đổi `slug` làm hỏng link đã gửi | Cho phép đổi nhưng cảnh báo rõ; về sau lưu lịch sử slug để chuyển hướng |
