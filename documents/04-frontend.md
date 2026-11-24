# 04. Kiến trúc frontend (Next.js)

> `AGENTS.md` trong dự án nhắc rằng Next.js bản này có thay đổi so với kiến thức cũ. Trước khi viết code, đọc hướng dẫn trong `node_modules/next/dist/docs/`, đặc biệt phần `params` của dynamic route (từ Next 15 trở đi `params` là **Promise**) và `proxy.ts`.

## 1. Cấu trúc thư mục đề xuất

```
frontend/src/
├── proxy.ts                         # chặn /admin cho người chưa đăng nhập (đã có)
├── lib/
│   ├── auth.ts                      # safeNext, homeFor (đã có)
│   ├── api.ts                       # wrapper fetch cho client component
│   └── server-api.ts                # fetch phía server (gọi thẳng BACKEND_URL)
├── types/
│   └── invitation.ts                # InvitationData: khớp payload GET /api/public/...
├── components/
│   ├── invitation/
│   │   ├── registry.ts              # template.code -> component
│   │   ├── sampleData.ts            # dữ liệu mẫu để xem thử template
│   │   ├── shared/                  # Countdown, MapBlock, RsvpForm, WishBook, GiftModal
│   │   └── templates/
│   │       ├── rose/index.tsx       # chuyển từ app/page.tsx
│   │       └── dragon/index.tsx     # chuyển từ app/template/page.tsx
│   └── admin/                       # DataTable, FormField, ConfirmDialog, ImageUploader
└── app/
    ├── page.tsx                     # trang giới thiệu hoặc chuyển hướng
    ├── login/  register/            # đã có
    ├── i/[slug]/page.tsx            # THIỆP PUBLIC
    └── admin/
        ├── layout.tsx               # sidebar + khung chung
        ├── page.tsx                 # dashboard
        ├── users/{page.tsx, new/, [id]/}
        ├── templates/{page.tsx, [id]/}
        └── invitations/
            ├── page.tsx             # danh sách
            ├── new/page.tsx         # tạo mới (cùng form với edit)
            └── [id]/
                ├── edit/page.tsx
                ├── preview/page.tsx # xem thử bản nháp
                └── feedback/page.tsx# RSVP + lời chúc
```

## 2. Kiểu dữ liệu dùng chung

`types/invitation.ts` mô tả đúng payload ở mục 2.1 của `02-api.md`:

```ts
export interface Person {
  short_name: string;
  full_name: string;
  rank: string;
  father: string;
  mother: string;
  address: string;
}

export interface InvitationData {
  id: string;
  slug: string;
  title: string;
  template: { code: string };
  theme: Record<string, string>;
  sections: Record<string, boolean>;
  couple: { groom: Person; bride: Person };
  event: {
    ceremony_at: string;
    ceremony_place: string;
    party_at: string | null;
    venue_name: string;
    venue_address: string;
    map_url: string;
    lunar_text: string;
    dress_code: string;
    dress_colors: string[];
    closing_message: string;
  };
  schedule: { time: string; title: string }[];
  gifts: { side: "groom" | "bride"; bank: string; account_no: string; account_name: string; qr_url: string | null }[];
  media: {
    cover_url: string | null;
    hero_url: string | null;
    music_url: string | null;
    photos: { id: string; url: string }[];
  };
  wishes: { id: string; guest_name: string; message: string; created_at: string }[];
}

// Every template component receives exactly this.
export interface TemplateProps {
  data: InvitationData;
  preview?: boolean; // true in admin preview: forms must not submit to the real API
}
```

## 3. Template registry

```ts
// components/invitation/registry.ts
import type { ComponentType } from "react";
import type { TemplateProps } from "@/types/invitation";
import RoseTemplate from "./templates/rose";
import DragonTemplate from "./templates/dragon";

// Key = tbl_templates.code. Add a new template: create the folder, add one line here.
export const registry: Record<string, ComponentType<TemplateProps>> = {
  rose: RoseTemplate,
  dragon: DragonTemplate,
};
```

## 4. Cách chuyển template hiện tại sang dạng dùng data từ API

Hai file `app/page.tsx` và `app/template/page.tsx` đang đọc hằng số `W`. Việc cần làm cho mỗi template:

