"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Cormorant_Garamond, Noto_Serif, Be_Vietnam_Pro } from "next/font/google";
import type { TemplateProps } from "@/types/invitation";
import { toForestW } from "./adapter";
import { useScrollReveal } from "../../shared/useScrollReveal";

const display = Cormorant_Garamond({ subsets: ["vietnamese", "latin"], weight: ["400", "500", "600"], variable: "--f-display" });
const serif = Noto_Serif({ subsets: ["vietnamese", "latin"], weight: ["400", "600", "700"], variable: "--f-serif" });
const sans = Be_Vietnam_Pro({ subsets: ["vietnamese", "latin"], weight: ["300", "400", "500"], variable: "--f-sans" });

const TZ = "Asia/Ho_Chi_Minh";
const ARC_TEXT = "LOVE NEVER FAILS"; // chữ cong dưới tên cô dâu chú rể
const WELCOME = "WELCOME TO OUR WEDDING";

// Màu mặc định theo ảnh mẫu. Ghi đè bằng tbl_templates.config.theme hoặc settings của từng thiệp.
const DEFAULTS = { page: "#FFFFFF", paper: "#FEF5EA", ink: "#213B27", deep: "#0B1F0C", mint: "#C8F0DA", dim: "#6B6B5E", card: "#FFFFFF" };

const SUGGEST = [
  "Chúc hai bạn trăm năm hạnh phúc, sớm sinh quý tử!",
  "Mong hai bạn xây dựng một mái ấm tràn đầy tiếng cười và niềm vui.",
  "Chúc mừng hạnh phúc hai bạn, mãi yêu thương nhau như ngày đầu!",
  "Chúc hai bạn trọn đời bên nhau, vạn sự như ý!",
];

