"use client";

import { useEffect, useMemo, useState } from "react";
import { Playfair_Display, Be_Vietnam_Pro } from "next/font/google";
import type { TemplateProps } from "@/types/invitation";
import { toRoseW } from "./adapter";

const serif = Playfair_Display({ subsets: ["vietnamese", "latin"], style: ["normal", "italic"] });
const sans = Be_Vietnam_Pro({ subsets: ["vietnamese", "latin"], weight: ["300", "400", "500"] });

/* ====== SỬA THÔNG TIN THIỆP Ở ĐÂY ====== */
const W = {
  groom: { short: "Minh Tuấn", full: "Nguyễn Minh Tuấn", rank: "Trưởng nam", parents: "Ông Nguyễn Văn A & Bà Trần Thị B", place: "Biên Hòa, Đồng Nai" },
  bride: { short: "Ngọc Anh", full: "Lê Ngọc Anh", rank: "Út nữ", parents: "Ông Lê Văn C & Bà Phạm Thị D", place: "Quận 1, TP. Hồ Chí Minh" },
  date: "2027-01-17T10:00:00+07:00",
  lunar: "Tức ngày 9 tháng 12 năm Bính Ngọ",
  ceremony: "Lễ thành hôn được cử hành tại tư gia",
  ceremonyTime: "10:00",
  partyTime: "11:30",
  venue: "Nhà hàng tiệc cưới Hoa Mẫu Đơn",
  address: "123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
  dress: "Tông hồng phấn, trắng hoặc kem",
  schedule: [
    { t: "11:00", n: "Đón khách" },
    { t: "11:30", n: "Khai tiệc" },
    { t: "11:45", n: "Rót rượu, cắt bánh" },
    { t: "12:00", n: "Phục vụ món chính" },
    { t: "14:00", n: "Kết thúc tiệc" },
  ],
  gifts: [
    { who: "Chú rể", bank: "Vietcombank", no: "0123456789", name: "NGUYEN MINH TUAN", qr: "" },
    { who: "Cô dâu", bank: "Techcombank", no: "9876543210", name: "LE NGOC ANH", qr: "" },
  ],
};