1. Chuyển file vào `components/invitation/templates/<code>/index.tsx`, đổi `export default function Home()` thành `export default function RoseTemplate({ data, preview }: TemplateProps)`.
2. **Xóa hằng số `W`** và đổi sang đọc từ `data`. Bảng đổi tên:

| Đang dùng (`W`) | Thay bằng (`data`) |
|---|---|
| `W.groom.short`, `W.groom.full` | `data.couple.groom.short_name`, `.full_name` |
| `W.groom.rank` | `data.couple.groom.rank` |
| `W.groom.parents` | ghép từ `father` và `mother`: `Ông ${father} & Bà ${mother}` |
| `W.groom.place` / `addr` | `data.couple.groom.address` |
| `W.date`, `W.ceremonyTime` | `data.event.ceremony_at` (tách giờ, ngày bằng `new Date`) |
| `W.partyTime` | `data.event.party_at` |
| `W.lunar` | `data.event.lunar_text` |
| `W.ceremony` / `ceremonyPlace` | `data.event.ceremony_place` |
| `W.venue`, `W.address` | `data.event.venue_name`, `venue_address` |
| `W.dress` | `data.event.dress_code` |
| `t.dress` (màu dress code) | `data.event.dress_colors` |
| `W.schedule` (`t`, `n`) | `data.schedule` (`time`, `title`) |
| `W.gifts` (`bank`, `no`, `name`, `qr`) | `data.gifts` (`bank`, `account_no`, `account_name`, `qr_url`) |
| `PHOTOS`, `HERO_IMG`, `MUSIC` | `data.media.photos`, `hero_url`, `music_url` |
| `THEMES[THEME]` | `data.theme` (màu lấy từ DB, có giá trị mặc định dự phòng) |
| `wishes` (state khởi tạo) | `useState(data.wishes)` |

3. Phần `if (data.sections.countdown) …` để ẩn hiện section theo cấu hình.
4. Gọi API thật cho RSVP và lời chúc, thay hai chỗ `// TODO`:

```tsx
const sendRsvp = async () => {
  if (!rsvp.name.trim()) return;
  if (preview) { setRsvpDone(true); return; } // admin preview: do not write real data
  const res = await fetch(`/api/public/invitations/${data.slug}/rsvp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      guest_name: rsvp.name.trim(),
      is_attending: rsvp.attend === "yes",
      guest_count: rsvp.attend === "yes" ? Number(rsvp.guests) : 0,
    }),
  });
  if (res.ok) setRsvpDone(true);
};
```

5. Phần lặp lại giữa hai template (đếm ngược, form RSVP, sổ lưu bút, modal quà mừng) tách dần sang `shared/` để template mới chỉ cần viết phần giao diện riêng.

## 5. Trang thiệp public `app/i/[slug]/page.tsx`

```tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { registry } from "@/components/invitation/registry";
import type { InvitationData } from "@/types/invitation";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8080";

async function load(slug: string): Promise<InvitationData | null> {
  const res = await fetch(`${BACKEND}/api/public/invitations/${encodeURIComponent(slug)}`, {
    cache: "no-store", // switch to revalidate once traffic grows
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("không tải được thiệp");
  return res.json();
}

// params is a Promise in recent Next versions
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) return { title: "Không tìm thấy thiệp" };
  return {
    title: data.title,
    openGraph: { title: data.title, images: data.media.cover_url ? [data.media.cover_url] : [] }, // link preview on Zalo / Facebook
  };
}

