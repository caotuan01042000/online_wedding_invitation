"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Paged } from "@/lib/api";

interface Row {
  id: string;
  slug: string;
  title: string;
  status: string;
  template_name: string;
  groom: string;
  bride: string;
  ceremony_at: string | null;
  created_at: string;
}

const PAGE_SIZE = 10;
const fmt = (s: string | null) => (s ? new Date(s).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "–");
const STATUS: Record<string, string> = { draft: "Bản nháp", published: "Đã xuất bản", archived: "Lưu trữ" };

export default function InvitationsPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<Row> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stale = false;
    api<Paged<Row>>(`/api/admin/invitations?page=${page}&page_size=${PAGE_SIZE}`)
      .then((d) => { if (!stale) { setData(d); setError(""); } })
      .catch((e) => { if (!stale) setError(e instanceof Error ? e.message : "Có lỗi xảy ra"); });
    return () => { stale = true; };
  }, [page]);

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <>
      <h1>Thiệp cưới</h1>
      <div className="bar"><Link href="/admin/invitations/new" className="b">+ Tạo thiệp</Link></div>
      {error && <p className="err" role="alert">{error}</p>}

      <div className="tw">
        <table>
          <thead>
            <tr><th>Cô dâu &amp; chú rể</th><th>Mẫu</th><th>Ngày cưới</th><th>Trạng thái</th><th>Slug</th><th /></tr>
          </thead>
          <tbody>
            {data?.items.map((r) => (
              <tr key={r.id}>
                <td>{r.groom} &amp; {r.bride}</td>
                <td>{r.template_name}</td>
                <td>{fmt(r.ceremony_at)}</td>
                <td><span className="tag">{STATUS[r.status] ?? r.status}</span></td>
                <td>{r.slug}</td>
                <td>
                  <div className="acts">
                    <Link className="b s" href={`/admin/invitations/${r.id}/edit`}>Sửa</Link>
                    <a className="b g s" href={`/preview/${r.id}`} target="_blank" rel="noreferrer">Xem</a>
                  </div>
                </td>
              </tr>
            ))}
            {data && data.items.length === 0 && <tr><td colSpan={6}>Chưa có thiệp nào.</td></tr>}
            {!data && !error && <tr><td colSpan={6}>Đang tải...</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="pg">
        <span>Tổng {data?.total ?? 0} · Trang {page}/{pages}</span>
        <button className="b g s" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹ Trước</button>
        <button className="b g s" disabled={page >= pages} onClick={() => setPage(page + 1)}>Sau ›</button>
      </div>
    </>
  );
}