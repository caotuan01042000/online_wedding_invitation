"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Noto_Serif, Great_Vibes, Playfair_Display } from "next/font/google";

const serif = Noto_Serif({ subsets: ["vietnamese", "latin"], weight: ["400", "600"], variable: "--f-serif" });
const script = Great_Vibes({ subsets: ["latin", "latin-ext"], weight: "400", variable: "--f-script" });
const alt = Playfair_Display({ subsets: ["vietnamese", "latin"], style: ["italic"], variable: "--f-alt" });

/* ====== ĐỔI MÀU: "pink" (hồng đậm) hoặc "green" (xanh rêu như mẫu) ====== */
const THEMES = {
  pink: { bg: "#4A1B2D", card: "#5F2A41", txt: "#F8DCE2", acc: "#F2B8C6", dim: "#C99AA8", dress: ["#8E2D55", "#D9708F", "#F8D3DD"] },
  green: { bg: "#18281A", card: "#2F4030", txt: "#E8D3A0", acc: "#E8D3A0", dim: "#9A9468", dress: ["#234126", "#4F7052", "#C3E0C8"] },
};
const THEME: keyof typeof THEMES = "pink";

/* ====== SỬA THÔNG TIN THIỆP Ở ĐÂY ====== */
const W = {
  groom: { short: "Minh Tuấn", full: "Nguyễn Minh Tuấn", parents: ["Ông Nguyễn Văn A", "Bà Trần Thị B"], addr: "Số 5, Khu phố 2, TP. Biên Hòa, Đồng Nai" },
  bride: { short: "Ngọc Anh", full: "Lê Ngọc Anh", parents: ["Ông Lê Văn C", "Bà Phạm Thị D"], addr: "Số 8, Đường 3/2, Quận 10, TP. Hồ Chí Minh" },
  date: "2027-01-17T09:00:00+07:00",
  ceremonyPlace: "Lễ thành hôn được cử hành tại tư gia",
  ceremonyTime: "09:00",
  partyTime: "11:30",
  guestTime: "11:00",
  venue: "Nhà hàng tiệc cưới Hoa Mẫu Đơn",
  address: "123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
  dress: "Trang phục dự tiệc",
  schedule: [
    { t: "11:00", n: "Đón khách" },
    { t: "11:30", n: "Khai tiệc" },
    { t: "11:45", n: "Rót rượu, cắt bánh" },
    { t: "12:00", n: "Món chính" },
    { t: "14:00", n: "Kết thúc" },
  ],
  gifts: [
    { who: "Chú rể", bank: "Vietcombank", no: "0123456789", name: "NGUYEN MINH TUAN", qr: "" },
    { who: "Cô dâu", bank: "Techcombank", no: "9876543210", name: "LE NGOC ANH", qr: "" },
  ],
};
const PHOTOS: string[] = []; // ví dụ: ["/anh1.jpg", "/anh2.jpg", ...] (để trong frontend/public)
const HERO_IMG = ""; // ảnh rồng phượng nếu có, ví dụ "/rong-phuong.png"
const MUSIC = ""; // nhạc nền nếu có, ví dụ "/nhac.mp3"