const CSS = `
:root{--blush:#FDEEF2;--rose:#E8668B;--deep:#B83A63;--paper:#FFF8F9;--ink:#3B1F2B}
*{box-sizing:border-box}
.w{background:var(--paper);color:var(--ink);line-height:1.6;overflow-x:hidden}
.w h1,.w h2,.w h3{margin:0;font-weight:400}.w p{margin:0}
.sec{padding:72px 24px;text-align:center}
.sec.tint{background:var(--blush)}
.in{max-width:460px;margin:0 auto}
.ttl{font-size:28px;margin-bottom:28px}
.sm{font-size:14px;font-weight:300}
.rose{color:var(--deep)}
.btn{display:inline-block;border:0;cursor:pointer;border-radius:999px;background:var(--deep);color:#fff;padding:12px 30px;font:inherit;font-size:14px;font-weight:500;text-decoration:none;transition:background .2s}
.btn:hover{background:#9d2f53}
.btn.ghost{background:none;border:1px solid var(--deep);color:var(--deep)}
.btn.ghost:hover{background:var(--deep);color:#fff}
:focus-visible{outline:2px solid var(--deep);outline-offset:2px}
.line{width:56px;height:1px;background:var(--rose);opacity:.5;margin:24px auto}
.cover{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:24px;background:linear-gradient(180deg,var(--blush),var(--paper));transition:opacity .8s,visibility .8s}
.cover.off{opacity:0;visibility:hidden}
.glass{position:relative;width:100%;max-width:360px;text-align:center;padding:72px 28px 48px;border-radius:999px 999px 28px 28px;border:1px solid rgba(232,102,139,.35);background:rgba(255,255,255,.6);backdrop-filter:blur(8px);box-shadow:0 30px 80px -30px rgba(184,58,99,.5)}
.glass h1{font-size:46px;line-height:1.15}
.amp{display:block;font-size:28px;font-style:italic;color:var(--rose)}
.fl{position:absolute;opacity:.75;pointer-events:none}
.sway{animation:sway 7s ease-in-out infinite alternate}
@keyframes sway{to{transform:rotate(8deg)}}
@media (prefers-reduced-motion:reduce){.sway{animation:none}.cover{transition:none}}
.fam{display:grid;gap:20px;grid-template-columns:1fr 1fr;margin-bottom:32px}
.who h3{font-size:30px;margin:6px 0}
.date{display:flex;align-items:center;justify-content:center;gap:18px;margin:14px 0}
.date b{font-size:64px;font-weight:400;line-height:1;color:var(--deep)}
.date span{font-size:13px;line-height:1.5}
.date .bar{width:1px;align-self:stretch;background:var(--rose);opacity:.5}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:560px;margin:0 auto}
.ph{aspect-ratio:3/4;border:0;padding:0;cursor:pointer;border-radius:10px}
.ph:nth-child(3n+2){border-radius:999px 999px 10px 10px}
.lb{position:fixed;inset:0;z-index:60;background:rgba(59,31,43,.88);display:flex;align-items:center;justify-content:center;gap:12px;padding:16px}
.lb .big{width:min(320px,70vw);aspect-ratio:3/4;border-radius:14px}
.lb button{background:none;border:0;color:#fff;font-size:34px;cursor:pointer}
.lb .x{position:absolute;top:12px;right:16px}
.cd{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:0 auto 36px}
.cd div{background:#fff;border-radius:16px;padding:16px 0}
.cd b{display:block;font-size:28px;font-weight:400;color:var(--deep)}
.cd span{font-size:12px;font-weight:300}
.cal{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;font-size:13px;margin:16px 0 24px}
.cal i{font-style:normal;padding:7px 0;border-radius:50%}
.cal .h{font-weight:500;color:var(--deep)}
.cal .on{background:var(--deep);color:#fff}
.tl{list-style:none;margin:0 auto;padding:0 0 0 28px;max-width:320px;text-align:left;border-left:1px solid rgba(232,102,139,.5)}
.tl li{position:relative;padding-bottom:26px}
.tl li:last-child{padding-bottom:0}
.tl li:before{content:"";position:absolute;left:-36px;top:7px;width:14px;height:14px;border-radius:50%;background:var(--paper);border:2px solid var(--rose)}
.tl b{display:block;font-size:20px;font-weight:400;color:var(--deep)}
.card{background:#fff;border-radius:24px;padding:28px;text-align:left;box-shadow:0 20px 60px -30px rgba(184,58,99,.5)}
.card label{display:block;font-size:14px;margin-bottom:16px}
.card input,.card textarea,.card select{width:100%;margin-top:4px;padding:10px 14px;border:1px solid rgba(232,102,139,.35);border-radius:12px;font:inherit;background:#fff}
.seg{display:flex;gap:10px;margin-bottom:16px}
.seg label{flex:1;margin:0;text-align:center;border:1px solid rgba(232,102,139,.35);border-radius:12px;padding:10px 6px;cursor:pointer}
.seg label.on{border-color:var(--deep);background:var(--blush)}
.seg input{position:absolute;opacity:0;width:0}
.wish{background:#fff;border-radius:16px;padding:14px 18px;text-align:left;margin-top:12px}
.wish b{font-weight:500}
.modal{position:fixed;inset:0;z-index:60;background:rgba(59,31,43,.6);display:flex;align-items:center;justify-content:center;padding:20px}
.modal .card{width:100%;max-width:340px;text-align:center}
.qr{width:180px;height:180px;margin:14px auto;border:1px dashed var(--rose);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#9a7a86;padding:12px}
.qr img{width:100%;height:100%}
.foot{padding:48px 24px;text-align:center;background:var(--blush)}
`;

