"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ApiError } from "@/lib/api";
import Field from "@/components/admin/Field";
import type { MediaItem } from "@/components/admin/MediaManager";

export interface Tpl { id: string; code: string; name: string; is_active?: boolean }

const blankPerson = () => ({ short_name: "", full_name: "", rank: "", father: "", mother: "", address: "" });
type PersonState = ReturnType<typeof blankPerson>;
type Errors = Record<string, string>;

export interface FormState {
  template_id: string;
  slug: string;
  title: string;
  groom: PersonState;
  bride: PersonState;
  event: {
    ceremony_at: string; party_at: string; ceremony_place: string; venue_name: string; venue_address: string;
    map_url: string; lunar_text: string; dress_code: string; closing_message: string;
  };
  schedule: { time: string; title: string }[];
  gifts: { side: string; bank: string; account_no: string; account_name: string; qr_media_id: string | null }[];
  // Values this form has no inputs for. They are sent back unchanged so saving never wipes them.
  keep: { user_id: string; settings: Record<string, unknown>; dress_colors: string[] };
}

export const emptyForm = (templateId: string): FormState => ({
  template_id: templateId,
  slug: "",
  title: "",
  groom: blankPerson(),
  bride: blankPerson(),
  event: {
    ceremony_at: "", party_at: "", ceremony_place: "Lễ thành hôn được cử hành tại tư gia", venue_name: "", venue_address: "",
    map_url: "", lunar_text: "", dress_code: "", closing_message: "",
  },
  schedule: [{ time: "11:00", title: "Đón khách" }, { time: "11:30", title: "Khai tiệc" }],
  gifts: [{ side: "groom", bank: "", account_no: "", account_name: "", qr_media_id: null }],
  keep: { user_id: "", settings: {}, dress_colors: [] },
});

// Shape of GET /api/admin/invitations/{id}.
export interface Detail {
  id: string;
  status: string;
  user_id: string;
  template_id: string;
  slug: string;
  title: string;
  settings: Record<string, unknown>;
  groom: PersonState;
  bride: PersonState;
  event: {
    ceremony_at: string; ceremony_place: string; party_at: string | null; venue_name: string; venue_address: string;
    map_url: string; lunar_text: string; dress_code: string; dress_colors: string[]; closing_message: string;
  };
  schedule: { time: string; title: string }[];
  gifts: { side: string; bank: string; account_no: string; account_name: string; qr_media_id: string | null }[];
}

// The API returns Vietnam time ("2027-01-17T10:00:00+07:00"); datetime-local wants "2027-01-17T10:00".
const toLocal = (iso: string | null) => (iso ? iso.slice(0, 16) : "");
// datetime-local gives no timezone: treat it as Vietnam time.
const toISO = (v: string) => (v ? `${v}:00+07:00` : null);

export function fromDetail(d: Detail): FormState {
  const e = d.event;
  return {
    template_id: d.template_id,
    slug: d.slug,
    title: d.title,
    groom: d.groom,
    bride: d.bride,
    event: {
      ceremony_at: toLocal(e.ceremony_at), party_at: toLocal(e.party_at), ceremony_place: e.ceremony_place,
      venue_name: e.venue_name, venue_address: e.venue_address, map_url: e.map_url, lunar_text: e.lunar_text,
      dress_code: e.dress_code, closing_message: e.closing_message,
    },
    schedule: d.schedule,
    gifts: d.gifts,
    keep: { user_id: d.user_id, settings: d.settings ?? {}, dress_colors: e.dress_colors ?? [] },
  };
}

const msg = (e: unknown) => (e instanceof Error ? e.message : "Có lỗi xảy ra");
const slugify = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function PersonFields({ prefix, v, set, errors }: { prefix: string; v: PersonState; set: (p: PersonState) => void; errors: Errors }) {
  const on = (k: keyof PersonState) => (e: React.ChangeEvent<HTMLInputElement>) => set({ ...v, [k]: e.target.value });
  return (
    <div className="two">
      <Field label="Tên gọi (hiện trên bìa)" error={errors[`${prefix}.short_name`]}><input value={v.short_name} onChange={on("short_name")} /></Field>
      <Field label="Họ tên đầy đủ" error={errors[`${prefix}.full_name`]}><input value={v.full_name} onChange={on("full_name")} /></Field>
      <Field label="Thứ bậc (Trưởng nam, Út nữ...)" error={errors[`${prefix}.rank`]}><input value={v.rank} onChange={on("rank")} /></Field>
      <Field label="Địa chỉ gia đình" error={errors[`${prefix}.address`]}><input value={v.address} onChange={on("address")} /></Field>
      <Field label="Tên bố" error={errors[`${prefix}.father`]}><input value={v.father} onChange={on("father")} /></Field>
      <Field label="Tên mẹ" error={errors[`${prefix}.mother`]}><input value={v.mother} onChange={on("mother")} /></Field>
    </div>
  );
}

