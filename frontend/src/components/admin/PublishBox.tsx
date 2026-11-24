"use client";

import { useState } from "react";
import { api } from "@/lib/api";

const msg = (e: unknown) => (e instanceof Error ? e.message : "Có lỗi xảy ra");

export default function PublishBox({ id, slug, status: initial }: { id: string; slug: string; status: string }) {
  const [status, setStatus] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const published = status === "published";
  const url = `${window.location.origin}/i/${slug}`;

  const change = async (next: "published" | "draft") => {
    setBusy(true);
    setError("");
    try {
      await api(`/api/admin/invitations/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      setStatus(next);
    } catch (e) {
      setError(msg(e));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Không sao chép được, hãy chọn link và copy thủ công");
    }
  };

  return (
    <div className="card sec">
      <h3>Link gửi cho khách</h3>
      {published ? (
        <>
          <p>Khách mở link này không cần đăng nhập.</p>
          <div className="rowi" style={{ gridTemplateColumns: "1fr auto auto" }}>
            <input readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Link thiệp" />
            <button type="button" className="b g s" onClick={copy}>{copied ? "Đã chép" : "Sao chép"}</button>
            <a className="b g s" href={url} target="_blank" rel="noreferrer">Mở</a>
          </div>
          <button type="button" className="b d s" disabled={busy} onClick={() => change("draft")}>Hủy xuất bản</button>
        </>
      ) : (
        <>
          <p>Thiệp đang ở trạng thái nháp nên khách chưa xem được. Bấm Xuất bản để tạo link: <code>/i/{slug}</code></p>
          <button type="button" className="b" disabled={busy} onClick={() => change("published")}>{busy ? "Đang xử lý..." : "Xuất bản"}</button>
        </>
      )}
      {error && <p className="err" role="alert">{error}</p>}
    </div>
  );
}