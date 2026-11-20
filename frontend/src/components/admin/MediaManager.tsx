"use client";

import { useState } from "react";
import { api, upload, ApiError } from "@/lib/api";

export interface MediaItem {
  id: string;
  kind: string;
  url: string;
  mime_type: string;
  size_bytes: number;
  sort_order: number;
}

const IMG = "image/jpeg,image/png,image/webp";

// One entry per kind. "used" tells the admin which templates draw it.
const GROUPS = [
  { kind: "cover", title: "Ảnh bìa", multi: false, accept: IMG, mb: 5, hint: "Nền màn hình mở thiệp, nên dùng ảnh dọc.", used: "Hồng phấn, Rồng phượng" },
  { kind: "hero", title: "Ảnh chính", multi: false, accept: IMG, mb: 5, hint: "Ảnh lớn ở đầu thiệp.", used: "Rồng phượng (làm hình nền mờ)" },
  { kind: "groom", title: "Ảnh chú rể", multi: false, accept: IMG, mb: 5, hint: "Ảnh chân dung.", used: "Rồng phượng" },
  { kind: "bride", title: "Ảnh cô dâu", multi: false, accept: IMG, mb: 5, hint: "Ảnh chân dung.", used: "Rồng phượng" },
  { kind: "photo", title: "Album ảnh cưới", multi: true, max: 30, accept: IMG, mb: 5, hint: "Tối đa 30 ảnh. Dùng nút ◀ ▶ để đổi thứ tự.", used: "Hồng phấn, Rồng phượng" },
  { kind: "background", title: "Ảnh nền", multi: false, accept: IMG, mb: 5, hint: "Dành cho mẫu có nền họa tiết.", used: "Chưa mẫu nào dùng" },
  { kind: "qr", title: "Ảnh QR nhận mừng", multi: true, max: 6, accept: IMG, mb: 5, hint: "Tải lên rồi chọn ảnh ở mục Quà mừng của form phía trên.", used: "Hộp quà mừng" },
  { kind: "music", title: "Nhạc nền (mp3)", multi: false, accept: "audio/mpeg", mb: 10, hint: "Tối đa 10 MB.", used: "Rồng phượng" },
] as const;

const msg = (e: unknown) => (e instanceof ApiError && e.fields?.file ? e.fields.file : e instanceof Error ? e.message : "Có lỗi xảy ra");

export default function MediaManager({ invitationId, items, onChange }: { invitationId: string; items: MediaItem[]; onChange: () => void }) {
  return (
    <div className="card sec">
      <h3>Ảnh và nhạc</h3>
      <p>Tải lên là lưu ngay, không cần bấm Lưu thiệp. Mỗi mẫu thiệp chỉ dùng những loại ảnh phù hợp với phong cách của nó.</p>
      {GROUPS.map((g) => (
        <Group key={g.kind} g={g} invitationId={invitationId} items={items.filter((m) => m.kind === g.kind).sort((a, b) => a.sort_order - b.sort_order)} onChange={onChange} />
      ))}
    </div>
  );
}

function Group({ g, invitationId, items, onChange }: { g: (typeof GROUPS)[number]; invitationId: string; items: MediaItem[]; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const base = `/api/admin/invitations/${invitationId}/media`;
  const full = g.multi && items.length >= g.max;

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setBusy(true);
    setError("");
    try {
      for (const file of files) {
        if (file.size > g.mb * 1024 * 1024) throw new Error(`"${file.name}" lớn hơn ${g.mb} MB`);
        const form = new FormData();
        form.append("kind", g.kind);
        form.append("file", file);
        await upload(base, form); // sequential: the server locks the invitation per upload
      }
    } catch (ex) {
      setError(msg(ex));
    } finally {
      setBusy(false);
      onChange(); // refresh even after a partial failure
    }
  };

  const remove = async (m: MediaItem) => {
    if (!confirm("Xóa file này?")) return;
    setError("");
    try {
      await api(`${base}/${m.id}`, { method: "DELETE" });
      onChange();
    } catch (ex) {
      setError(msg(ex));
    }
  };

  const move = async (i: number, dir: -1 | 1) => {
    const ids = items.map((m) => m.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setError("");
    try {
      await api(`${base}/order`, { method: "PATCH", body: JSON.stringify({ ids }) });
      onChange();
    } catch (ex) {
      setError(msg(ex));
    }
  };

  return (
    <div className="mm">
      <div className="mm-head">
        <b>{g.title}</b>
        {g.multi && <span className="dimtxt"> ({items.length}/{g.max})</span>}
        <div className="dimtxt">{g.hint} Dùng trong: {g.used}.</div>
      </div>

      <div className="mm-grid">
        {items.map((m, i) => (
          <div className="mm-item" key={m.id}>
            {g.kind === "music" ? <audio controls src={m.url} /> : <img src={m.url} alt={g.title} loading="lazy" />}
            <div className="acts">
              {g.kind === "photo" && (
                <>
                  <button type="button" className="b g s" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Dời lên trước">◀</button>
                  <button type="button" className="b g s" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Dời ra sau">▶</button>
                </>
              )}
              <button type="button" className="b d s" onClick={() => remove(m)}>Xóa</button>
            </div>
          </div>
        ))}
      </div>

      <label className={`b g s mm-up ${busy || full ? "off" : ""}`}>
        {busy ? "Đang tải lên..." : g.multi ? (full ? "Đã đủ số lượng" : "+ Thêm file") : items.length ? "Thay file" : "+ Tải lên"}
        <input type="file" hidden accept={g.accept} multiple={g.multi} disabled={busy || full} onChange={pick} />
      </label>
      {error && <p className="err" role="alert">{error}</p>}
    </div>
  );
}