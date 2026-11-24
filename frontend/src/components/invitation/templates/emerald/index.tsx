"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Lora, Great_Vibes } from "next/font/google";
import type { TemplateProps } from "@/types/invitation";
import { toEmeraldW } from "./adapter";

const serif = Lora({ subsets: ["vietnamese", "latin"], weight: ["400", "500", "600"], variable: "--f-serif" });
const script = Great_Vibes({ subsets: ["vietnamese", "latin", "latin-ext"], weight: "400", variable: "--f-script" });

/* ====== NGÔN NGỮ HIỂN THỊ: "en" (như mẫu) hoặc "vi" ====== */
const LANG: "en" | "vi" = "en";
const LOCALE = LANG === "en" ? "en-US" : "vi-VN";
const TZ = "Asia/Ho_Chi_Minh";

const TEXT = {
  en: {
    invites: "Cordially Invites", open: "Open", gallery: "PHOTO GALLERY", ceremonyInfo: "CEREMONY INFO",
    mrmrs: "Mr. & Mrs.", announce: ["WE JOYFULLY ANNOUNCE", "THE WEDDING OF OUR CHILDREN"],
    groom: "GROOM", bride: "BRIDE", ceremonyAt: "WEDDING CEREMONY AT FAMILY HOME", at: "AT",
    receptionInfo: "RECEPTION INFO", receptionAt: "THE RECEPTION WILL TAKE PLACE AT:",
    guestReception: "GUEST RECEPTION", reception: "RECEPTION", countdown: "COUNTDOWN",
    units: ["Days", "Hours", "Minutes", "Seconds"], addCal: "Add to Calendar", rsvp: "RSVP",
    venue: "VENUE", directions: "Get Directions", dress: "DRESS CODE", schedule: "WEDDING SCHEDULE",
    guestbook: "GUESTBOOK", sendWish: "Send Wishes", gifts: "WEDDING GIFT", tap: "Tap to open",
    closing: "Your presence is the greatest gift to us!", yourName: "Your name", yes: "I will attend",
    no: "Sorry, I can't make it", guests: "Number of guests", people: "guest(s)", send: "Send", close: "Close",
    wishText: "Your wishes", anon: "Guest", rsvpThanks: "Thank you,", rsvpDone: "We have received your reply.",
    noQr: "No QR image yet", weekdays: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"], giftAria: "Open gift box",
  },
  vi: {
    invites: "Trân trọng kính mời", open: "Mở thiệp", gallery: "ALBUM ẢNH CƯỚI", ceremonyInfo: "THÔNG TIN LỄ CƯỚI",
    mrmrs: "Ông bà", announce: ["TRÂN TRỌNG BÁO TIN", "LỄ THÀNH HÔN CỦA CON CHÚNG TÔI"],
    groom: "CHÚ RỂ", bride: "CÔ DÂU", ceremonyAt: "LỄ THÀNH HÔN ĐƯỢC CỬ HÀNH TẠI TƯ GIA", at: "VÀO LÚC",
    receptionInfo: "THÔNG TIN TIỆC CƯỚI", receptionAt: "TIỆC CƯỚI SẼ DIỄN RA VÀO LÚC:",
    guestReception: "ĐÓN KHÁCH", reception: "KHAI TIỆC", countdown: "CÙNG ĐẾM NGƯỢC",
    units: ["Ngày", "Giờ", "Phút", "Giây"], addCal: "Thêm vào lịch", rsvp: "XÁC NHẬN THAM DỰ",
    venue: "ĐỊA ĐIỂM TỔ CHỨC TIỆC", directions: "Chỉ đường", dress: "DRESS CODE", schedule: "LỊCH TRÌNH NGÀY CƯỚI",
    guestbook: "SỔ LƯU BÚT", sendWish: "Gửi lời chúc", gifts: "HỘP QUÀ MỪNG", tap: "Chạm để mở",
    closing: "Sự hiện diện của quý khách là món quà quý giá nhất của chúng tôi!", yourName: "Họ và tên",
    yes: "Mình sẽ đến", no: "Rất tiếc, mình bận", guests: "Số người đi cùng", people: "người", send: "Gửi", close: "Đóng",
    wishText: "Lời chúc", anon: "Khách mời", rsvpThanks: "Cảm ơn", rsvpDone: "Gia đình đã nhận được phản hồi của bạn.",
    noQr: "Chưa có ảnh QR", weekdays: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"], giftAria: "Mở hộp quà mừng",
  },
};
const T: typeof TEXT.en = TEXT[LANG];

