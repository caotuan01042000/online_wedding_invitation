"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import Modal from "@/components/admin/Modal";
import Field from "@/components/admin/Field";

interface T {
  id: string;
  code: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  config: Record<string, unknown>;
  is_active: boolean;
}

const msg = (e: unknown) => (e instanceof Error ? e.message : "Có lỗi xảy ra");

const DEFAULT_CONFIG = {
  theme: { bg: "#FFF8F9", card: "#FFFFFF", txt: "#3B1F2B", acc: "#B83A63", dim: "#9A7A86" },
  sections: { album: true, countdown: true, map: true, schedule: true, dresscode: true, guestbook: true, gifts: true },
};

export default function TemplatesPage() {
  const [items, setItems] = useState<T[] | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [modal, setModal] = useState<null | "create" | T>(null);

  useEffect(() => {
    let stale = false;
    api<{ items: T[] }>("/api/admin/templates")
      .then((d) => { if (!stale) { setItems(d.items); setError(""); } })
      .catch((e) => { if (!stale) setError(msg(e)); });
    return () => { stale = true; };
  }, [reload]);

  const run = async (fn: () => Promise<unknown>) => {
    setError("");
    try { await fn(); setReload((n) => n + 1); } catch (e) { setError(msg(e)); }
  };
  const toggle = (t: T) => run(() => api(`/api/admin/templates/${t.id}`, { method: "PATCH", body: JSON.stringify({ is_active: !t.is_active }) }));
  const remove = (t: T) => { if (confirm(`Xóa mẫu "${t.name}"?`)) run(() => api(`/api/admin/templates/${t.id}`, { method: "DELETE" })); };

  return (
    <>
      <h1>Mẫu thiệp</h1>
      <div className="bar"><button className="b" onClick={() => setModal("create")}>+ Thêm mẫu</button></div>
      {error && <p className="err" role="alert">{error}</p>}
      {!items && !error && <p>Đang tải...</p>}

      <div className="grid">
        {items?.map((t) => (
          <div className="card" key={t.id}>
            <h3>{t.name}</h3>
            <p>Mã: <code>{t.code}</code> · <span className={`tag ${t.is_active ? "" : "off"}`}>{t.is_active ? "Đang bật" : "Đã tắt"}</span></p>
            <p>{t.description || "Chưa có mô tả"}</p>
            <div className="acts">
              <button className="b g s" onClick={() => setModal(t)}>Sửa</button>
              <button className="b g s" onClick={() => toggle(t)}>{t.is_active ? "Tắt" : "Bật"}</button>
              <button className="b d s" onClick={() => remove(t)}>Xóa</button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal title={modal === "create" ? "Thêm mẫu thiệp" : `Sửa mẫu: ${modal.name}`} onClose={() => setModal(null)}>
          <TemplateForm initial={modal === "create" ? null : modal} onClose={() => setModal(null)} onDone={() => { setModal(null); setReload((n) => n + 1); }} />
        </Modal>
      )}
    </>
  );
}

function TemplateForm({ initial, onClose, onDone }: { initial: T | null; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({
    code: initial?.code ?? "",
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    thumbnail_url: initial?.thumbnail_url ?? "",
    is_active: initial?.is_active ?? true,
    config: JSON.stringify(initial?.config ?? DEFAULT_CONFIG, null, 2),
  });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: "code" | "name" | "description" | "thumbnail_url" | "config") =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    setError(""); setFields({});

    let config: unknown;
    try {
      config = JSON.parse(f.config);
      if (typeof config !== "object" || config === null || Array.isArray(config)) throw new Error();
    } catch {
      setFields({ config: "Config phải là JSON object hợp lệ" });
      return;
    }

    setBusy(true);
    try {
      const common = { name: f.name, description: f.description, thumbnail_url: f.thumbnail_url, is_active: f.is_active, config };
      if (initial) {
        await api(`/api/admin/templates/${initial.id}`, { method: "PATCH", body: JSON.stringify(common) }); // code is immutable
      } else {
        await api("/api/admin/templates", { method: "POST", body: JSON.stringify({ code: f.code, ...common }) });
      }
      onDone();
    } catch (e) {
      if (e instanceof ApiError) setFields(e.fields ?? {});
      setError(msg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <Field label="Mã (phải trùng key trong registry của frontend)" error={fields.code}>
        <input value={f.code} onChange={set("code")} disabled={!!initial} placeholder="rose" />
      </Field>
      <Field label="Tên mẫu" error={fields.name}><input value={f.name} onChange={set("name")} /></Field>
      <Field label="Mô tả" error={fields.description}><input value={f.description} onChange={set("description")} /></Field>
      <Field label="Ảnh đại diện (URL)" error={fields.thumbnail_url}><input value={f.thumbnail_url} onChange={set("thumbnail_url")} /></Field>
      <Field label="Config mặc định (JSON)" error={fields.config}>
        <textarea className="code" rows={10} value={f.config} onChange={set("config")} spellCheck={false} />
      </Field>
      <label className="fd"><input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} /> Đang bật</label>
      {error && <p className="err" role="alert">{error}</p>}
      <div className="row">
        <button type="button" className="b g" onClick={onClose}>Hủy</button>
        <button className="b" disabled={busy}>{busy ? "Đang lưu..." : "Lưu"}</button>
      </div>
    </form>
  );
}