function Flower({ size = 120, className = "", style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  const L = [
    { n: 8, r: 46, w: 26, h: 44, o: 0.35 },
    { n: 7, r: 32, w: 22, h: 36, o: 0.55 },
    { n: 6, r: 18, w: 16, h: 28, o: 0.8 },
  ];
  return (
    <svg width={size} height={size} viewBox="-60 -60 120 120" className={className} style={style} aria-hidden>
      {L.map((l, li) =>
        Array.from({ length: l.n }).map((_, i) => (
          <ellipse key={`${li}-${i}`} cy={-l.r} rx={l.w / 2} ry={l.h / 2} fill={li === 2 ? "#B83A63" : "#E8668B"} opacity={l.o} transform={`rotate(${(360 / l.n) * i + li * 14})`} />
        ))
      )}
      <circle r={6} fill="#B83A63" />
    </svg>
  );
}

const shade = (i: number) => ({ background: `linear-gradient(${150 + i * 25}deg,#FDEEF2,${i % 2 ? "#E8668B" : "#F4A9BE"})` });

export default function RoseTemplate({ data }: TemplateProps) {
  const W = useMemo(() => toRoseW(data), [data]);
  const photos = data.media.photos;
  const N = photos.length || 6; // no photos yet: 6 placeholders
  const cover = data.media.cover_url;
  const phStyle = (i: number) => (photos[i] ? { background: `url(${photos[i].url}) center/cover` } : shade(i));

  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState<number | null>(null);
  const [lb, setLb] = useState<number | null>(null);
  const [gift, setGift] = useState<number | null>(null);
  const [rsvp, setRsvp] = useState({ name: "", attend: "yes", guests: "1" });
  const [rsvpDone, setRsvpDone] = useState(false);
  const [wish, setWish] = useState({ name: "", text: "" });
  const [wishes, setWishes] = useState([
    { name: "Gia đình cô Lan", text: "Chúc hai cháu trăm năm hạnh phúc!" },
    { name: "Bạn thân cô dâu", text: "Chúc hai bạn luôn yêu thương nhau như ngày đầu!" },
  ]);

 const d = useMemo(() => new Date(W.date), [W.date]);

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, d.getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [d]);

  useEffect(() => {
    document.body.style.overflow = open ? "" : "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const s = left === null ? null : Math.floor(left / 1000);
  const cd = [
    ["Ngày", s === null ? "–" : Math.floor(s / 86400)],
    ["Giờ", s === null ? "–" : Math.floor((s % 86400) / 3600)],
    ["Phút", s === null ? "–" : Math.floor((s % 3600) / 60)],
    ["Giây", s === null ? "–" : s % 60],
  ];

  const y = d.getFullYear(), m = d.getMonth();
  const offset = (new Date(y, m, 1).getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const cells = [...Array(offset).fill(0), ...Array.from({ length: days }, (_, i) => i + 1)];

  const fmt = (t: Date) => t.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const place = `${W.venue}, ${W.address}`;
  const calUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Đám cưới ${W.groom.short} & ${W.bride.short}`)}&dates=${fmt(d)}/${fmt(new Date(d.getTime() + 3 * 3600e3))}&location=${encodeURIComponent(place)}`;
  const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place)}`;
  const mapEmbed = `https://maps.google.com/maps?q=${encodeURIComponent(place)}&output=embed`;
  const weekday = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"][d.getDay()];

  const sendWish = () => {
    if (!wish.text.trim()) return;
    // TODO: gọi API backend để lưu lời chúc
    setWishes([{ name: wish.name.trim() || "Khách mời", text: wish.text }, ...wishes]);
    setWish({ name: "", text: "" });
  };
  const sendRsvp = () => {
    if (!rsvp.name.trim()) return;
    // TODO: gọi API backend, ví dụ POST /api/rsvp
    setRsvpDone(true);
  };

  const H = serif.className;

  return (
    <div className={`w ${sans.className}`}>
      <style>{CSS}</style>

      {/* BÌA */}
       <section className={`cover ${open ? "off" : ""}`} aria-hidden={open}
        style={cover ? { background: `linear-gradient(rgba(253,238,242,.6),rgba(255,248,249,.85)), url(${cover}) center/cover` } : undefined}>
        <Flower size={240} className="fl sway" style={{ left: -70, top: -50 }} />
        <Flower size={200} className="fl sway" style={{ right: -60, bottom: -40 }} />
        <div className="glass">
          <p className="sm rose">Thân mời</p>
          <h1 className={H} style={{ marginTop: 16 }}>
            {W.groom.short}
            <span className="amp">&amp;</span>
            {W.bride.short}
          </h1>
          <div className="line" />
          <p className={H} style={{ fontSize: 18 }}>{d.getDate()} tháng {d.getMonth() + 1}, {y}</p>
          <button className="btn" style={{ marginTop: 28 }} onClick={() => setOpen(true)}>Mở thiệp</button>
        </div>
      </section>

      {/* THÔNG TIN LỄ CƯỚI */}
      <section className="sec">
        <div className="in">
          <h2 className={`${H} ttl rose`}>Thông tin lễ cưới</h2>
          <div className="fam sm">
            <div><p>{W.groom.parents}</p><p>{W.groom.place}</p></div>
            <div><p>{W.bride.parents}</p><p>{W.bride.place}</p></div>
          </div>
          <p className="sm rose">Trân trọng báo tin lễ thành hôn của con chúng tôi</p>
          <div className="who" style={{ marginTop: 20 }}>
            <h3 className={H}>{W.groom.full}</h3><p className="sm">{W.groom.rank}</p>
            <p className={`${H} rose`} style={{ fontSize: 26, fontStyle: "italic" }}>&amp;</p>
            <h3 className={H}>{W.bride.full}</h3><p className="sm">{W.bride.rank}</p>
          </div>
          <div className="line" />
          <p className="sm">{W.ceremony}</p>
          <p className="sm">vào lúc <b>{W.ceremonyTime}</b></p>
          <div className={`date ${H}`}>
            <span>{weekday}</span><i className="bar" />
            <b>{String(d.getDate()).padStart(2, "0")}</b><i className="bar" />
            <span>Tháng {d.getMonth() + 1}<br />{y}</span>
          </div>
          <p className="sm">({W.lunar})</p>
        </div>
      </section>

      {/* ALBUM */}
      <section className="sec tint">
        <h2 className={`${H} ttl`}>Album ảnh cưới</h2>
        <div className="grid">
          {Array.from({ length: N }).map((_, i) => (
            <button key={i} className="ph" style={phStyle(i)} onClick={() => setLb(i)} aria-label={`Xem ảnh ${i + 1}`} />
          ))}
        </div>
        <p className="sm" style={{ marginTop: 14 }}>{photos.length === 0 && <span>Chưa có ảnh nào.</span>}</p>
      </section>

      {/* TIỆC CƯỚI + ĐẾM NGƯỢC + LỊCH + XÁC NHẬN */}
      <section className="sec">
        <div className="in">
          <h2 className={`${H} ttl rose`}>Thông tin tiệc cưới</h2>
          <p className="sm">Tiệc cưới sẽ diễn ra vào lúc</p>
          <p className={H} style={{ fontSize: 48, color: "var(--deep)" }}>{W.partyTime}</p>
          <p className="sm">{weekday}, ngày {d.getDate()} tháng {d.getMonth() + 1} năm {y}</p>
          <p className="sm">({W.lunar})</p>

          <h3 className={H} style={{ fontSize: 22, margin: "40px 0 16px" }}>Cùng đếm ngược</h3>
          <div className="cd">{cd.map(([l, v]) => <div key={l}><b className={H}>{String(v).padStart(2, "0")}</b><span>{l}</span></div>)}</div>

          <p className="sm">Tháng {m + 1} / {y}</p>
          <div className="cal">
            {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((t) => <i key={t} className="h">{t}</i>)}
            {cells.map((c, i) => <i key={i} className={c === d.getDate() ? "on" : ""}>{c || ""}</i>)}
          </div>
          <a className="btn ghost" href={calUrl} target="_blank" rel="noreferrer">Thêm vào lịch</a>

          <div className="card" style={{ marginTop: 40 }}>
            <h3 className={H} style={{ fontSize: 22, textAlign: "center", marginBottom: 18 }}>Xác nhận tham dự</h3>
            {rsvpDone ? (
              <p style={{ textAlign: "center" }}>Cảm ơn {rsvp.name}! Gia đình đã nhận được phản hồi của bạn.</p>
            ) : (
              <>
                <label>Họ và tên<input value={rsvp.name} onChange={(e) => setRsvp({ ...rsvp, name: e.target.value })} /></label>
                <div className="seg">
                  {[["yes", "Mình sẽ đến"], ["no", "Rất tiếc, mình bận"]].map(([v, l]) => (
                    <label key={v} className={rsvp.attend === v ? "on" : ""}>
                      <input type="radio" name="at" checked={rsvp.attend === v} onChange={() => setRsvp({ ...rsvp, attend: v })} />{l}
                    </label>
                  ))}
                </div>
                {rsvp.attend === "yes" && (
                  <label>Số người đi cùng
                    <select value={rsvp.guests} onChange={(e) => setRsvp({ ...rsvp, guests: e.target.value })}>
                      {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} người</option>)}
                    </select>
                  </label>
                )}
                <button className="btn" style={{ width: "100%" }} onClick={sendRsvp}>Gửi xác nhận</button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ĐỊA ĐIỂM + DRESS CODE */}
      <section className="sec tint">
        <div className="in">
          <h2 className={`${H} ttl`}>Tiệc cưới sẽ tổ chức tại</h2>
          <p style={{ fontWeight: 500 }}>{W.venue}</p>
          <p className="sm" style={{ marginBottom: 18 }}>{W.address}</p>
          <iframe title="Bản đồ" src={mapEmbed} loading="lazy" style={{ width: "100%", height: 220, border: 0, borderRadius: 16 }} />
          <a className="btn" style={{ marginTop: 18 }} href={mapUrl} target="_blank" rel="noreferrer">Chỉ đường</a>
          <h3 className={H} style={{ fontSize: 22, margin: "48px 0 8px" }}>Trang phục dự tiệc</h3>
          <p className="sm">{W.dress}</p>
        </div>
      </section>

      {/* LỊCH TRÌNH */}
      <section className="sec">
        <h2 className={`${H} ttl`}>Lịch trình ngày cưới</h2>
        <ol className="tl">{W.schedule.map((x) => <li key={x.t}><b className={H}>{x.t}</b>{x.n}</li>)}</ol>
      </section>

      {/* SỔ LƯU BÚT */}
      <section className="sec tint">
        <div className="in">
          <h2 className={`${H} ttl`}>Sổ lưu bút</h2>
          <div className="card">
            <label>Tên của bạn<input value={wish.name} onChange={(e) => setWish({ ...wish, name: e.target.value })} /></label>
            <label>Lời chúc<textarea rows={3} value={wish.text} onChange={(e) => setWish({ ...wish, text: e.target.value })} /></label>
            <button className="btn" style={{ width: "100%" }} onClick={sendWish}>Gửi lời chúc</button>
          </div>
          {wishes.map((x, i) => <div className="wish" key={i}><b>{x.name}</b><p className="sm">{x.text}</p></div>)}
        </div>
      </section>

      {/* QUÀ MỪNG */}
      <section className="sec">
        <h2 className={`${H} ttl`}>Hộp quà mừng</h2>
        <p className="sm" style={{ marginBottom: 20 }}>Chọn người nhận để xem thông tin chuyển khoản</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          {W.gifts.map((g, i) => <button key={g.who} className="btn ghost" onClick={() => setGift(i)}>Mừng {g.who}</button>)}
        </div>
      </section>

      <footer className="foot">
        <Flower size={56} />
        <p className={H} style={{ fontSize: 20, fontStyle: "italic", marginTop: 10 }}>Sự hiện diện của quý khách là niềm vinh hạnh của gia đình chúng tôi</p>
      </footer>

      {lb !== null && (
        <div className="lb" role="dialog" aria-label="Xem ảnh">
          <button className="x" onClick={() => setLb(null)} aria-label="Đóng">✕</button>
          <button onClick={() => setLb((lb + N - 1) % N)} aria-label="Ảnh trước">‹</button>
          <div className="big" style={phStyle(lb)} />
          <button onClick={() => setLb((lb + 1) % N)} aria-label="Ảnh sau">›</button>
        </div>
      )}

      {gift !== null && (
        <div className="modal" onClick={() => setGift(null)}>
          <div className="card" onClick={(e) => e.stopPropagation()}>
            <h3 className={H} style={{ fontSize: 22 }}>{W.gifts[gift].who}</h3>
            <div className="qr">{W.gifts[gift].qr ? <img src={W.gifts[gift].qr} alt="Mã QR" /> : "Điền đường dẫn ảnh QR vào mục qr trong WEDDING.gifts"}</div>
            <p style={{ fontWeight: 500 }}>{W.gifts[gift].bank}</p>
            <p>{W.gifts[gift].no}</p>
            <p className="sm">{W.gifts[gift].name}</p>
            <button className="btn" style={{ marginTop: 18 }} onClick={() => setGift(null)}>Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
}