// Màu mặc định (lấy theo ảnh mẫu). Đổi trong tbl_templates.config.theme hoặc settings của từng thiệp.
const DEFAULTS = { page: "#FFFFFF", bg: "#17261A", card: "#223526", txt: "#EBD09B", acc: "#EBD09B", dim: "#A39A70", cover: "#030703" };

// 14 chữ 囍 trôi nhẹ ở màn hình bìa (vị trí cố định, không random để tránh lệch SSR)
const SHI = Array.from({ length: 14 }, (_, i) => ({
  left: (i * 37 + 11) % 94,
  top: (i * 53 + 7) % 90,
  size: 14 + ((i * 7) % 24),
  delay: -((i % 7) * 1.3),
  dur: 9 + (i % 5) * 2,
  op: 0.25 + ((i * 13) % 5) * 0.12,
}));

const CSS = `
.em{min-height:100vh;background:var(--page);font-family:var(--f-serif),Georgia,serif;color:var(--txt)}
.em *{box-sizing:border-box}
.em h1,.em h2,.em h3,.em p{margin:0;font-weight:400}
.script{font-family:var(--f-script),cursive;line-height:1.15;font-weight:400}
.up{text-transform:uppercase;letter-spacing:.06em}
.dim{color:var(--dim)}
.col{max-width:520px;margin:0 auto;background-color:var(--bg);position:relative;overflow:hidden;box-shadow:0 0 60px rgba(0,0,0,.25)}
.sec{padding:84px 26px;text-align:center;position:relative}
.sec:before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 12% 18%,color-mix(in srgb,var(--acc) 7%,transparent) 0 70px,transparent 72px),radial-gradient(circle at 90% 72%,color-mix(in srgb,var(--acc) 6%,transparent) 0 90px,transparent 92px)}
.sec>*{position:relative}
.h{font-size:22px;margin-bottom:44px}
.btn{display:inline-block;background:none;border:1px solid var(--acc);color:var(--acc);padding:11px 30px;font:inherit;font-size:14px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;text-decoration:none;border-radius:999px;transition:background .2s,color .2s}
.btn:hover{background:var(--acc);color:var(--bg)}
.btn.solid{background:var(--acc);color:var(--bg);font-weight:500}
.lnk{color:var(--txt);text-decoration:underline;text-underline-offset:6px;font-size:17px}
:focus-visible{outline:2px solid var(--acc);outline-offset:3px}

/* BÌA */
.cover{position:fixed;inset:0;z-index:50;background:var(--cover);display:flex;align-items:center;justify-content:center;padding:20px;transition:opacity .9s,visibility .9s;overflow:hidden}
.cover.off{opacity:0;visibility:hidden}
.shi{position:absolute;color:var(--acc);animation:fl var(--d) ease-in-out var(--dl) infinite alternate;pointer-events:none;font-family:"Noto Serif TC","SimSun","MS Mincho",serif}
@keyframes fl{from{transform:translateY(0) rotate(-6deg)}to{transform:translateY(-26px) rotate(6deg)}}
.cd0{position:relative;z-index:1;width:100%;max-width:640px;min-height:540px;background:var(--bg);border:1px solid color-mix(in srgb,var(--acc) 22%,transparent);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:34px 24px;box-shadow:0 0 90px -10px color-mix(in srgb,var(--acc) 22%,transparent)}
.cd0>*{position:relative}
.art{position:absolute!important;inset:0;background-size:cover;background-position:center;opacity:.5;pointer-events:none}
.glyph{position:absolute!important;font-size:300px;line-height:1;opacity:.1;color:var(--acc);pointer-events:none;font-family:"Noto Serif TC","SimSun","MS Mincho",serif}
.med{width:64px;height:64px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#F6E3BC,var(--acc));display:flex;align-items:center;justify-content:center;font-size:30px;color:var(--bg);box-shadow:0 0 34px color-mix(in srgb,var(--acc) 55%,transparent);margin-bottom:22px;font-family:"Noto Serif TC","SimSun",serif}
.cd0 h1{font-size:clamp(44px,11vw,60px)}
.orn{display:flex;align-items:center;justify-content:center;gap:14px;margin:18px 0;color:var(--acc)}
.orn i{width:56px;height:1px;background:var(--acc);opacity:.7}

/* HERO */
.hero{min-height:780px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px 40px;position:relative}
.hero>img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;opacity:.22;pointer-events:none}
.hero h1{font-size:clamp(60px,18vw,92px);position:relative;z-index:1}
.hero .amp{font-size:clamp(44px,12vw,64px);margin:20px 0;position:relative;z-index:1}

/* ALBUM */
.cf{position:relative;height:430px;perspective:1100px;margin:0 auto}
.cf .s{position:absolute;left:50%;top:10px;width:230px;height:380px;margin-left:-115px;border-radius:20px;border:2px solid color-mix(in srgb,var(--acc) 30%,transparent);background-size:cover;background-position:center;transition:transform .6s,opacity .6s;cursor:pointer;box-shadow:0 20px 40px -20px rgba(0,0,0,.7)}
.cf .nv{position:absolute;top:50%;z-index:20;width:42px;height:42px;margin-top:-21px;border-radius:50%;border:0;background:rgba(0,0,0,.5);color:var(--txt);font-size:22px;cursor:pointer}
.dots{display:flex;gap:10px;justify-content:center;margin-top:10px}
.dots button{width:10px;height:10px;border-radius:99px;border:0;padding:0;background:color-mix(in srgb,var(--acc) 40%,transparent);cursor:pointer;transition:width .3s}
.dots button.on{width:32px;background:var(--acc)}

/* THÔNG TIN */
.pr{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:64px}
.pr .m{font-size:17px;letter-spacing:.06em;margin-bottom:14px}
.pr .n{font-size:21px;line-height:1.9;letter-spacing:.03em}
.pr small{display:block;font-size:15px;line-height:1.7;margin-top:10px}
.ann{font-size:20px;line-height:1.9;font-weight:500}
.pt{width:170px;height:170px;border-radius:50%;object-fit:cover;border:2px solid var(--acc);margin:44px auto 0;display:block}
.nm{font-size:clamp(46px,13vw,66px);margin-top:48px}
.tag{font-size:13px;letter-spacing:.38em;margin-top:16px}
.tm{font-size:44px;line-height:1.2;margin:22px 0}
.dr{display:flex;align-items:center;justify-content:center;gap:22px;margin:30px 0 24px}
.dr b{font-size:56px;font-weight:400;line-height:1}
.dr span{font-size:18px;letter-spacing:.04em;text-transform:uppercase}
.dr i{width:2px;height:50px;background:var(--acc)}
.two{display:flex;gap:46px;justify-content:center;margin:38px 0}
.two small{display:block;font-size:14px;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px}
.two b{font-size:30px;font-weight:400}
.cdn{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:0 0 44px}
.cdn div{border:1px solid color-mix(in srgb,var(--acc) 35%,transparent);border-radius:8px;padding:14px 0}
.cdn b{display:block;font-size:28px;font-weight:400}
.cdn span{font-size:12px;letter-spacing:.1em;text-transform:uppercase}

/* LỊCH */
.cal{border:1px solid color-mix(in srgb,var(--acc) 55%,transparent);border-radius:14px;margin:0 auto 30px;max-width:340px;overflow:hidden}
.cal h3{padding:14px;font-size:17px;font-weight:600;border-bottom:1px solid color-mix(in srgb,var(--acc) 35%,transparent)}
.cal .g{display:grid;grid-template-columns:repeat(7,1fr);padding:0 8px 14px}
.cal .w{padding:10px 0;color:var(--dim);font-size:14px;border-bottom:3px solid var(--acc);margin-bottom:10px}
.cal i{font-style:normal;padding:11px 0;position:relative;font-size:16px}
.cal .on:before{content:"♥";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:42px;color:var(--acc)}
.cal u{position:relative;text-decoration:none}
.cal .on u{color:var(--bg);font-weight:600;font-size:14px}

/* LỊCH TRÌNH, DRESS, LƯU BÚT, QUÀ */
.tl{max-width:340px;margin:0 auto;position:relative}
.tl:before{content:"";position:absolute;left:50%;top:14px;bottom:14px;width:1px;background:var(--acc)}
.tl div{display:grid;grid-template-columns:1fr 24px 1fr;align-items:center;padding:17px 0;font-size:19px}
.tl div span:first-child{text-align:right;padding-right:18px}
.tl div i{width:14px;height:14px;border-radius:50%;background:var(--acc);justify-self:center}
.tl div span:last-child{text-align:left;padding-left:18px}
.dc{display:flex;gap:26px;justify-content:center;margin-top:24px}
.dc i{width:54px;height:54px;border-radius:50%;border:1px solid color-mix(in srgb,var(--acc) 40%,transparent)}
.wish{background:var(--card);border:1px solid color-mix(in srgb,var(--acc) 40%,transparent);border-radius:16px;padding:16px 20px;text-align:left;margin-top:14px}
.wish b{font-weight:600;font-size:16px}.wish p{font-size:15px;margin-top:4px}
.env{display:flex;justify-content:center;height:250px;align-items:center;cursor:pointer;background:none;border:0;margin:0 auto;color:inherit}
.env i{display:block;width:104px;height:200px;border-radius:6px;background:linear-gradient(145deg,#F2D9A0,#D9B368);box-shadow:0 14px 30px -10px rgba(0,0,0,.6);position:relative}
.env i:before{content:"";position:absolute;left:0;right:0;top:0;height:60px;background:linear-gradient(145deg,#F7E4B5,#E2C183);clip-path:polygon(0 0,100% 0,50% 100%)}
.env i:nth-child(1){transform:rotate(-16deg) translateX(14px)}
.env i:nth-child(2){transform:rotate(14deg) translateX(-14px) scale(.9)}

/* MODAL + NHẠC */
.modal{position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:20px}
.box{width:100%;max-width:380px;background:var(--card);color:var(--txt);border:1px solid color-mix(in srgb,var(--acc) 45%,transparent);border-radius:16px;padding:26px;text-align:left}
.box label{display:block;font-size:14px;margin-bottom:14px}
.box input,.box textarea,.box select{width:100%;margin-top:4px;padding:10px 12px;border:1px solid color-mix(in srgb,var(--acc) 40%,transparent);background:rgba(0,0,0,.25);color:var(--txt);border-radius:8px;font:inherit}
.box select option{color:#000}
.seg{display:flex;gap:10px;margin-bottom:14px}
.seg label{flex:1;margin:0;text-align:center;border:1px solid color-mix(in srgb,var(--acc) 40%,transparent);border-radius:8px;padding:9px 4px;cursor:pointer;font-size:14px}
.seg label.on{background:var(--acc);color:var(--bg)}
.seg input{position:absolute;opacity:0;width:0}
.qr{width:190px;height:190px;margin:14px auto;border:1px dashed var(--acc);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:12px;padding:12px;text-align:center}
.qr img{width:100%;height:100%;object-fit:contain;background:#fff}
.mus{position:fixed;right:18px;bottom:18px;z-index:60;width:46px;height:46px;border-radius:50%;border:0;background:var(--acc);color:var(--bg);cursor:pointer;display:flex;align-items:flex-end;justify-content:center;gap:3px;padding:14px 0;box-shadow:0 8px 24px rgba(0,0,0,.35)}
.mus b{display:block;width:4px;border-radius:2px;background:var(--bg);height:6px}
.mus.on b{animation:eq 1s ease-in-out infinite alternate}
.mus.on b:nth-child(2){animation-delay:-.4s}.mus.on b:nth-child(3){animation-delay:-.7s}
@keyframes eq{from{height:5px}to{height:16px}}
@media (prefers-reduced-motion:reduce){.cover,.cf .s,.dots button,.shi,.mus.on b{transition:none;animation:none}}
`;