const CSS = `
.fo{min-height:100vh;background:var(--page);color:var(--ink);font-family:var(--f-serif),Georgia,serif}
.fo *{box-sizing:border-box}
.fo h1,.fo h2,.fo h3,.fo p{margin:0;font-weight:400}
.col{width:100%;max-width:var(--col-w,880px);margin:0 auto;container-type:inline-size;background:var(--paper);position:relative;overflow:hidden;border-left:1px solid #F3E5D2;border-right:1px solid #F3E5D2}
.up{text-transform:uppercase}
.dim{color:var(--dim)}
.sn{font-family:var(--f-sans),sans-serif;font-weight:300}
:focus-visible{outline:2px solid var(--ink);outline-offset:3px}

/* HERO: mọi kích thước tính theo chiều rộng cột (cqw) nên luôn đúng tỉ lệ ở mọi màn hình */
.hero{position:relative;height:104.7cqw;text-align:center}
.hero>*{position:absolute}
.disc{top:0;left:1.6%;right:1.6%;height:48.4cqw;background:var(--deep);border-radius:0 0 50% 50%/0 0 100% 100%}
.wl{top:6.2cqw;left:0;right:0;font-size:max(9px,1.4cqw);letter-spacing:.45em;color:var(--mint);text-transform:uppercase;font-family:var(--f-display),serif}
.nr{top:14.6cqw;left:0;right:0;transform:translateY(-50%);display:grid;grid-template-columns:1fr 12cqw 1fr;align-items:center;padding:0 5.2cqw}
.nr small{display:block;font-family:var(--f-sans),sans-serif;font-size:max(11px,1.75cqw);color:#fff;text-transform:capitalize;margin-bottom:.5cqw}
.nr b{display:block;font-weight:400;font-size:max(15px,2.9cqw);color:#fff;text-transform:uppercase;letter-spacing:.01em}
.xi{font-size:max(40px,9.6cqw);line-height:1;color:var(--mint);font-weight:700;font-family:"Noto Sans TC","Noto Serif TC","SimHei","Microsoft YaHei",sans-serif}
.arc{top:24.5cqw;left:50%;transform:translateX(-50%);width:36cqw;height:auto;overflow:visible}
.arch{top:28.7cqw;left:50%;transform:translateX(-50%);width:41.3cqw;aspect-ratio:535/900;border-radius:999px 999px 0 0;background-size:cover;background-position:center;box-shadow:0 20px 50px -25px rgba(11,31,12,.6)}

/* BANNER + BODY */
.bn{background:var(--ink);color:#fff;font-family:var(--f-serif),serif;font-weight:700;letter-spacing:.04em;text-transform:uppercase;font-size:22px;padding:20px 12px;text-align:center}
.pad{padding:44px 24px 60px;text-align:center}
.hd{font-size:26px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink)}

/* THÔNG TIN LỄ CƯỚI */
.pr{display:grid;grid-template-columns:1fr 1px 1fr;gap:14px;align-items:center;margin-bottom:40px}
.pr i{width:1px;height:92px;background:var(--ink)}
.pr .l{font-size:15px;color:var(--dim);margin-bottom:8px}
.pr b{display:block;font-size:16px;font-weight:700;line-height:1.9}
.pr small{display:block;font-size:13px;color:var(--dim);margin-top:6px;line-height:1.6}
.ann{font-size:20px;line-height:1.8;letter-spacing:.04em}
.nm{font-family:var(--f-display),serif;font-size:clamp(46px,13vw,64px);line-height:1.1;margin-top:44px;font-weight:500;color:var(--ink)}
.rk{font-size:14px;letter-spacing:.3em;text-transform:uppercase;color:var(--dim);margin-top:20px}
.amp{font-family:var(--f-display),serif;font-size:44px;color:#8A8A80;margin:20px 0 0}
.pt{width:150px;height:200px;border-radius:999px 999px 12px 12px;object-fit:cover;display:block;margin:40px auto 0}
.cer{font-size:21px;line-height:1.7;letter-spacing:.04em;margin:70px 0 14px;text-transform:uppercase}
.at{font-size:16px;letter-spacing:.04em}
.dr{display:flex;align-items:center;justify-content:center;gap:22px;margin:28px 0 18px}
.dr b{font-family:var(--f-display),serif;font-size:60px;font-weight:400;line-height:1}
.dr span{font-size:17px;letter-spacing:.03em;text-transform:uppercase;color:#555}
.dr i{width:1px;height:44px;background:#8A8A80}
.yr{font-family:var(--f-display),serif;font-size:26px;color:#555}
.lu{font-size:14px;color:#555;margin-top:14px}

/* ALBUM */
.cf{position:relative;height:520px;perspective:1100px;margin:0 auto}
.cf .s{position:absolute;left:50%;top:14px;width:270px;height:440px;margin-left:-135px;border-radius:14px;background-size:cover;background-position:center;transition:transform .6s,opacity .6s;cursor:pointer;box-shadow:0 22px 40px -20px rgba(33,59,39,.55)}
.cf .nv{position:absolute;top:50%;z-index:20;width:40px;height:40px;margin-top:-20px;border-radius:50%;border:0;background:rgba(60,60,55,.75);color:#fff;font-size:20px;cursor:pointer}
.dots{display:flex;gap:9px;justify-content:center;margin-top:16px}
.dots button{width:9px;height:9px;border-radius:99px;border:0;padding:0;background:#E3DED6;cursor:pointer;transition:width .3s}
.dots button.on{width:34px;background:#C9C5BD}

@container (max-width:560px){.cf{height:420px}.cf .s{width:215px;height:340px;margin-left:-108px}}

/* TIỆC */
.pt1{font-size:21px;letter-spacing:.03em;text-transform:uppercase;margin-bottom:12px}
.tm{font-size:32px;font-weight:700;margin:6px 0 10px}
.kh{font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#555;margin-top:30px}
.cdn{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;max-width:420px;margin:40px auto 0}
.cdn div{background:#fff;border-radius:12px;padding:14px 0;box-shadow:0 8px 24px -18px rgba(33,59,39,.5)}
.cdn b{display:block;font-size:26px;font-weight:600}
.cdn span{font-size:12px;color:var(--dim)}
.cal{background:#fff0;border:1px solid #E4DCCB;border-radius:12px;margin:26px auto 22px;max-width:340px;overflow:hidden;font-family:var(--f-sans),sans-serif;font-weight:300}
.cal h3{padding:14px;font-size:15px;font-weight:500;border-bottom:1px solid #E4DCCB}
.cal .g{display:grid;grid-template-columns:repeat(7,1fr);padding:0 4px 10px}
.cal .w{padding:10px 0;font-size:13px;color:#555;border-bottom:2px solid var(--ink);margin-bottom:8px}
.cal i{font-style:normal;padding:12px 0;position:relative;font-size:14px}
.cal .on:before{content:"♥";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:42px;color:var(--ink)}
.cal u{position:relative;text-decoration:none}
.cal .on u{color:#fff;font-weight:600;font-size:12px}
.lnk{color:var(--ink);text-decoration:underline;text-underline-offset:6px;font-size:15px;font-family:var(--f-sans),sans-serif;font-weight:300}
.btn{display:inline-block;border:0;cursor:pointer;background:var(--ink);color:#fff;border-radius:14px;padding:16px 26px;font-family:var(--f-serif),serif;font-weight:700;font-size:17px;letter-spacing:.03em;text-transform:uppercase;text-decoration:none;transition:filter .2s}
.btn:hover{filter:brightness(1.15)}
.btn.pill{border-radius:999px;padding:14px 30px;font-family:var(--f-sans),sans-serif;font-weight:500;font-size:15px}
.mapbox{display:block;width:86%;height:min(442px,72cqw);border:0;border-radius:18px;margin:34px auto 0}
.dir{display:inline-flex;align-items:center;gap:10px;margin-top:22px;color:var(--ink);font-weight:700;font-size:17px;text-decoration:none}
.dc{display:flex;gap:26px;justify-content:center;margin-top:26px}
.dc i{width:48px;height:48px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.06)}
.tl{max-width:340px;margin:0 auto;position:relative}
.tl:before{content:"";position:absolute;left:50%;top:14px;bottom:14px;width:1px;background:var(--ink);opacity:.5}
.tl div{display:grid;grid-template-columns:1fr 24px 1fr;align-items:center;padding:16px 0;font-size:18px}
.tl div span:first-child{text-align:right;padding-right:18px;font-weight:700}
.tl div i{width:12px;height:12px;border-radius:50%;background:var(--ink);justify-self:center}
.tl div span:last-child{text-align:left;padding-left:18px}

/* LƯU BÚT */
.fc,.wl2{max-width:590px;margin-left:auto;margin-right:auto}
.fc{background:#fff;border-radius:14px;padding:28px 30px;box-shadow:0 18px 40px -26px rgba(33,59,39,.45);text-align:left}
.fc input,.fc textarea{display:block;width:100%;border:1px solid #E6E2DA;border-radius:10px;padding:16px 18px;font-family:var(--f-sans),sans-serif;font-weight:300;font-size:15px;color:#333;background:#fff;resize:none}
.fc input{margin-bottom:14px}
.fc input::placeholder,.fc textarea::placeholder{color:#B5B0A8}
.fc .rw{display:flex;justify-content:space-between;align-items:center;margin-top:18px}
.wand{width:48px;height:42px;border:0;border-radius:8px;background:#EDEDED;font-size:20px;cursor:pointer}
.wl2{margin-top:22px;display:grid;gap:12px}
.wi{background:#fff;border-radius:12px;padding:20px 22px;text-align:left;box-shadow:0 8px 24px -20px rgba(33,59,39,.5)}
.wi .tp{display:flex;justify-content:space-between;gap:10px;align-items:baseline}
.wi b{font-weight:400;font-size:18px}
.wi time{font-family:var(--f-sans),sans-serif;font-weight:300;font-size:12px;color:#AAA}
.wi p{margin-top:10px;font-family:var(--f-sans),sans-serif;font-weight:300;font-size:15px;color:#666;line-height:1.6;overflow-wrap:anywhere}

/* QUÀ + MODAL + NHẠC */
.gb{background:none;border:0;cursor:pointer;display:block;margin:30px auto 0;color:inherit}
.gb svg{animation:bob 3s ease-in-out infinite alternate}
@keyframes bob{to{transform:translateY(-6px)}}
.gb small{display:block;margin-top:6px;font-family:var(--f-sans),sans-serif;font-weight:500;font-size:13px;color:#888}
.cl{font-size:20px;line-height:1.6;color:#555;margin-top:70px}
.modal{position:fixed;inset:0;z-index:70;background:rgba(11,31,12,.6);display:flex;align-items:center;justify-content:center;padding:20px}
.box{width:100%;max-width:380px;background:#fff;color:var(--ink);border-radius:18px;padding:26px;text-align:left}
.box h3{text-align:center;font-weight:700;text-transform:uppercase;letter-spacing:.04em;font-size:17px;margin-bottom:18px}
.box label{display:block;font-size:14px;margin-bottom:14px}
.box input,.box select{width:100%;margin-top:4px;padding:11px 12px;border:1px solid #E6E2DA;border-radius:10px;font:inherit;background:#fff}
.seg{display:flex;gap:10px;margin-bottom:14px}
.seg label{flex:1;margin:0;text-align:center;border:1px solid #D9D2C3;border-radius:10px;padding:10px 4px;cursor:pointer;font-size:14px}
.seg label.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.seg input{position:absolute;opacity:0;width:0}
.qr{width:190px;height:190px;margin:14px auto;border:1px dashed var(--ink);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:12px;padding:12px;text-align:center;color:var(--dim)}
.qr img{width:100%;height:100%;object-fit:contain}
.mus{position:fixed;right:18px;bottom:18px;z-index:60;width:52px;height:52px;border-radius:50%;border:2px solid rgba(255,255,255,.18);background:radial-gradient(circle at 35% 30%,#3E6A4E,#1B3425);color:#fff;font-size:20px;cursor:pointer;box-shadow:0 10px 26px rgba(0,0,0,.35)}
.mus.on{animation:spin 6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.cf .s,.dots button,.gb svg,.mus.on{transition:none;animation:none}}
/* HIỆU ỨNG XUẤT HIỆN */
.rv{opacity:0;transform:translateY(18px);transition:opacity .8s ease,transform .8s ease}
.rv.rv-in{opacity:1;transform:none}

/* Mở đầu hero (chỉ dùng CSS, không dùng JS) */
@keyframes fo-fade{from{opacity:0}to{opacity:1}}
@keyframes fo-arch{from{opacity:0;transform:translateX(-50%) translateY(22px)}to{opacity:1;transform:translateX(-50%)}}
.disc{animation:fo-fade 1.1s ease both}
.wl{animation:fo-fade 1s .25s ease both}
.nr{animation:fo-fade 1s .45s ease both}
.arc{animation:fo-fade 1s .7s ease both}
.arch{animation:fo-arch 1.1s .55s ease both}

@media (prefers-reduced-motion:reduce){
  .rv{opacity:1;transform:none;transition:none}
  .hero>*{animation:none!important}
}
`;