export default async function InvitationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) notFound();

  const Template = registry[data.template.code];
  if (!Template) notFound(); // template code in DB has no matching component

  return <Template data={data} />;
}
```

Điểm cần lưu ý:
- Trang này là **server component**, tải dữ liệu rồi truyền xuống template (client component). Nhờ vậy khách mở link là thấy nội dung ngay, và thẻ preview khi chia sẻ qua Zalo hay Facebook có đúng tên cùng ảnh bìa.
- Các font dùng `next/font` trong template sẽ chạy tốt vì đã là module cấp file.
- Cần thêm rewrite cho file upload trong `next.config.ts`:

```ts
async rewrites() {
  return [
    { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },
    { source: "/uploads/:path*", destination: `${BACKEND_URL}/uploads/:path*` },
  ];
},
```

## 6. Admin

### 6.1 Bảo vệ route

`proxy.ts` (đã có) chặn `/admin/*`, chỉ cho role `admin`. Khi chuyển phần xem thử template sang `/admin/...`, **bỏ `/template` khỏi `matcher`** và xóa thư mục `app/template/`.

### 6.2 Layout và điều hướng

`app/admin/layout.tsx` có sidebar:

| Menu | Đường dẫn |
|---|---|
| Tổng quan | `/admin` |
| Người dùng | `/admin/users` |
| Mẫu thiệp | `/admin/templates` |
| Thiệp cưới | `/admin/invitations` |
| Đăng xuất | gọi `POST /api/auth/logout` |

### 6.3 Các màn hình

| Màn hình | Chức năng chính |
|---|---|
| `/admin/users` | Bảng user (tìm kiếm, lọc role, phân trang), khóa hoặc mở khóa, đổi role, reset mật khẩu, thêm mới |
| `/admin/templates` | Lưới template (thumbnail, tên, bật hoặc tắt), sửa `config` mặc định (màu, section) |
| `/admin/invitations` | Bảng thiệp: cô dâu chú rể, ngày cưới, template, chủ thiệp, trạng thái, số RSVP; nút Xem, Sửa, Nhân bản, Xuất bản |
| `/admin/invitations/new`, `[id]/edit` | **Form nhập thông tin đám cưới** (mục 6.4) |
| `/admin/invitations/[id]/preview` | Render template với dữ liệu nháp, truyền `preview` để form không ghi dữ liệu thật |
| `/admin/invitations/[id]/feedback` | Hai tab RSVP và Lời chúc, tổng số khách, xuất CSV, ẩn lời chúc |

### 6.4 Form tạo hoặc sửa thiệp (nhiều tab)

| Tab | Nhập gì | Lưu ở bảng |
|---|---|---|
| 1. Cơ bản | Chủ thiệp (chọn user), template, slug, tiêu đề | `tbl_invitations` |
| 2. Cô dâu và chú rể | Tên, họ tên đầy đủ, thứ bậc, bố, mẹ, địa chỉ cho từng bên | `tbl_wedding_people` |
| 3. Sự kiện | Giờ lễ, nơi làm lễ, giờ tiệc, nhà hàng, địa chỉ, ngày âm, dress code | `tbl_wedding_infos` |
| 4. Lịch trình | Danh sách giờ và nội dung, thêm, xóa, sắp xếp | `tbl_wedding_schedules` |
| 5. Ảnh và nhạc | Ảnh bìa, album, nhạc nền, kéo thả sắp xếp | `tbl_media` (API riêng) |
| 6. Quà mừng | Ngân hàng, số tài khoản, tên, ảnh QR cho mỗi bên | `tbl_wedding_gifts` |
| 7. Giao diện | Ghi đè màu, bật hoặc tắt section | `tbl_invitations.data` |

Gợi ý triển khai:
- Giữ **một state `Content` duy nhất** cho các tab 1-4, 6, 7 và nút **Lưu** gọi `POST` (tạo mới) hoặc `PUT` (sửa) một lần.
- Tab 5 chỉ dùng được sau khi thiệp đã được tạo (cần `invitation_id`). Luồng: tạo thiệp, tự chuyển sang trang `edit`, rồi mới upload ảnh.
- Lỗi `422` có `fields` kiểu `groom.short_name` nên hiển thị ngay dưới ô tương ứng.
- Tạo sẵn `slug` tự động từ hai tên (bỏ dấu, nối bằng `-`), cho phép sửa tay.

### 6.5 Wrapper gọi API

```ts
// lib/api.ts (client components)
export class ApiError extends Error {
  constructor(public status: number, message: string, public fields?: Record<string, string>) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (res.status === 401) {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    throw new ApiError(401, "chưa đăng nhập");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body.error || "Có lỗi xảy ra", body.fields);
  return body as T;
}
```

Upload file thì gọi `fetch` với `FormData` và **không** tự đặt `Content-Type` (trình duyệt tự thêm boundary).

## 7. Thứ tự làm cho frontend

1. Tạo `types/invitation.ts`, `sampleData.ts` (dữ liệu từ hằng số `W` cũ), `registry.ts`.
2. Chuyển hai template sang dùng `data`, kiểm tra bằng dữ liệu mẫu (chưa cần backend).
3. Làm `app/i/[slug]/page.tsx` khi backend đã có API render.
4. Dựng `admin/layout.tsx`, rồi từng màn hình theo thứ tự trong `05-roadmap.md`.