const css = (t: (typeof THEMES)[keyof typeof THEMES]) => `
.pg{background:#F6EEF0;min-height:100vh;font-family:var(--f-serif),serif}
.col{max-width:520px;margin:0 auto;background:var(--bg);color:var(--txt);position:relative;overflow:hidden;box-shadow:0 0 60px rgba(0,0,0,.2)}
.col *{box-sizing:border-box}.col h1,.col h2,.col h3,.col p{margin:0;font-weight:400}
.script{font-family:var(--f-script),var(--f-alt),serif;line-height:1.15}
.up{text-transform:uppercase;letter-spacing:.06em}
.sec{padding:80px 28px;text-align:center;position:relative}
.sec:before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 15% 20%,${t.acc}12 0 70px,transparent 72px),radial-gradient(circle at 88% 70%,${t.acc}0F 0 90px,transparent 92px)}
.sec>*{position:relative}
.h{font-size:22px;margin-bottom:36px}
.sm{font-size:15px;line-height:1.8}
.dim{color:${t.dim}}
.btn{display:inline-block;background:none;border:1px solid var(--acc);color:var(--acc);padding:11px 30px;font:inherit;font-size:14px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;text-decoration:none;border-radius:2px;transition:background .2s,color .2s}
.btn:hover{background:var(--acc);color:var(--bg)}
.lnk{color:var(--txt);text-decoration:underline;text-underline-offset:5px;font-size:17px}
:focus-visible{outline:2px solid var(--acc);outline-offset:3px}
.cover{position:fixed;inset:0;z-index:50;background:var(--bg);color:var(--txt);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;transition:opacity .9s,visibility .9s}
.cover.off{opacity:0;visibility:hidden}
.cover:before{content:"";position:absolute;inset:0;opacity:.09;background:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='90' height='90'><text x='45' y='62' font-size='46' text-anchor='middle' fill='${t.acc.replace("#", "%23")}'>囍</text></svg>")}
.cover>*{position:relative}
.cover h1{font-size:clamp(52px,16vw,84px)}
.hero{min-height:760px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px 40px;position:relative}
.hero h1{font-size:clamp(56px,17vw,88px);position:relative;z-index:1}
.hero .amp{font-size:48px;margin:18px 0;position:relative;z-index:1}
.cjk{position:absolute;font-size:340px;line-height:1;opacity:.09;color:var(--acc);font-family:"Noto Serif TC","SimSun","MS Mincho",serif;pointer-events:none}
.hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;opacity:.18}
.cf{position:relative;height:430px;perspective:1100px;margin:0 auto}
.cf .s{position:absolute;left:50%;top:10px;width:230px;height:380px;margin-left:-115px;border-radius:18px;border:1px solid ${t.acc}55;background-size:cover;background-position:center;transition:transform .6s,opacity .6s;cursor:pointer;box-shadow:0 20px 40px -20px rgba(0,0,0,.6)}
.cf .nv{position:absolute;top:50%;z-index:20;width:40px;height:40px;margin-top:-20px;border-radius:50%;border:0;background:rgba(0,0,0,.45);color:var(--txt);font-size:22px;cursor:pointer}
.dots{display:flex;gap:10px;justify-content:center;margin-top:8px}
.dots button{width:10px;height:10px;border-radius:99px;border:0;padding:0;background:${t.acc}55;cursor:pointer;transition:width .3s}
.dots button.on{width:30px;background:var(--acc)}
.pr{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:56px}
.pr p{font-size:19px;line-height:2;letter-spacing:.04em}
.pr small{display:block;font-size:15px;line-height:1.6;margin-top:10px}
.tag{font-size:13px;letter-spacing:.35em;text-transform:uppercase;margin-top:14px}
.dr{display:flex;align-items:center;justify-content:center;gap:22px;margin:28px 0 22px}
.dr b{font-size:56px;font-weight:400;line-height:1}
.dr span{font-size:18px;letter-spacing:.04em;text-transform:uppercase}
.dr i{width:2px;height:48px;background:var(--acc)}
.tm{font-size:46px;line-height:1.2;margin:22px 0}
.two{display:flex;gap:44px;justify-content:center;margin:36px 0}
.two small{display:block;font-size:14px;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px}
.two b{font-size:30px;font-weight:400}
.cd{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:0 0 40px}
.cd div{border:1px solid ${t.acc}55;border-radius:6px;padding:14px 0}
.cd b{display:block;font-size:28px;font-weight:400}
.cd span{font-size:12px;letter-spacing:.1em;text-transform:uppercase}
.cal{border:1px solid ${t.acc}88;border-radius:12px;margin:0 auto 32px;max-width:340px;overflow:hidden}
.cal h3{padding:14px;font-size:17px;font-weight:600;border-bottom:1px solid ${t.acc}55}
.cal .g{display:grid;grid-template-columns:repeat(7,1fr);padding:0 8px 14px}
.cal .w{padding:10px 0;color:${t.dim};font-size:14px;border-bottom:3px solid var(--acc);margin-bottom:10px}
.cal i{font-style:normal;padding:11px 0;position:relative;font-size:16px}
.cal .on:before{content:"♥";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:40px;color:var(--acc)}
.cal u{position:relative;text-decoration:none}
.cal .on u{color:var(--bg);font-weight:600;font-size:14px}
.tl{max-width:340px;margin:0 auto;position:relative}
.tl:before{content:"";position:absolute;left:50%;top:14px;bottom:14px;width:1px;background:var(--acc)}
.tl div{display:grid;grid-template-columns:1fr 24px 1fr;align-items:center;gap:0;padding:17px 0;font-size:19px}
.tl div span:first-child{text-align:right;padding-right:18px}
.tl div i{width:14px;height:14px;border-radius:50%;background:var(--acc);justify-self:center;position:relative}
.tl div span:last-child{text-align:left;padding-left:18px}
.dc{display:flex;gap:30px;justify-content:center;margin-top:24px}
.dc i{width:56px;height:56px;border-radius:50%}
.wish{background:var(--card);border:1px solid ${t.acc}77;border-radius:16px;padding:16px 20px;text-align:left;margin-top:14px}
.wish b{font-weight:600;font-size:16px}.wish p{font-size:15px;margin-top:4px}
.env{display:flex;justify-content:center;gap:0;height:250px;align-items:center;cursor:pointer;background:none;border:0;margin:0 auto;color:inherit}
.env i{display:block;width:104px;height:200px;border-radius:6px;background:linear-gradient(145deg,#F2D9A0,#D9B368);box-shadow:0 14px 30px -10px rgba(0,0,0,.6);position:relative}
.env i:before{content:"";position:absolute;left:0;right:0;top:0;height:60px;background:linear-gradient(145deg,#F7E4B5,#E2C183);clip-path:polygon(0 0,100% 0,50% 100%)}
.env i:nth-child(1){transform:rotate(-16deg) translateX(14px)}
.env i:nth-child(2){transform:rotate(14deg) translateX(-14px) scale(.9)}
.modal{position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:20px}
.box{width:100%;max-width:380px;background:var(--card);color:var(--txt);border:1px solid ${t.acc}77;border-radius:16px;padding:26px;text-align:left}
.box label{display:block;font-size:14px;margin-bottom:14px}
.box input,.box textarea,.box select{width:100%;margin-top:4px;padding:10px 12px;border:1px solid ${t.acc}66;background:rgba(0,0,0,.2);color:var(--txt);border-radius:8px;font:inherit}
.box select option{color:#000}
.seg{display:flex;gap:10px;margin-bottom:14px}
.seg label{flex:1;margin:0;text-align:center;border:1px solid ${t.acc}66;border-radius:8px;padding:9px 4px;cursor:pointer;font-size:14px}
.seg label.on{background:var(--acc);color:var(--bg)}
.seg input{position:absolute;opacity:0;width:0}
.qr{width:190px;height:190px;margin:14px auto;border:1px dashed var(--acc);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:12px;padding:12px;text-align:center}
.qr img{width:100%;height:100%;object-fit:contain;background:#fff}
.mus{position:fixed;right:16px;bottom:16px;z-index:60;width:44px;height:44px;border-radius:50%;border:0;background:var(--acc);color:var(--bg);font-size:20px;cursor:pointer}
@media (prefers-reduced-motion:reduce){.cover,.cf .s,.dots button{transition:none}}
`;

