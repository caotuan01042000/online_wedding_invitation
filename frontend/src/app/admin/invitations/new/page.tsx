"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import Field from "@/components/admin/Field";

interface Tpl { id: string; code: string; name: string }

interface WeddingImage {
  id: string;
  file: File;
  preview: string;
}

const newPerson = () => ({ short_name: "", full_name: "", rank: "", father: "", mother: "", address: "" });
type PersonState = ReturnType<typeof newPerson>;
type Errors = Record<string, string>;

const msg = (e: unknown) => (e instanceof Error ? e.message : "Có lỗi xảy ra");
const slugify = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
// datetime-local gives "2027-01-17T10:00" (no timezone): treat it as Vietnam time.
const toISO = (v: string) => (v ? `${v}:00+07:00` : null);

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

export default function NewInvitationPage() {
  const [tpls, setTpls] = useState<Tpl[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [slug, setSlug] = useState("");
  const [groom, setGroom] = useState(newPerson());
  const [bride, setBride] = useState(newPerson());
  const [ev, setEv] = useState({
    ceremony_at: "", ceremony_place: "Lễ thành hôn được cử hành tại tư gia", party_at: "",
    venue_name: "", venue_address: "", lunar_text: "", dress_code: "",
  });
  const [schedule, setSchedule] = useState([{ time: "11:00", title: "Đón khách" }, { time: "11:30", title: "Khai tiệc" }]);
  const [gifts, setGifts] = useState([{ side: "groom", bank: "", account_no: "", account_name: "" }]);
  const [fields, setFields] = useState<Errors>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ id: string; slug: string } | null>(null);

  const [weddingImages, setWeddingImages] = useState<WeddingImage[]>([]);

  const handleWeddingImages = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || []);

    const newImages: WeddingImage[] = files
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
      }));

    setWeddingImages((prev) => [...prev, ...newImages]);

    e.target.value = "";
  };

  const removeWeddingImage = (id: string) => {
    setWeddingImages((prev) => {
      const image = prev.find((item) => item.id === id);

      if (image) {
        URL.revokeObjectURL(image.preview);
      }

      return prev.filter((item) => item.id !== id);
    });
  };

  useEffect(() => {
    api<{ items: Tpl[] }>("/api/admin/templates?is_active=true")
      .then((d) => { setTpls(d.items); setTemplateId(d.items[0]?.id ?? ""); })
      .catch((e) => setError(msg(e)));
  }, []);

  const autoSlug = [slugify(groom.short_name), slugify(bride.short_name)].filter(Boolean).join("-");
  const setE = (k: keyof typeof ev) => (e: React.ChangeEvent<HTMLInputElement>) => setEv({ ...ev, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!ev.ceremony_at) { setFields({ "event.ceremony_at": "bắt buộc" }); return; }
    setFields({});
    setBusy(true);
    try {
      const body = {
        template_id: templateId,
        slug: slug.trim() || autoSlug,
        groom, bride,
        event: {
          ...ev,
          ceremony_at: toISO(ev.ceremony_at),
          party_at: toISO(ev.party_at),
          map_url: "", dress_colors: [], closing_message: "",
        },
        schedule: schedule.filter((s) => s.time || s.title),
        gifts: gifts.filter((g) => g.bank || g.account_no || g.account_name),
      };
      setCreated(await api<{ id: string; slug: string }>("/api/admin/invitations", { method: "POST", body: JSON.stringify(body) }));
    } catch (ex) {
      if (ex instanceof ApiError) {
        const f = ex.fields ?? {};
        if (ex.status === 409) f.slug = ex.message;
        setFields(f);
      }
      setError(msg(ex));
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <>
        <h1>Đã tạo thiệp</h1>
        <div className="card">
          <h3>{groom.short_name} &amp; {bride.short_name}</h3>
          <p>Thiệp đã được lưu (bản nháp). Bấm &quot;Xem thiệp&quot; để mở ở tab mới.</p>
          <div className="acts">
            <a className="b" href={`/preview/${created.id}`} target="_blank" rel="noreferrer">Xem thiệp</a>
            <Link className="b g" href="/admin/invitations">Về danh sách</Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <h1>Tạo thiệp cưới</h1>
      <form onSubmit={submit} noValidate>
        <div className="card sec">
          <h3>1. Mẫu thiệp</h3>
          <Field label="Chọn mẫu" error={fields.template_id}>
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              {tpls.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.code})</option>)}
            </select>
          </Field>
          <Field label="Đường dẫn (slug), để trống sẽ tự tạo từ hai tên" error={fields.slug}>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={autoSlug || "minh-tuan-ngoc-anh"} />
          </Field>
        </div>

        <div className="card sec"><h3>2. Chú rể</h3><PersonFields prefix="groom" v={groom} set={setGroom} errors={fields} /></div>
        <div className="card sec"><h3>3. Cô dâu</h3><PersonFields prefix="bride" v={bride} set={setBride} errors={fields} /></div>

        <div className="card sec">
          <h3>4. Sự kiện</h3>
          <div className="two">
            <Field label="Giờ làm lễ thành hôn" error={fields["event.ceremony_at"]}><input type="datetime-local" value={ev.ceremony_at} onChange={setE("ceremony_at")} /></Field>
            <Field label="Giờ khai tiệc" error={fields["event.party_at"]}><input type="datetime-local" value={ev.party_at} onChange={setE("party_at")} /></Field>
            <Field label="Nơi làm lễ" error={fields["event.ceremony_place"]}><input value={ev.ceremony_place} onChange={setE("ceremony_place")} /></Field>
            <Field label="Ngày âm lịch" error={fields["event.lunar_text"]}><input value={ev.lunar_text} onChange={setE("lunar_text")} placeholder="Tức ngày 9 tháng 12 năm Bính Ngọ" /></Field>
            <Field label="Tên nhà hàng" error={fields["event.venue_name"]}><input value={ev.venue_name} onChange={setE("venue_name")} /></Field>
            <Field label="Địa chỉ nhà hàng" error={fields["event.venue_address"]}><input value={ev.venue_address} onChange={setE("venue_address")} /></Field>
            <Field label="Trang phục (dress code)" error={fields["event.dress_code"]}><input value={ev.dress_code} onChange={setE("dress_code")} /></Field>
          </div>
        </div>

        <div className="card sec">
          {/* Upload nhiều ảnh cưới */}
          <div className="wedding-upload">
            <h3>5. Ảnh cưới</h3>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleWeddingImages}
            />

            <div className="wedding-preview">
              {weddingImages.map((image, index) => (
                <div className="wedding-preview-item" key={image.id}>
                  <img src={image.preview} alt={`Ảnh cưới ${index + 1}`} />

                  <button
                    type="button"
                    onClick={() => removeWeddingImage(image.id)}
                  >
                    Xóa
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card sec">
          <h3>6. Lịch trình</h3>
          {fields.schedule && <span className="fe">{fields.schedule}</span>}
          {schedule.map((s, i) => (
            <div className="rowi" key={i}>
              <input type="time" value={s.time} onChange={(e) => setSchedule(schedule.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)))} />
              <input value={s.title} placeholder="Nội dung" onChange={(e) => setSchedule(schedule.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
              <button type="button" className="b d s" onClick={() => setSchedule(schedule.filter((_, j) => j !== i))}>Xóa</button>
            </div>
          ))}
          <button type="button" className="b g s" onClick={() => setSchedule([...schedule, { time: "", title: "" }])}>+ Thêm dòng</button>
        </div>

        <div className="card sec">
          <h3>7. Quà mừng (không bắt buộc)</h3>
          {fields.gifts && <span className="fe">{fields.gifts}</span>}
          {gifts.map((g, i) => {
            const up = (k: keyof typeof g) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
              setGifts(gifts.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)));
            return (
              <div className="rowg" key={i}>
                <select value={g.side} onChange={up("side")}><option value="groom">Chú rể</option><option value="bride">Cô dâu</option></select>
                <input value={g.bank} placeholder="Ngân hàng" onChange={up("bank")} />
                <input value={g.account_no} placeholder="Số tài khoản" onChange={up("account_no")} />
                <input value={g.account_name} placeholder="Tên chủ tài khoản" onChange={up("account_name")} />
                <button type="button" className="b d s" onClick={() => setGifts(gifts.filter((_, j) => j !== i))}>Xóa</button>
              </div>
            );
          })}
          <button type="button" className="b g s" onClick={() => setGifts([...gifts, { side: "bride", bank: "", account_no: "", account_name: "" }])}>+ Thêm tài khoản</button>
        </div>

        {error && <p className="err" role="alert">{error}</p>}
        <div className="acts">
          <Link className="b g" href="/admin/invitations">Hủy</Link>
          <button className="b" disabled={busy || !templateId}>{busy ? "Đang lưu..." : "Lưu và tạo thiệp"}</button>
        </div>
      </form>
    </>
  );
}