interface Props {
  mode: "create" | "edit";
  templates: Tpl[];
  initial: FormState;
  qrOptions?: MediaItem[]; // uploaded QR images (edit mode only)
  onSubmit: (body: object) => Promise<void>; // throw ApiError to show field errors
}

export default function InvitationForm({ mode, templates, initial, qrOptions = [], onSubmit }: Props) {
  const [f, setF] = useState<FormState>(initial);
  const [fields, setFields] = useState<Errors>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const autoSlug = [slugify(f.groom.short_name), slugify(f.bride.short_name)].filter(Boolean).join("-");
  const setE = (k: keyof FormState["event"]) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, event: { ...f.event, [k]: e.target.value } });

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    setError("");
    setSaved(false);
    if (!f.event.ceremony_at) { setFields({ "event.ceremony_at": "bắt buộc" }); return; }
    setFields({});
    setBusy(true);
    try {
      await onSubmit({
        user_id: f.keep.user_id, // "" on create (server uses the admin), unchanged owner on edit
        template_id: f.template_id,
        slug: f.slug.trim() || autoSlug,
        title: f.title.trim(),
        settings: f.keep.settings,
        groom: f.groom,
        bride: f.bride,
        event: {
          ...f.event,
          ceremony_at: toISO(f.event.ceremony_at),
          party_at: toISO(f.event.party_at),
          dress_colors: f.keep.dress_colors,
        },
        schedule: f.schedule.filter((s) => s.time || s.title),
        gifts: f.gifts
          .filter((g) => g.bank || g.account_no || g.account_name)
          .map((g) => ({ side: g.side, bank: g.bank, account_no: g.account_no, account_name: g.account_name, qr_media_id: g.qr_media_id || null })),
      });
      if (mode === "edit") setSaved(true);
    } catch (ex) {
      if (ex instanceof ApiError) {
        const fe = { ...(ex.fields ?? {}) };
        if (ex.status === 409) fe.slug = ex.message;
        setFields(fe);
      }
      setError(msg(ex));
    } finally {
      setBusy(false);
    }
  };

  const qrUrl = (id: string | null) => qrOptions.find((q) => q.id === id)?.url;

  return (
    <form onSubmit={submit} noValidate>
      <div className="card sec">
        <h3>1. Mẫu thiệp</h3>
        <Field label="Chọn mẫu" error={fields.template_id}>
          <select value={f.template_id} onChange={(e) => setF({ ...f, template_id: e.target.value })}>
            {templates.map((t) => (
              <option key={t.id} value={t.id} disabled={t.is_active === false && t.id !== initial.template_id}>
                {t.name} ({t.code}){t.is_active === false ? " - đã tắt" : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Đường dẫn (slug), để trống sẽ tự tạo từ hai tên" error={fields.slug}>
          <input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} placeholder={autoSlug || "minh-tuan-ngoc-anh"} />
        </Field>
        {mode === "edit" && <p>Đổi slug sẽ làm các link đã gửi cho khách không còn đúng.</p>}
        <Field label="Tiêu đề thiệp (để trống sẽ tự tạo)" error={fields.title}>
          <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </Field>
      </div>

      <div className="card sec"><h3>2. Chú rể</h3><PersonFields prefix="groom" v={f.groom} set={(p) => setF({ ...f, groom: p })} errors={fields} /></div>
      <div className="card sec"><h3>3. Cô dâu</h3><PersonFields prefix="bride" v={f.bride} set={(p) => setF({ ...f, bride: p })} errors={fields} /></div>

      <div className="card sec">
        <h3>4. Sự kiện</h3>
        <div className="two">
          <Field label="Giờ làm lễ thành hôn" error={fields["event.ceremony_at"]}><input type="datetime-local" value={f.event.ceremony_at} onChange={setE("ceremony_at")} /></Field>
          <Field label="Giờ khai tiệc" error={fields["event.party_at"]}><input type="datetime-local" value={f.event.party_at} onChange={setE("party_at")} /></Field>
          <Field label="Nơi làm lễ" error={fields["event.ceremony_place"]}><input value={f.event.ceremony_place} onChange={setE("ceremony_place")} /></Field>
          <Field label="Ngày âm lịch" error={fields["event.lunar_text"]}><input value={f.event.lunar_text} onChange={setE("lunar_text")} placeholder="Tức ngày 9 tháng 12 năm Bính Ngọ" /></Field>
          <Field label="Tên nhà hàng" error={fields["event.venue_name"]}><input value={f.event.venue_name} onChange={setE("venue_name")} /></Field>
          <Field label="Địa chỉ nhà hàng" error={fields["event.venue_address"]}><input value={f.event.venue_address} onChange={setE("venue_address")} /></Field>
          <Field label="Link bản đồ (không bắt buộc)" error={fields["event.map_url"]}><input value={f.event.map_url} onChange={setE("map_url")} /></Field>
          <Field label="Trang phục (dress code)" error={fields["event.dress_code"]}><input value={f.event.dress_code} onChange={setE("dress_code")} /></Field>
          <Field label="Lời cảm ơn cuối thiệp" error={fields["event.closing_message"]}><input value={f.event.closing_message} onChange={setE("closing_message")} /></Field>
        </div>
      </div>

      <div className="card sec">
        <h3>5. Lịch trình</h3>
        {fields.schedule && <span className="fe">{fields.schedule}</span>}
        {f.schedule.map((s, i) => (
          <div className="rowi" key={i}>
            <input type="time" value={s.time} onChange={(e) => setF({ ...f, schedule: f.schedule.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)) })} />
            <input value={s.title} placeholder="Nội dung" onChange={(e) => setF({ ...f, schedule: f.schedule.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
            <button type="button" className="b d s" onClick={() => setF({ ...f, schedule: f.schedule.filter((_, j) => j !== i) })}>Xóa</button>
          </div>
        ))}
        <button type="button" className="b g s" onClick={() => setF({ ...f, schedule: [...f.schedule, { time: "", title: "" }] })}>+ Thêm dòng</button>
      </div>

      <div className="card sec">
        <h3>6. Quà mừng (không bắt buộc)</h3>
        {fields.gifts && <span className="fe">{fields.gifts}</span>}
        {f.gifts.map((g, i) => {
          const up = (k: "side" | "bank" | "account_no" | "account_name") => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
            setF({ ...f, gifts: f.gifts.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)) });
          const url = qrUrl(g.qr_media_id);
          return (
            <div key={i}>
              <div className="rowg">
                <select value={g.side} onChange={up("side")}><option value="groom">Chú rể</option><option value="bride">Cô dâu</option></select>
                <input value={g.bank} placeholder="Ngân hàng" onChange={up("bank")} />
                <input value={g.account_no} placeholder="Số tài khoản" onChange={up("account_no")} />
                <input value={g.account_name} placeholder="Tên chủ tài khoản" onChange={up("account_name")} />
                <button type="button" className="b d s" onClick={() => setF({ ...f, gifts: f.gifts.filter((_, j) => j !== i) })}>Xóa</button>
              </div>
              {mode === "edit" && (
                <div className="rowq">
                  <select value={url ? g.qr_media_id ?? "" : ""} onChange={(e) => setF({ ...f, gifts: f.gifts.map((x, j) => (j === i ? { ...x, qr_media_id: e.target.value || null } : x)) })} aria-label="Ảnh QR">
                    <option value="">Không dùng ảnh QR</option>
                    {qrOptions.map((q, n) => <option key={q.id} value={q.id}>Ảnh QR {n + 1}</option>)}
                  </select>
                  {url && <img src={url} alt="QR" />}
                </div>
              )}
            </div>
          );
        })}
        <button type="button" className="b g s" onClick={() => setF({ ...f, gifts: [...f.gifts, { side: "bride", bank: "", account_no: "", account_name: "", qr_media_id: null }] })}>+ Thêm tài khoản</button>
        {mode === "edit" && qrOptions.length === 0 && <p>Muốn gắn ảnh QR: tải ảnh ở mục &quot;Ảnh QR nhận mừng&quot; bên dưới, rồi chọn ở đây.</p>}
      </div>

      {mode === "create" && (
        <div className="card sec">
          <h3>7. Ảnh, nhạc và QR</h3>
          <p>Bấm &quot;Lưu và tạo thiệp&quot; trước, hệ thống sẽ chuyển sang trang sửa thiệp để tải ảnh bìa, album, nhạc nền và ảnh QR.</p>
        </div>
      )}

      {error && <p className="err" role="alert">{error}</p>}
      {saved && <p role="status">Đã lưu thay đổi.</p>}
      <div className="acts">
        <Link className="b g" href="/admin/invitations">{mode === "create" ? "Hủy" : "Về danh sách"}</Link>
        <button className="b" disabled={busy || !f.template_id}>{busy ? "Đang lưu..." : mode === "create" ? "Lưu và tạo thiệp" : "Lưu thay đổi"}</button>
      </div>
    </form>
  );
}