export default function Home() {
  const t = THEMES[THEME];
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState<number | null>(null);
  const [a, setA] = useState(0);
  const [modal, setModal] = useState<null | "rsvp" | "wish" | number>(null);
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const touch = useRef(0);
  const [rsvp, setRsvp] = useState({ name: "", attend: "yes", guests: "1" });
  const [rsvpDone, setRsvpDone] = useState(false);
  const [wish, setWish] = useState({ name: "", text: "" });
  const [wishes, setWishes] = useState([
    { name: "Gia đình cô Lan", text: "Chúc hai cháu trăm năm hạnh phúc!" },
    { name: "Bạn thân cô dâu", text: "Chúc hai bạn luôn yêu thương nhau như ngày đầu!" },
  ]);

  const d = useMemo(() => new Date(W.date), []);
  const N = Math.max(PHOTOS.length, 7);

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

  const openCard = () => {
    setOpen(true);
    if (MUSIC && audio.current) audio.current.play().then(() => setPlaying(true)).catch(() => {});
  };

  const s = left === null ? null : Math.floor(left / 1000);
  const cd = [
    ["Ngày", s === null ? "–" : Math.floor(s / 86400)],
    ["Giờ", s === null ? "–" : Math.floor((s % 86400) / 3600)],
    ["Phút", s === null ? "–" : Math.floor((s % 3600) / 60)],
    ["Giây", s === null ? "–" : s % 60],
  ];

  const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
  const offset = (new Date(y, m, 1).getDay() + 6) % 7;
  const cells = [...Array(offset).fill(0), ...Array.from({ length: new Date(y, m + 1, 0).getDate() }, (_, i) => i + 1)];
  const weekday = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"][d.getDay()];
  const place = `${W.venue}, ${W.address}`;
  const fmt = (x: Date) => x.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const calUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Đám cưới ${W.groom.short} & ${W.bride.short}`)}&dates=${fmt(d)}/${fmt(new Date(d.getTime() + 5 * 3600e3))}&location=${encodeURIComponent(place)}`;
  const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place)}`;
  const mapEmbed = `https://maps.google.com/maps?q=${encodeURIComponent(place)}&output=embed`;

  const slide = (i: number) => {
    let o = i - a;
    if (o > N / 2) o -= N;
    if (o < -N / 2) o += N;
    const ab = Math.abs(o);
    const bg = PHOTOS[i] ? `url(${PHOTOS[i]})` : `linear-gradient(${140 + i * 28}deg,${t.card},${t.acc})`;
    return {
      background: bg,
      backgroundSize: "cover",
      transform: `translateX(${o * 58}%) translateZ(${-ab * 140}px) rotateY(${-o * 36}deg)`,
      opacity: ab > 2 ? 0 : 1 - ab * 0.28,
      zIndex: 10 - ab,
      pointerEvents: ab > 2 ? ("none" as const) : ("auto" as const),
    };
  };

  const DateRow = () => (
    <div className="dr">
      <span>{weekday}</span><i /><b>{String(day).padStart(2, "0")}</b><i /><span>Tháng {m + 1}</span>
    </div>
  );

  const sendWish = () => {
    if (!wish.text.trim()) return;
    // TODO: gọi API backend để lưu lời chúc
    setWishes([{ name: wish.name.trim() || "Khách mời", text: wish.text }, ...wishes]);
    setWish({ name: "", text: "" });
    setModal(null);
  };
  const sendRsvp = () => {
    if (!rsvp.name.trim()) return;
    // TODO: gọi API backend, ví dụ POST /api/rsvp
    setRsvpDone(true);
  };

  const vars = { "--bg": t.bg, "--card": t.card, "--txt": t.txt, "--acc": t.acc } as React.CSSProperties;

  return (
    <div className={`pg ${serif.variable} ${script.variable} ${alt.variable}`} style={vars}>
      <style>{css(t)}</style>
      {MUSIC && <audio ref={audio} src={MUSIC} loop />}

      {/* BÌA */}
      <section className={`cover ${open ? "off" : ""}`} aria-hidden={open}>
        <p className="up" style={{ fontSize: 14, color: t.dim }}>Trân trọng kính mời</p>
        <h1 className="script" style={{ margin: "20px 0 4px" }}>{W.groom.short}</h1>
        <p className="script" style={{ fontSize: 40 }}>&amp;</p>
        <h1 className="script" style={{ margin: "4px 0 20px" }}>{W.bride.short}</h1>
        <p style={{ fontSize: 22, color: t.acc }}>❦</p>
        <p style={{ margin: "10px 0 34px", letterSpacing: ".1em" }}>{day} tháng {m + 1}, {y}</p>
        <button className="btn" onClick={openCard}>Mở thiệp</button>
      </section>

      <main className="col">
        {/* TÊN + RỒNG PHƯỢNG */}
        <section className="hero">
          {HERO_IMG ? <img src={HERO_IMG} alt="" /> : (<><span className="cjk" style={{ left: -30, top: 90 }} aria-hidden>龍</span><span className="cjk" style={{ right: -30, top: 150 }} aria-hidden>鳳</span></>)}
          <h1 className="script">{W.groom.short}</h1>
          <p className="script amp">&amp;</p>
          <h1 className="script">{W.bride.short}</h1>
        </section>

        {/* ALBUM 3D */}
        <section className="sec" style={{ paddingTop: 20 }}>
          <h2 className="h up">Album ảnh cưới</h2>
          <div className="cf" onTouchStart={(e) => (touch.current = e.touches[0].clientX)} onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 40) setA((a + (dx < 0 ? 1 : N - 1)) % N); }}>
            <button className="nv" style={{ left: 8 }} onClick={() => setA((a + N - 1) % N)} aria-label="Ảnh trước">‹</button>
            {Array.from({ length: N }).map((_, i) => <div key={i} className="s" style={slide(i)} onClick={() => setA(i)} role="img" aria-label={`Ảnh cưới ${i + 1}`} />)}
            <button className="nv" style={{ right: 8 }} onClick={() => setA((a + 1) % N)} aria-label="Ảnh sau">›</button>
          </div>
          <div className="dots">{Array.from({ length: N }).map((_, i) => <button key={i} className={i === a ? "on" : ""} onClick={() => setA(i)} aria-label={`Đến ảnh ${i + 1}`} />)}</div>
        </section>

        {/* THÔNG TIN LỄ CƯỚI */}
        <section className="sec">
          <h2 className="h up">Thông tin lễ cưới</h2>
          <div className="pr">
            {[W.groom, W.bride].map((p) => (
              <div key={p.full}>
                <p className="dim up" style={{ fontSize: 15 }}>Ông bà</p>
                {p.parents.map((x) => <p key={x}>{x.replace(/^(Ông|Bà) /, "")}</p>)}
                <small>{p.addr}</small>
              </div>
            ))}
          </div>
          <p className="up" style={{ fontSize: 19, lineHeight: 1.9, fontWeight: 600 }}>Trân trọng báo tin<br />lễ thành hôn của con chúng tôi</p>
          <h3 className="script" style={{ fontSize: "clamp(44px,12vw,62px)", margin: "56px 0 0" }}>{W.groom.full}</h3>
          <p className="tag">Chú rể</p>
          <p className="script" style={{ fontSize: 50, margin: "26px 0" }}>&amp;</p>
          <h3 className="script" style={{ fontSize: "clamp(44px,12vw,62px)" }}>{W.bride.full}</h3>
          <p className="tag">Cô dâu</p>
          <p className="up" style={{ fontSize: 20, lineHeight: 1.9, margin: "64px 0 12px" }}>{W.ceremonyPlace}</p>
          <p className="up" style={{ fontSize: 17 }}>vào lúc</p>
          <p className="tm">{W.ceremonyTime}</p>
          <DateRow />
          <p style={{ fontSize: 24 }}>{y}</p>
        </section>

        {/* THÔNG TIN TIỆC CƯỚI */}
        <section className="sec">
          <h2 className="h up">Thông tin tiệc cưới</h2>
          <p className="up" style={{ fontSize: 21, marginBottom: 18 }}>Tiệc cưới sẽ diễn ra vào lúc:</p>
          <p className="tm" style={{ margin: "0 0 6px" }}>{W.partyTime}</p>
          <DateRow />
          <p style={{ fontSize: 24 }}>{y}</p>
          <div className="two">
            <div><small>Đón khách</small><b>{W.guestTime}</b></div>
            <div><small>Khai tiệc</small><b>{W.partyTime}</b></div>
          </div>

          <h3 className="up" style={{ fontSize: 20, margin: "56px 0 18px" }}>Cùng đếm ngược</h3>
          <div className="cd">{cd.map(([l, v]) => <div key={l}><b>{String(v).padStart(2, "0")}</b><span>{l}</span></div>)}</div>

          <div className="cal">
            <h3>Tháng {m + 1} / {y}</h3>
            <div className="g">
              {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((x) => <div key={x} className="w">{x}</div>)}
              {cells.map((c, i) => <i key={i} className={c === day ? "on" : ""}><u>{c || ""}</u></i>)}
            </div>
          </div>
          <a className="lnk" href={calUrl} target="_blank" rel="noreferrer">Thêm vào lịch</a>
          <div style={{ marginTop: 44 }}><button className="btn" onClick={() => setModal("rsvp")}>Xác nhận tham dự</button></div>
        </section>

        {/* ĐỊA ĐIỂM */}
        <section className="sec">
          <h2 className="h up">Địa điểm tổ chức tiệc</h2>
          <p style={{ fontSize: 18 }}>{W.venue}</p>
          <p className="sm dim" style={{ marginBottom: 20 }}>{W.address}</p>
          <iframe title="Bản đồ" src={mapEmbed} loading="lazy" style={{ width: "100%", height: 230, border: 0, borderRadius: 12, filter: "grayscale(.3)" }} />
          <div style={{ marginTop: 22 }}><a className="btn" href={mapUrl} target="_blank" rel="noreferrer">Chỉ đường</a></div>
        </section>

        {/* DRESS CODE + LỊCH TRÌNH */}
        <section className="sec">
          <h2 className="h up" style={{ marginBottom: 8 }}>Dress code</h2>
          <p className="dim">{W.dress}</p>
          <div className="dc">{t.dress.map((c) => <i key={c} style={{ background: c }} />)}</div>
          <h2 className="h up" style={{ margin: "90px 0 24px" }}>Lịch trình ngày cưới</h2>
          <div className="tl">{W.schedule.map((x) => <div key={x.t}><span>{x.t}</span><i /><span>{x.n}</span></div>)}</div>
        </section>

        {/* LƯU BÚT */}
        <section className="sec">
          <h2 className="h up">Sổ lưu bút</h2>
          <button className="btn" onClick={() => setModal("wish")}>🪄 Gửi lời chúc</button>
          <div style={{ marginTop: 18 }}>{wishes.map((x, i) => <div className="wish" key={i}><b>{x.name}</b><p>{x.text}</p></div>)}</div>
        </section>

        {/* HỘP QUÀ */}
        <section className="sec">
          <h2 className="h up">Hộp quà mừng</h2>
          <button className="env" onClick={() => setModal(0)} aria-label="Mở hộp quà mừng"><i /><i /></button>
          <p className="dim" style={{ marginTop: 8, fontSize: 15 }}>Chạm để mở</p>
          <p style={{ fontSize: 22, margin: "90px 0 10px", lineHeight: 1.6 }}>Sự hiện diện của quý khách là món quà quý giá nhất của chúng tôi!</p>
        </section>
      </main>

      {MUSIC && open && (
        <button className="mus" aria-label={playing ? "Tắt nhạc" : "Bật nhạc"} onClick={() => { const el = audio.current; if (!el) return; if (playing) { el.pause(); setPlaying(false); } else { el.play(); setPlaying(true); } }}>{playing ? "♪" : "▶"}</button>
      )}

      {/* MODAL */}
      {modal !== null && (
        <div className="modal" onClick={() => setModal(null)}>
          <div className="box" onClick={(e) => e.stopPropagation()} style={{ textAlign: typeof modal === "number" ? "center" : "left" }}>
            {modal === "rsvp" && (rsvpDone ? (
              <>
                <p style={{ textAlign: "center" }}>Cảm ơn {rsvp.name}! Gia đình đã nhận được phản hồi của bạn.</p>
                <div style={{ textAlign: "center", marginTop: 18 }}><button className="btn" onClick={() => setModal(null)}>Đóng</button></div>
              </>
            ) : (
              <>
                <h3 className="up" style={{ textAlign: "center", marginBottom: 18, fontSize: 18 }}>Xác nhận tham dự</h3>
                <label>Họ và tên<input value={rsvp.name} onChange={(e) => setRsvp({ ...rsvp, name: e.target.value })} /></label>
                <div className="seg">
                  {[["yes", "Mình sẽ đến"], ["no", "Rất tiếc, mình bận"]].map(([v, l]) => (
                    <label key={v} className={rsvp.attend === v ? "on" : ""}><input type="radio" name="at" checked={rsvp.attend === v} onChange={() => setRsvp({ ...rsvp, attend: v })} />{l}</label>
                  ))}
                </div>
                {rsvp.attend === "yes" && (
                  <label>Số người đi cùng
                    <select value={rsvp.guests} onChange={(e) => setRsvp({ ...rsvp, guests: e.target.value })}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} người</option>)}</select>
                  </label>
                )}
                <div style={{ textAlign: "center" }}><button className="btn" onClick={sendRsvp}>Gửi xác nhận</button></div>
              </>
            ))}
            {modal === "wish" && (
              <>
                <h3 className="up" style={{ textAlign: "center", marginBottom: 18, fontSize: 18 }}>Gửi lời chúc</h3>
                <label>Tên của bạn<input value={wish.name} onChange={(e) => setWish({ ...wish, name: e.target.value })} /></label>
                <label>Lời chúc<textarea rows={4} value={wish.text} onChange={(e) => setWish({ ...wish, text: e.target.value })} /></label>
                <div style={{ textAlign: "center" }}><button className="btn" onClick={sendWish}>Gửi lời chúc</button></div>
              </>
            )}
            {typeof modal === "number" && (
              <>
                <div className="seg">
                  {W.gifts.map((g, i) => <label key={g.who} className={modal === i ? "on" : ""} onClick={() => setModal(i)}>{g.who}</label>)}
                </div>
                <div className="qr">{W.gifts[modal].qr ? <img src={W.gifts[modal].qr} alt="Mã QR" /> : "Điền đường dẫn ảnh QR vào mục qr trong W.gifts"}</div>
                <p style={{ fontWeight: 600 }}>{W.gifts[modal].bank}</p>
                <p>{W.gifts[modal].no}</p>
                <p className="dim" style={{ fontSize: 14 }}>{W.gifts[modal].name}</p>
                <div style={{ marginTop: 18 }}><button className="btn" onClick={() => setModal(null)}>Đóng</button></div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