const num = (d: Date, o: Intl.DateTimeFormatOptions) => Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, ...o }).format(d));

// "10:58:41 30/7/2026" theo giờ Việt Nam
function stamp(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hourCycle: "h23", hour: "numeric", minute: "2-digit", second: "2-digit", day: "numeric", month: "numeric", year: "numeric" }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${g("hour")}:${g("minute")}:${g("second")} ${g("day")}/${g("month")}/${g("year")}`;
}

function GiftBox() {
  return (
    <svg viewBox="0 0 160 170" width="240" aria-hidden>
      <defs>
        <linearGradient id="fg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F5E2AE" /><stop offset="1" stopColor="#C9A55E" /></linearGradient>
      </defs>
      <ellipse cx="80" cy="158" rx="52" ry="6" fill="rgba(0,0,0,.12)" />
      <rect x="34" y="74" width="92" height="80" rx="3" fill="#163020" />
      <rect x="28" y="54" width="104" height="22" rx="3" fill="#1F3E2A" />
      <rect x="72" y="54" width="16" height="100" fill="url(#fg)" />
      <ellipse cx="62" cy="46" rx="18" ry="10" transform="rotate(-22 62 46)" fill="url(#fg)" />
      <ellipse cx="98" cy="46" rx="18" ry="10" transform="rotate(22 98 46)" fill="url(#fg)" />
      <circle cx="80" cy="52" r="7" fill="#D8B66E" />
      <text x="52" y="122" fontSize="24" textAnchor="middle" fill="#E6C98A" fontFamily="'Noto Sans TC','SimHei',sans-serif" fontWeight="700">囍</text>
    </svg>
  );
}

export default function ForestTemplate({ data, preview }: TemplateProps) {
  const W = useMemo(() => toForestW(data), [data]);
  const th = { ...DEFAULTS, ...data.theme };
  const on = (k: string) => data.sections[k] !== false;

  const PHOTOS = data.media.photos.map((p) => p.url);
  const MAIN = data.media.hero_url ?? data.media.cover_url ?? PHOTOS[0] ?? null; // ảnh vòm đầu thiệp
  const GROOM_IMG = data.media.groom_url;
  const BRIDE_IMG = data.media.bride_url;
  const MUSIC = data.media.music_url ?? "";
  const N = PHOTOS.length || 6;

  const [a, setA] = useState(0);
  const [modal, setModal] = useState<null | "rsvp" | number>(null);
  const [left, setLeft] = useState<number | null>(null);

  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const touch = useRef(0);
  
  const root = useRef<HTMLDivElement>(null);
  useScrollReveal(root, ".bn, .pad > *");

  const [rsvp, setRsvp] = useState({ name: "", attend: "yes", guests: "1" });
  const [rsvpDone, setRsvpDone] = useState(false);
  const [wish, setWish] = useState({ name: "", text: "" });
  const [sug, setSug] = useState(0);
  const [wishes, setWishes] = useState(data.wishes.map((w) => ({ name: w.guest_name, text: w.message, at: w.created_at })));

  const d = useMemo(() => new Date(W.date), [W.date]);
  const y = num(d, { year: "numeric" }), m = num(d, { month: "numeric" }), day = num(d, { day: "numeric" });
  const weekday = new Intl.DateTimeFormat("vi-VN", { timeZone: TZ, weekday: "long" }).format(d);
  const dd = String(day).padStart(2, "0");
  const monthLabel = `Tháng ${String(m).padStart(2, "0")}`;

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, d.getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [d]);

  // Trình duyệt chặn tự phát nhạc: bật ở lần chạm đầu tiên của khách
  useEffect(() => {
    if (!MUSIC) return;
    const go = () => audio.current?.play().then(() => setPlaying(true)).catch(() => {});
    window.addEventListener("pointerdown", go, { once: true });
    return () => window.removeEventListener("pointerdown", go);
  }, [MUSIC]);

  const toggleMusic = () => {
    const el = audio.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); } else { el.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  const s = left === null ? null : Math.floor(left / 1000);
  const cdv = [
    ["Ngày", s === null ? "–" : Math.floor(s / 86400)],
    ["Giờ", s === null ? "–" : Math.floor((s % 86400) / 3600)],
    ["Phút", s === null ? "–" : Math.floor((s % 3600) / 60)],
    ["Giây", s === null ? "–" : s % 60],
  ];

  const offset = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // thứ Hai đầu tuần
  const cells = [...Array(offset).fill(0), ...Array.from({ length: new Date(Date.UTC(y, m, 0)).getUTCDate() }, (_, i) => i + 1)];

  const place = [W.venue, W.address].filter(Boolean).join(", ");
  const fmt = (x: Date) => x.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const calUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Đám cưới ${W.groom.short} & ${W.bride.short}`)}&dates=${fmt(d)}/${fmt(new Date(d.getTime() + 5 * 3600e3))}&location=${encodeURIComponent(place)}`;
  const mapUrl = W.mapUrl || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place)}`;
  const mapEmbed = `https://maps.google.com/maps?q=${encodeURIComponent(place)}&output=embed`;

  const slide = (i: number): React.CSSProperties => {
    let o = i - a;
    if (o > N / 2) o -= N;
    if (o < -N / 2) o += N;
    const ab = Math.abs(o);
    return {
      background: PHOTOS[i] ? `url(${PHOTOS[i]}) center/cover` : `linear-gradient(${150 + i * 25}deg,#CFE0D2,#7C9A86)`,
      transform: `translateX(${o * 68}%) translateZ(${-ab * 120}px) rotateY(${-o * 28}deg)`,
      opacity: ab > 2 ? 0 : 1 - ab * 0.3,
      zIndex: 10 - ab,
      pointerEvents: ab > 2 ? "none" : "auto",
    };
  };

  const DateRow = () => (
    <div className="dr"><span>{weekday}</span><i /><b>{dd}</b><i /><span>{monthLabel}</span></div>
  );

  const sendWish = () => {
    if (!wish.name.trim() || !wish.text.trim()) return;
    // TODO: gọi POST /api/public/invitations/{slug}/wishes khi có API (bỏ qua nếu preview)
    void preview;
    setWishes([{ name: wish.name.trim(), text: wish.text.trim(), at: new Date().toISOString() }, ...wishes]);
    setWish({ name: "", text: "" });
  };
  const sendRsvp = () => {
    if (!rsvp.name.trim()) return;
    // TODO: gọi POST /api/public/invitations/{slug}/rsvp khi có API (bỏ qua nếu preview)
    setRsvpDone(true);
  };
  const suggest = () => {
    setWish((w) => ({ ...w, text: SUGGEST[sug % SUGGEST.length] }));
    setSug(sug + 1);
  };

  const vars = {
    "--page": th.page, "--paper": th.paper, "--ink": th.ink, "--deep": th.deep, "--mint": th.mint, "--dim": th.dim,
  } as React.CSSProperties;

  return (
    <div ref={root} className={`fo ${display.variable} ${serif.variable} ${sans.variable}`} style={{ ...vars, fontFamily: "var(--f-serif),Georgia,serif" }}>
      <style>{CSS}</style>
      {MUSIC && <audio ref={audio} src={MUSIC} loop />}

      <main className="col">
        {/* HERO */}
        <section className="hero">
          <div className="disc" aria-hidden />
          <p className="wl">{WELCOME}</p>
          <div className="nr">
            <div><small>{W.groom.rank}</small><b>{W.groom.short}</b></div>
            <span className="xi" aria-hidden>囍</span>
            <div><small>{W.bride.rank}</small><b>{W.bride.short}</b></div>
          </div>
          <svg className="arc" viewBox="0 0 300 80" aria-label={ARC_TEXT}>
            <defs><path id="fo-arc" d="M 22 66 A 300 300 0 0 1 278 66" /></defs>
            <text fill={th.mint} fontSize="17" letterSpacing="4" fontFamily="var(--f-display),serif" textAnchor="middle">
              <textPath href="#fo-arc" startOffset="50%">{ARC_TEXT}</textPath>
            </text>
            <text x="6" y="76" fontSize="22" fill="#fff" textAnchor="middle">✦</text>
            <text x="294" y="76" fontSize="22" fill="#fff" textAnchor="middle">✦</text>
          </svg>
          <div className="arch" role="img" aria-label={`${W.groom.short} & ${W.bride.short}`}
            style={MAIN ? { backgroundImage: `url(${MAIN})` } : { background: "linear-gradient(160deg,#CFE0D2,#7C9A86)" }} />
        </section>

        {/* THÔNG TIN LỄ CƯỚI */}
        <div className="bn">Thông tin lễ cưới</div>
        <section className="pad">
          <div className="pr">
            {[W.groom, W.bride].flatMap((p, i) => {
              const block = (
                <div key={`p${i}`}>
                  <p className="l">Ông Bà</p>
                  {p.parents.map((x) => <b key={x}>{x}</b>)}
                  <small>{p.addr}</small>
                </div>
              );
              return i === 0 ? [block, <i key="sep" />] : [block];
            })}
          </div>
          <p className="ann up">Trân trọng báo tin<br />lễ thành hôn của con chúng tôi</p>

          {GROOM_IMG && <img className="pt" src={GROOM_IMG} alt={W.groom.full} />}
          <h3 className="nm">{W.groom.full}</h3>
          <p className="rk">{W.groom.rank}</p>
          <p className="amp">&amp;</p>
          {BRIDE_IMG && <img className="pt" src={BRIDE_IMG} alt={W.bride.full} />}
          <h3 className="nm" style={{ marginTop: BRIDE_IMG ? 36 : 26 }}>{W.bride.full}</h3>
          <p className="rk">{W.bride.rank}</p>

          <p className="cer">{W.ceremonyPlace || "Lễ thành hôn được cử hành tại tư gia"}</p>
          <p className="at up">Vào lúc {W.ceremonyTime}</p>
          <DateRow />
          {W.lunar && <p className="lu up">({W.lunar})</p>}
        </section>

        {/* ALBUM */}
        {on("album") && (
          <>
            <div className="bn">Album ảnh</div>
            <section className="pad" style={{ paddingTop: 30, paddingBottom: 44 }}>
              <div className="cf"
                onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
                onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 40) setA((a + (dx < 0 ? 1 : N - 1)) % N); }}>
                <button className="nv" style={{ left: 4 }} onClick={() => setA((a + N - 1) % N)} aria-label="Ảnh trước">‹</button>
                {Array.from({ length: N }).map((_, i) => <div key={i} className="s" style={slide(i)} onClick={() => setA(i)} role="img" aria-label={`Ảnh cưới ${i + 1}`} />)}
                <button className="nv" style={{ right: 4 }} onClick={() => setA((a + 1) % N)} aria-label="Ảnh sau">›</button>
              </div>
              <div className="dots">{Array.from({ length: N }).map((_, i) => <button key={i} className={i === a ? "on" : ""} onClick={() => setA(i)} aria-label={`Đến ảnh ${i + 1}`} />)}</div>
            </section>
          </>
        )}

        {/* THÔNG TIN TIỆC CƯỚI */}
        <div className="bn">Thông tin tiệc cưới</div>
        <section className="pad">
          <p className="pt1">Tiệc cưới sẽ diễn ra vào lúc:</p>
          <p className="tm">{W.partyTime}</p>
          <DateRow />
          <p className="yr">{y}</p>
          {W.lunar && <p className="lu">({W.lunar})</p>}
          <p className="kh">Khai tiệc</p>
          <p className="tm" style={{ fontSize: 22 }}>{W.partyTime}</p>

          {on("countdown") && <div className="cdn">{cdv.map(([l, v]) => <div key={l}><b>{String(v).padStart(2, "0")}</b><span>{l}</span></div>)}</div>}

          <div className="cal">
            <h3>Tháng {m} / {y}</h3>
            <div className="g">
              {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((x) => <div key={x} className="w">{x}</div>)}
              {cells.map((c, i) => <i key={i} className={c === day ? "on" : ""}><u>{c || ""}</u></i>)}
            </div>
          </div>
          <a className="lnk" href={calUrl} target="_blank" rel="noreferrer">Thêm vào lịch</a>
          <div style={{ marginTop: 34 }}><button className="btn" onClick={() => setModal("rsvp")}>Xác nhận tham dự</button></div>
        </section>

        {/* ĐỊA ĐIỂM + DRESS CODE */}
        {on("map") && (
          <>
            <div className="bn">Tiệc cưới sẽ tổ chức tại</div>
            <section className="pad" style={{ paddingBottom: 30 }}>
              <p className="dim" style={{ fontSize: 16, lineHeight: 1.7 }}>{place}</p>
              <iframe className="mapbox" title="Bản đồ" src={mapEmbed} loading="lazy" />
              <a className="dir" href={mapUrl} target="_blank" rel="noreferrer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M21 3 3 10.5l7 3 3 7z" /></svg>
                Chỉ đường
              </a>
            </section>
          </>
        )}
        {on("dresscode") && (W.dress || W.dressColors.length > 0) && (
          <section className="pad" style={{ paddingTop: 40, paddingBottom: 50 }}>
            <h2 className="hd">Dress code</h2>
            {W.dress && <p className="dim" style={{ marginTop: 10, fontSize: 16 }}>{W.dress}</p>}
            {W.dressColors.length > 0 && <div className="dc">{W.dressColors.map((c) => <i key={c} style={{ background: c }} />)}</div>}
          </section>
        )}

        {/* LỊCH TRÌNH */}
        {on("schedule") && W.schedule.length > 0 && (
          <>
            <div className="bn">Lịch trình ngày cưới</div>
            <section className="pad"><div className="tl">{W.schedule.map((x, i) => <div key={i}><span>{x.t}</span><i /><span>{x.n}</span></div>)}</div></section>
          </>
        )}

        {/* SỔ LƯU BÚT */}
        {on("guestbook") && (
          <>
            <div className="bn">Sổ lưu bút</div>
            <section className="pad" style={{ paddingTop: 40 }}>
              <div className="fc">
                <input placeholder="Nhập tên của bạn*" value={wish.name} onChange={(e) => setWish({ ...wish, name: e.target.value })} maxLength={150} />
                <textarea rows={5} placeholder="Nhập lời chúc của bạn*" value={wish.text} onChange={(e) => setWish({ ...wish, text: e.target.value })} maxLength={1000} />
                <div className="rw">
                  <button className="wand" onClick={suggest} aria-label="Gợi ý lời chúc" title="Gợi ý lời chúc">🪄</button>
                  <button className="btn pill" onClick={sendWish}>GỬI LỜI CHÚC</button>
                </div>
              </div>
              <div className="wl2">
                {wishes.map((x, i) => (
                  <div className="wi" key={i}>
                    <div className="tp"><b>{x.name}</b><time>{stamp(x.at)}</time></div>
                    <p>{x.text}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* HỘP QUÀ */}
        {on("gifts") && W.gifts.length > 0 && (
          <section className="pad" style={{ paddingTop: 30, paddingBottom: 30 }}>
            <h2 className="hd">Hộp quà mừng</h2>
            <button className="gb" onClick={() => setModal(0)} aria-label="Mở hộp quà mừng"><GiftBox /><small>Nhấn để mở</small></button>
          </section>
        )}
        <section className="pad" style={{ paddingTop: 0, paddingBottom: 70 }}>
          <p className="cl">{W.closing || "Sự hiện diện của quý khách là niềm vinh hạnh của gia đình chúng tôi!"}</p>
        </section>
      </main>

      {MUSIC && (
        <button className={`mus ${playing ? "on" : ""}`} onPointerDown={(e) => e.stopPropagation()} onClick={toggleMusic} aria-label={playing ? "Tắt nhạc" : "Bật nhạc"}>♪</button>
      )}

      {modal !== null && (
        <div className="modal" onClick={() => setModal(null)}>
          <div className="box" onClick={(e) => e.stopPropagation()} style={{ textAlign: typeof modal === "number" ? "center" : "left" }}>
            {modal === "rsvp" && (rsvpDone ? (
              <>
                <p style={{ textAlign: "center" }}>Cảm ơn {rsvp.name}! Gia đình đã nhận được phản hồi của bạn.</p>
                <div style={{ textAlign: "center", marginTop: 18 }}><button className="btn pill" onClick={() => setModal(null)}>Đóng</button></div>
              </>
            ) : (
              <>
                <h3>Xác nhận tham dự</h3>
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
                <div style={{ textAlign: "center" }}><button className="btn pill" onClick={sendRsvp}>Gửi xác nhận</button></div>
              </>
            ))}
            {typeof modal === "number" && W.gifts[modal] && (
              <>
                <div className="seg">
                  {W.gifts.map((g, i) => <label key={i} className={modal === i ? "on" : ""} onClick={() => setModal(i)}>{g.who}</label>)}
                </div>
                <div className="qr">{W.gifts[modal].qr ? <img src={W.gifts[modal].qr} alt="Mã QR" /> : "Chưa có ảnh QR"}</div>
                <p style={{ fontWeight: 700 }}>{W.gifts[modal].bank}</p>
                <p>{W.gifts[modal].no}</p>
                <p className="dim" style={{ fontSize: 14 }}>{W.gifts[modal].name}</p>
                <div style={{ marginTop: 18 }}><button className="btn pill" onClick={() => setModal(null)}>Đóng</button></div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}