const num = (d: Date, o: Intl.DateTimeFormatOptions) => Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, ...o }).format(d));
const label = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, ...o }).format(d);

export default function EmeraldTemplate({ data, preview }: TemplateProps) {
  const W = useMemo(() => toEmeraldW(data), [data]);
  const th = { ...DEFAULTS, ...data.theme };
  const on = (k: string) => data.sections[k] !== false; // missing = shown

  const PHOTOS = data.media.photos.map((p) => p.url);
  const ART = data.media.hero_url; // dragon + phoenix line art
  const PATTERN = data.media.background_url; // leaf pattern
  const COVER = data.media.cover_url;
  const MUSIC = data.media.music_url ?? "";
  const GROOM_IMG = data.media.groom_url;
  const BRIDE_IMG = data.media.bride_url;
  const N = PHOTOS.length || 7;

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
  const [wishes, setWishes] = useState(data.wishes.map((w) => ({ name: w.guest_name, text: w.message })));

  const d = useMemo(() => new Date(W.date), [W.date]);
  const y = num(d, { year: "numeric" }), m = num(d, { month: "numeric" }), day = num(d, { day: "numeric" });
  const weekday = label(d, { weekday: "long" }), monthName = label(d, { month: "long" });
  const dd = String(day).padStart(2, "0");

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
  const toggleMusic = () => {
    const el = audio.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); } else { el.play().catch(() => {}); setPlaying(true); }
  };

  const s = left === null ? null : Math.floor(left / 1000);
  const cdv = [
    s === null ? "–" : Math.floor(s / 86400),
    s === null ? "–" : Math.floor((s % 86400) / 3600),
    s === null ? "–" : Math.floor((s % 3600) / 60),
    s === null ? "–" : s % 60,
  ];

  const offset = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Monday first
  const cells = [...Array(offset).fill(0), ...Array.from({ length: new Date(Date.UTC(y, m, 0)).getUTCDate() }, (_, i) => i + 1)];

  const place = `${W.venue}, ${W.address}`;
  const fmt = (x: Date) => x.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const calUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`${W.groom.short} & ${W.bride.short}`)}&dates=${fmt(d)}/${fmt(new Date(d.getTime() + 5 * 3600e3))}&location=${encodeURIComponent(place)}`;
  const mapUrl = W.mapUrl || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place)}`;
  const mapEmbed = `https://maps.google.com/maps?q=${encodeURIComponent(place)}&output=embed`;

  const slide = (i: number): React.CSSProperties => {
    let o = i - a;
    if (o > N / 2) o -= N;
    if (o < -N / 2) o += N;
    const ab = Math.abs(o);
    return {
      background: PHOTOS[i] ? `url(${PHOTOS[i]}) center/cover` : `linear-gradient(${140 + i * 28}deg,var(--card),var(--acc))`,
      transform: `translateX(${o * 58}%) translateZ(${-ab * 140}px) rotateY(${-o * 36}deg)`,
      opacity: ab > 2 ? 0 : 1 - ab * 0.28,
      zIndex: 10 - ab,
      pointerEvents: ab > 2 ? "none" : "auto",
    };
  };

  const DateRow = () => (
    <div className="dr"><span>{weekday}</span><i /><b>{dd}</b><i /><span>{monthName}</span></div>
  );

  const sendWish = () => {
    if (!wish.text.trim()) return;
    // TODO: gọi POST /api/public/invitations/{slug}/wishes khi có API (bỏ qua nếu preview)
    setWishes([{ name: wish.name.trim() || T.anon, text: wish.text }, ...wishes]);
    setWish({ name: "", text: "" });
    setModal(null);
  };
  const sendRsvp = () => {
    if (!rsvp.name.trim()) return;
    // TODO: gọi POST /api/public/invitations/{slug}/rsvp khi có API (bỏ qua nếu preview)
    void preview;
    setRsvpDone(true);
  };

  const vars = {
    "--page": th.page, "--bg": th.bg, "--card": th.card, "--txt": th.txt, "--acc": th.acc, "--dim": th.dim, "--cover": th.cover,
  } as React.CSSProperties;
  const colStyle: React.CSSProperties = PATTERN
    ? { backgroundImage: `linear-gradient(color-mix(in srgb,${th.bg} 86%,transparent),color-mix(in srgb,${th.bg} 86%,transparent)),url(${PATTERN})`, backgroundSize: "100% auto", backgroundRepeat: "repeat-y" }
    : {};

  return (
    <div className={`em ${serif.variable} ${script.variable}`} style={{ ...vars, fontFamily: "var(--f-serif),Georgia,serif" }}>
      <style>{CSS}</style>
      {MUSIC && <audio ref={audio} src={MUSIC} loop />}

      {/* BÌA */}
      <section className={`cover ${open ? "off" : ""}`} aria-hidden={open}
        style={COVER ? { background: `linear-gradient(rgba(0,0,0,.6),rgba(0,0,0,.6)),url(${COVER}) center/cover` } : undefined}>
        {SHI.map((x, i) => (
          <span key={i} className="shi" aria-hidden
            style={{ left: `${x.left}%`, top: `${x.top}%`, fontSize: x.size, opacity: x.op, ["--d" as string]: `${x.dur}s`, ["--dl" as string]: `${x.delay}s` }}>囍</span>
        ))}
        <div className="cd0">
          {ART ? <div className="art" style={{ backgroundImage: `url(${ART})` }} /> : (
            <><span className="glyph" style={{ left: -40, top: 40 }} aria-hidden>龍</span><span className="glyph" style={{ right: -40, bottom: 20 }} aria-hidden>鳳</span></>
          )}
          <div className="med" aria-hidden>囍</div>
          <h1 className="script">{W.groom.short}</h1>
          <p style={{ fontSize: 26, margin: "6px 0" }}>&amp;</p>
          <h1 className="script">{W.bride.short}</h1>
          <div className="orn" aria-hidden><i />❦<i /></div>
          <p style={{ fontSize: 22 }}>{label(d, { dateStyle: "long" })}</p>
          <p style={{ fontSize: 22, margin: "26px 0 28px", opacity: 0.85 }}>{T.invites}</p>
          <button className="btn solid" style={{ fontSize: 20, textTransform: "none", padding: "13px 46px", letterSpacing: 0 }} onClick={openCard}>{T.open}</button>
        </div>
      </section>

      <main className="col" style={colStyle}>
        {/* HERO */}
        <section className="hero">
          {ART ? <img src={ART} alt="" /> : (
            <><span className="glyph" style={{ left: -30, top: 90 }} aria-hidden>龍</span><span className="glyph" style={{ right: -30, top: 190 }} aria-hidden>鳳</span></>
          )}
          <h1 className="script">{W.groom.short}</h1>
          <p className="script amp">&amp;</p>
          <h1 className="script">{W.bride.short}</h1>
        </section>

        {/* ALBUM */}
        {on("album") && (
          <section className="sec" style={{ paddingTop: 30 }}>
            <h2 className="h up">{T.gallery}</h2>
            <div className="cf"
              onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
              onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 40) setA((a + (dx < 0 ? 1 : N - 1)) % N); }}>
              <button className="nv" style={{ left: 8 }} onClick={() => setA((a + N - 1) % N)} aria-label="‹">‹</button>
              {Array.from({ length: N }).map((_, i) => <div key={i} className="s" style={slide(i)} onClick={() => setA(i)} role="img" aria-label={`${i + 1}`} />)}
              <button className="nv" style={{ right: 8 }} onClick={() => setA((a + 1) % N)} aria-label="›">›</button>
            </div>
            <div className="dots">{Array.from({ length: N }).map((_, i) => <button key={i} className={i === a ? "on" : ""} onClick={() => setA(i)} aria-label={`${i + 1}`} />)}</div>
          </section>
        )}

        {/* CEREMONY INFO */}
        <section className="sec">
          <h2 className="h up">{T.ceremonyInfo}</h2>
          <div className="pr">
            {[W.groom, W.bride].map((p, i) => (
              <div key={i}>
                <p className="m dim">{T.mrmrs}</p>
                {p.parents.map((x) => <p className="n" key={x}>{x}</p>)}
                <small>{p.addr}</small>
              </div>
            ))}
          </div>
          <p className="ann up">{T.announce[0]}<br />{T.announce[1]}</p>

          {GROOM_IMG && <img className="pt" src={GROOM_IMG} alt={W.groom.full} />}
          <h3 className="script nm">{W.groom.full}</h3>
          <p className="tag up">{T.groom}</p>
          <p className="script" style={{ fontSize: 54, margin: "26px 0" }}>&amp;</p>
          {BRIDE_IMG && <img className="pt" src={BRIDE_IMG} alt={W.bride.full} />}
          <h3 className="script nm" style={{ marginTop: BRIDE_IMG ? 48 : 0 }}>{W.bride.full}</h3>
          <p className="tag up">{T.bride}</p>

          <p className="up" style={{ fontSize: 20, lineHeight: 1.9, margin: "70px 0 14px" }}>
            {LANG === "vi" && W.ceremonyPlace ? W.ceremonyPlace : T.ceremonyAt}
          </p>
          <p className="up" style={{ fontSize: 17 }}>{T.at}</p>
          <p className="tm">{W.ceremonyTime}</p>
          <DateRow />
          <p style={{ fontSize: 24 }}>{y}</p>
        </section>

        {/* RECEPTION INFO */}
        <section className="sec">
          <h2 className="h up">{T.receptionInfo}</h2>
          <p className="up" style={{ fontSize: 20, marginBottom: 18 }}>{T.receptionAt}</p>
          <p className="tm" style={{ margin: "0 0 6px" }}>{W.partyTime}</p>
          <DateRow />
          <p style={{ fontSize: 24 }}>{y}</p>
          <div className="two">
            <div><small>{T.guestReception}</small><b>{W.guestTime}</b></div>
            <div><small>{T.reception}</small><b>{W.partyTime}</b></div>
          </div>

          {on("countdown") && (
            <>
              <h3 className="up" style={{ fontSize: 20, margin: "50px 0 18px" }}>{T.countdown}</h3>
              <div className="cdn">{cdv.map((v, i) => <div key={i}><b>{String(v).padStart(2, "0")}</b><span>{T.units[i]}</span></div>)}</div>
            </>
          )}

          <div className="cal">
            <h3>{label(d, { month: "long", year: "numeric" })}</h3>
            <div className="g">
              {T.weekdays.map((x) => <div key={x} className="w">{x}</div>)}
              {cells.map((c, i) => <i key={i} className={c === day ? "on" : ""}><u>{c || ""}</u></i>)}
            </div>
          </div>
          <a className="lnk" href={calUrl} target="_blank" rel="noreferrer">{T.addCal}</a>
          <div style={{ marginTop: 44 }}><button className="btn" onClick={() => setModal("rsvp")}>{T.rsvp}</button></div>
        </section>

        {/* VENUE */}
        {on("map") && (
          <section className="sec">
            <h2 className="h up">{T.venue}</h2>
            <p style={{ fontSize: 19 }}>{W.venue}</p>
            <p className="dim" style={{ margin: "6px 0 20px", fontSize: 15, lineHeight: 1.7 }}>{W.address}</p>
            <iframe title="Map" src={mapEmbed} loading="lazy" style={{ width: "100%", height: 230, border: 0, borderRadius: 12, filter: "grayscale(.35)" }} />
            <div style={{ marginTop: 22 }}><a className="btn" href={mapUrl} target="_blank" rel="noreferrer">{T.directions}</a></div>
          </section>
        )}

        {/* DRESS CODE + SCHEDULE */}
        {(on("dresscode") || on("schedule")) && (
          <section className="sec">
            {on("dresscode") && (W.dress || W.dressColors.length > 0) && (
              <>
                <h2 className="h up" style={{ marginBottom: 10 }}>{T.dress}</h2>
                {W.dress && <p className="dim">{W.dress}</p>}
                {W.dressColors.length > 0 && <div className="dc">{W.dressColors.map((c) => <i key={c} style={{ background: c }} />)}</div>}
              </>
            )}
            {on("schedule") && W.schedule.length > 0 && (
              <>
                <h2 className="h up" style={{ margin: "90px 0 26px" }}>{T.schedule}</h2>
                <div className="tl">{W.schedule.map((x, i) => <div key={i}><span>{x.t}</span><i /><span>{x.n}</span></div>)}</div>
              </>
            )}
          </section>
        )}

        {/* GUESTBOOK */}
        {on("guestbook") && (
          <section className="sec">
            <h2 className="h up">{T.guestbook}</h2>
            <button className="btn" onClick={() => setModal("wish")}>{T.sendWish}</button>
            <div style={{ marginTop: 20 }}>{wishes.map((x, i) => <div className="wish" key={i}><b>{x.name}</b><p>{x.text}</p></div>)}</div>
          </section>
        )}

        {/* GIFTS */}
        {on("gifts") && W.gifts.length > 0 && (
          <section className="sec">
            <h2 className="h up">{T.gifts}</h2>
            <button className="env" onClick={() => setModal(0)} aria-label={T.giftAria}><i /><i /></button>
            <p className="dim" style={{ marginTop: 8, fontSize: 15 }}>{T.tap}</p>
          </section>
        )}

        <section className="sec" style={{ paddingTop: 20 }}>
          <p className="script" style={{ fontSize: 34, lineHeight: 1.4 }}>{W.closing || T.closing}</p>
        </section>
      </main>

      {MUSIC && open && (
        <button className={`mus ${playing ? "on" : ""}`} onClick={toggleMusic} aria-label={playing ? "Pause" : "Play"}><b /><b /><b /></button>
      )}

      {/* MODAL */}
      {modal !== null && (
        <div className="modal" onClick={() => setModal(null)}>
          <div className="box" onClick={(e) => e.stopPropagation()} style={{ textAlign: typeof modal === "number" ? "center" : "left" }}>
            {modal === "rsvp" && (rsvpDone ? (
              <>
                <p style={{ textAlign: "center" }}>{T.rsvpThanks} {rsvp.name}! {T.rsvpDone}</p>
                <div style={{ textAlign: "center", marginTop: 18 }}><button className="btn" onClick={() => setModal(null)}>{T.close}</button></div>
              </>
            ) : (
              <>
                <h3 className="up" style={{ textAlign: "center", marginBottom: 18, fontSize: 18 }}>{T.rsvp}</h3>
                <label>{T.yourName}<input value={rsvp.name} onChange={(e) => setRsvp({ ...rsvp, name: e.target.value })} /></label>
                <div className="seg">
                  {[["yes", T.yes], ["no", T.no]].map(([v, l]) => (
                    <label key={v} className={rsvp.attend === v ? "on" : ""}><input type="radio" name="at" checked={rsvp.attend === v} onChange={() => setRsvp({ ...rsvp, attend: v })} />{l}</label>
                  ))}
                </div>
                {rsvp.attend === "yes" && (
                  <label>{T.guests}
                    <select value={rsvp.guests} onChange={(e) => setRsvp({ ...rsvp, guests: e.target.value })}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} {T.people}</option>)}</select>
                  </label>
                )}
                <div style={{ textAlign: "center" }}><button className="btn" onClick={sendRsvp}>{T.send}</button></div>
              </>
            ))}
            {modal === "wish" && (
              <>
                <h3 className="up" style={{ textAlign: "center", marginBottom: 18, fontSize: 18 }}>{T.sendWish}</h3>
                <label>{T.yourName}<input value={wish.name} onChange={(e) => setWish({ ...wish, name: e.target.value })} /></label>
                <label>{T.wishText}<textarea rows={4} value={wish.text} onChange={(e) => setWish({ ...wish, text: e.target.value })} /></label>
                <div style={{ textAlign: "center" }}><button className="btn" onClick={sendWish}>{T.send}</button></div>
              </>
            )}
            {typeof modal === "number" && W.gifts[modal] && (
              <>
                <div className="seg">
                  {W.gifts.map((g, i) => <label key={i} className={modal === i ? "on" : ""} onClick={() => setModal(i)}>{g.who}</label>)}
                </div>
                <div className="qr">{W.gifts[modal].qr ? <img src={W.gifts[modal].qr} alt="QR" /> : T.noQr}</div>
                <p style={{ fontWeight: 600 }}>{W.gifts[modal].bank}</p>
                <p>{W.gifts[modal].no}</p>
                <p className="dim" style={{ fontSize: 14 }}>{W.gifts[modal].name}</p>
                <div style={{ marginTop: 18 }}><button className="btn" onClick={() => setModal(null)}>{T.close}</button></div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
