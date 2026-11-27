"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Cormorant_Garamond, Noto_Serif, Be_Vietnam_Pro, Great_Vibes } from "next/font/google";
import type { TemplateProps } from "@/types/invitation";
import { toBotanicalW } from "./adapter";
import { useScrollReveal } from "../../shared/useScrollReveal";

const display = Cormorant_Garamond({ subsets: ["vietnamese", "latin"], weight: ["400", "500", "600"], variable: "--f-display" });
const serif = Noto_Serif({ subsets: ["vietnamese", "latin"], weight: ["400", "600", "700"], variable: "--f-serif" });
const sans = Be_Vietnam_Pro({ subsets: ["vietnamese", "latin"], weight: ["300", "400", "500"], variable: "--f-sans" });
const script = Great_Vibes({ subsets: ["vietnamese", "latin", "latin-ext"], weight: "400", variable: "--f-script" });

const TZ = "Asia/Ho_Chi_Minh";

// Màu mặc định theo ảnh mẫu. Ghi đè bằng tbl_templates.config.theme hoặc settings của từng thiệp.
const DEFAULTS = { page: "#EFECE4", paper: "#F8F5EF", ink: "#687C52", deep: "#43553A", gold: "#A18343", dim: "#A18343", card: "#FFFFFF" };
const DEFAULT_DRESS = ["#2B2825", "#9C8670", "#F1EDE3"];

const SUGGEST = [
  "Chúc hai bạn trăm năm hạnh phúc, sớm sinh quý tử!",
  "Mong hai bạn xây dựng một mái ấm tràn đầy tiếng cười và niềm vui.",
  "Chúc mừng hạnh phúc hai bạn, mãi yêu thương nhau như ngày đầu!",
  "Chúc hai bạn trọn đời bên nhau, vạn sự như ý!",
];

/* ============ ẢNH HOA LÁ (đặt trong public/botanical/) ============ */
const IMG = {
  wreath: "/botanical/wreath.webp",
  leaf: "/botanical/leaf.webp",
  footerFlower: "/botanical/footer-flower.webp",
  a: "/botanical/spray-a.webp",
  b: "/botanical/spray-b.webp",
};

type Deco = { src: string; top: string; side: "l" | "r"; w: number; rot?: number; ghost?: boolean };

// Hoa lá trang trí hai bên lề. w = % chiều rộng cột; top = % chiều cao cột.
const DECOS: Deco[] = [
  { src: IMG.leaf, top: "28%", side: "r", w: 34, rot: 18, ghost: true },
  { src: IMG.leaf, top: "55%", side: "l", w: 38, rot: -20, ghost: true },
  { src: IMG.a, top: "74%", side: "r", w: 30, rot: 8, ghost: true },
  { src: IMG.b, top: "34%", side: "l", w: 15, rot: -8 },
  { src: IMG.a, top: "27%", side: "r", w: 14, rot: 6 },
  { src: IMG.leaf, top: "45%", side: "r", w: 13, rot: -25 },
  { src: IMG.a, top: "54%", side: "l", w: 14, rot: -6 },
  { src: IMG.b, top: "72%", side: "r", w: 14, rot: 10 },
  { src: IMG.leaf, top: "80%", side: "l", w: 13, rot: 20 },
];

function GiftBox() {
  const env = (rot: number, ox: number, src: string) => (
    <g transform={`rotate(${rot} ${ox + 45} 110)`}>
      <rect x={ox} y="40" width="90" height="130" rx="4" fill="#F7F2E6" stroke="#D9D0B8" />
      <image href={src} x={ox + 6} y="62" width="78" height="100" preserveAspectRatio="xMidYMid meet" />
      <path d={`M${ox} 40H${ox + 90}L${ox + 45} 95Z`} fill="#8DA273" />
      <circle cx={ox + 45} cy="68" r="5" fill="#E9B949" />
    </g>
  );
  return (
    <svg viewBox="0 0 240 200" className="gsvg" aria-hidden>
      <ellipse cx="120" cy="188" rx="70" ry="6" fill="rgba(0,0,0,.1)" />
      {env(-14, 30, IMG.b)}
      {env(16, 120, IMG.a)}
    </svg>
  );
}

/* ============ CSS ============ */
const TEXTURE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3'/%3E%3CfeColorMatrix values='0 0 0 0 .55 0 0 0 0 .5 0 0 0 0 .4 0 0 0 .09 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/*
  Co giãn: --u là "1 đơn vị thiết kế" (thiết kế gốc rộng 460). Cột rộng bao nhiêu thì --u tự co theo
  (cqw = % chiều rộng cột), tối đa 1.5px để màn hình lớn không bị phóng quá to.
  Chữ nhỏ có mức sàn bằng px để điện thoại vẫn đọc được.
*/
const CSS = `
.bt{min-height:100vh;background:var(--page);color:var(--ink);font-family:var(--f-serif),Georgia,serif}
.bt *{box-sizing:border-box}
.bt h1,.bt h2,.bt h3,.bt p{margin:0;font-weight:400}
.col{
  --u:min(calc(100cqw / 460),1.5px);
  --xs:max(10px,calc(var(--u)*10));
  --s:max(11px,calc(var(--u)*11));
  --m:max(12.5px,calc(var(--u)*13));
  --l:max(14px,calc(var(--u)*17));
  --pad:max(18px,calc((100cqw - var(--u)*460)/2 + var(--u)*28));
  width:100%;max-width:var(--col-w,880px);margin:0 auto;container-type:inline-size;position:relative;overflow:hidden;
  background-color:var(--paper);border-inline:1px solid #EADFCA;box-shadow:0 0 50px rgba(120,110,80,.12)
}
.gold{color:var(--gold)}
:focus-visible{outline:2px solid var(--ink);outline-offset:3px}

/* ảnh hoa lá: mix-blend-mode làm nền trắng của ảnh hòa vào giấy */
.fl{position:absolute;z-index:1;pointer-events:none;height:auto;mix-blend-mode:multiply;user-select:none}
.fl.ghost{opacity:.12}

.sec{position:relative;z-index:2;padding:calc(var(--u)*44) var(--pad);text-align:center}
.hd{font-weight:700;font-size:var(--l);letter-spacing:.03em;text-transform:uppercase;color:var(--ink);margin-bottom:calc(var(--u)*22)}

/* HERO */
.hero{padding-top:calc(var(--u)*34);padding-bottom:calc(var(--u)*30)}
.wo{font-size:var(--xs);letter-spacing:.12em;color:var(--gold);text-transform:uppercase;font-weight:600}
.wreath{position:relative;width:calc(var(--u)*340);max-width:100%;aspect-ratio:1090/1440;margin:calc(var(--u)*30) auto 0}
.wreath img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;mix-blend-mode:multiply}
.wn{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:calc(var(--u)*12);font-family:var(--f-display),serif;font-size:max(18px,calc(var(--u)*25));letter-spacing:.02em;text-transform:uppercase;color:var(--ink);padding:0 18%;text-align:center}
.wn .amp{font-style:italic;font-size:max(17px,calc(var(--u)*22));text-transform:none;color:#8A9A72}
.hero-bg{animation:bt-fade 1.2s ease both}
@keyframes bt-fade{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}

/* THÔNG TIN */
.pr{display:grid;grid-template-columns:1fr 1px 1fr;gap:calc(var(--u)*14);align-items:center;margin-bottom:calc(var(--u)*22)}
.pr i{width:1px;height:calc(var(--u)*50);background:var(--ink);opacity:.8}
.pr .l{font-size:var(--xs);color:var(--gold);margin-bottom:calc(var(--u)*5)}
.pr b{display:block;font-size:var(--s);font-weight:700;line-height:1.7;color:var(--ink)}
.pr small{display:block;font-size:var(--xs);color:var(--gold);margin-top:3px}
.inv{font-size:var(--m);line-height:1.6;text-transform:uppercase;color:var(--ink)}
.pt{width:calc(var(--u)*130);height:calc(var(--u)*170);border-radius:999px 999px 10px 10px;object-fit:cover;display:block;margin:calc(var(--u)*22) auto 0}
.nm{font-family:var(--f-display),serif;font-size:max(30px,calc(var(--u)*42));line-height:1.15;color:var(--ink);margin-top:calc(var(--u)*20)}
.amp2{display:block;font-family:var(--f-display),serif;font-style:italic;font-size:max(24px,calc(var(--u)*28));color:#8A9A72;margin-top:6px}
.cer{font-size:var(--m);line-height:1.7;text-transform:uppercase;color:var(--ink);margin:calc(var(--u)*22) 0 calc(var(--u)*8)}
.meta{display:flex;justify-content:center;gap:calc(var(--u)*56);font-size:var(--xs);letter-spacing:.04em;text-transform:uppercase;color:var(--gold);font-weight:600}
.dt{display:flex;align-items:center;justify-content:center;gap:calc(var(--u)*10);margin:4px 0 6px;font-family:var(--f-display),serif}
.dt b{font-size:max(34px,calc(var(--u)*42));font-weight:400;line-height:1;color:var(--ink)}
.dt i{width:1px;height:calc(var(--u)*36);background:var(--ink)}
.dt div{display:flex;flex-direction:column;text-align:left;font-size:var(--s);line-height:1.5;text-transform:uppercase;color:var(--gold)}
.lu{font-size:var(--xs);text-transform:uppercase;color:var(--gold);font-weight:600}

/* ALBUM */
.cf{position:relative;height:calc(var(--u)*290);perspective:1000px;margin:0 auto}
.cf .s{position:absolute;left:50%;top:calc(var(--u)*14);width:calc(var(--u)*170);height:calc(var(--u)*225);margin-left:calc(var(--u)*-85);border-radius:12px;background-size:cover;background-position:center;transition:transform .6s,opacity .6s;cursor:pointer;box-shadow:0 18px 30px -16px rgba(40,50,30,.6)}
.cf .nv{position:absolute;top:50%;z-index:20;width:26px;height:26px;margin-top:-13px;border-radius:50%;border:0;background:rgba(90,90,80,.75);color:#fff;font-size:15px;line-height:1;cursor:pointer}
.cnt{font-size:var(--xs);letter-spacing:.1em;color:#A9A290;margin-top:calc(var(--u)*6)}

/* TIỆC */
.pt1{font-size:var(--m);font-weight:700;text-transform:uppercase;color:var(--ink);margin-bottom:calc(var(--u)*10)}
.cd-t{font-size:var(--l);text-transform:uppercase;color:var(--gold);margin:calc(var(--u)*22) 0 calc(var(--u)*8);font-weight:500}
.cd{font-size:var(--m);font-weight:700;color:var(--gold)}
.two{display:flex;gap:calc(var(--u)*34);justify-content:center;margin:calc(var(--u)*20) 0 calc(var(--u)*24)}
.two small{display:block;font-size:var(--xs);letter-spacing:.04em;text-transform:uppercase;color:var(--gold);margin-bottom:3px}
.two b{font-size:var(--m);font-weight:700;color:var(--ink)}
.cal{border:1px solid #E1D8C3;border-radius:8px;width:calc(var(--u)*260);max-width:100%;margin:0 auto calc(var(--u)*14);overflow:hidden}
.cal h3{padding:calc(var(--u)*10);font-family:var(--f-script),cursive;font-size:max(16px,calc(var(--u)*18));color:var(--ink)}
.cal .g{display:grid;grid-template-columns:repeat(7,1fr);padding:0 6px 8px;font-family:var(--f-sans),sans-serif;font-weight:300}
.cal .w{padding:6px 0;font-size:var(--xs);color:#A9A290;margin-bottom:2px}
.cal i{font-style:normal;padding:calc(var(--u)*7) 0;position:relative;font-size:var(--s);color:var(--ink)}
.cal .on:before{content:"♥";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:max(28px,calc(var(--u)*32));color:var(--ink)}
.cal u{position:relative;text-decoration:none}
.cal .on u{color:#fff;font-weight:600}
.lnk{color:var(--ink);text-decoration:underline;text-underline-offset:4px;font-size:var(--s);font-family:var(--f-sans),sans-serif;font-weight:300}
.btn{display:inline-block;border:0;cursor:pointer;background:var(--ink);color:#fff;border-radius:999px;padding:max(9px,calc(var(--u)*9)) max(20px,calc(var(--u)*22));font-family:var(--f-serif),serif;font-weight:700;font-size:var(--s);letter-spacing:.02em;text-transform:uppercase;text-decoration:none;transition:filter .2s}
.btn:hover{filter:brightness(1.12)}
.btn.lg{padding:12px 28px;font-size:13px}

/* ĐỊA ĐIỂM + DRESS */
.vn{font-size:var(--s);color:var(--gold);line-height:1.6}
.mapbox{display:block;width:100%;max-width:calc(var(--u)*360);height:calc(var(--u)*200);min-height:170px;border:0;border-radius:4px;margin:calc(var(--u)*14) auto 0}
.dir{display:inline-flex;align-items:center;gap:6px;margin-top:calc(var(--u)*12);color:var(--ink);font-weight:700;font-size:var(--s);text-decoration:none}
.dc{display:flex;gap:calc(var(--u)*12);justify-content:center;margin-top:calc(var(--u)*14)}
.dc i{width:max(24px,calc(var(--u)*28));height:max(24px,calc(var(--u)*28));border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}

/* LỊCH TRÌNH */
.tl{max-width:calc(var(--u)*360);margin:0 auto;position:relative}
.tl:before{content:"";position:absolute;left:50%;top:10px;bottom:10px;width:2px;background:var(--ink);opacity:.85;transform:translateX(-1px)}
.tl div{display:grid;grid-template-columns:1fr 20px 1fr;align-items:center;padding:calc(var(--u)*12) 0;font-size:var(--s);color:var(--gold)}
.tl div span:first-child{text-align:right;padding-right:calc(var(--u)*14)}
.tl div i{width:8px;height:8px;border-radius:50%;background:var(--ink);justify-self:center;position:relative}
.tl div span:last-child{text-align:left;padding-left:calc(var(--u)*14);line-height:1.4}

/* LƯU BÚT */
.fc{max-width:calc(var(--u)*320);margin:0 auto;text-align:left}
.fc input,.fc textarea{display:block;width:100%;border:1.5px solid var(--ink);border-radius:3px;padding:max(8px,calc(var(--u)*9)) max(10px,calc(var(--u)*11));font-family:var(--f-sans),sans-serif;font-weight:300;font-size:max(13px,calc(var(--u)*11));color:#333;background:transparent;resize:none}
.fc input{margin-bottom:calc(var(--u)*10)}
.fc input::placeholder,.fc textarea::placeholder{color:#B5B0A8}
.fc .rw{display:flex;justify-content:space-between;align-items:center;margin-top:calc(var(--u)*10)}
.wand{width:34px;height:26px;border:0;border-radius:4px;background:#E9E5DA;font-size:12px;cursor:pointer}
.wbox{position:relative;max-width:calc(var(--u)*320);margin:calc(var(--u)*18) auto 0}
.wl2{max-height:calc(var(--u)*290);overflow-y:auto;display:grid;gap:calc(var(--u)*8);padding-right:34px;scrollbar-width:thin;scrollbar-color:#D8CBA8 transparent}
.wl2::-webkit-scrollbar{width:6px}
.wl2::-webkit-scrollbar-thumb{background:#D8CBA8;border-radius:6px}
.wi{border:1px solid #E1D8C3;background:rgba(255,255,255,.35);border-radius:3px;padding:calc(var(--u)*10) calc(var(--u)*12);text-align:left}
.wi .tp{display:flex;justify-content:space-between;gap:8px;align-items:baseline}
.wi b{font-weight:700;font-size:var(--s);color:var(--ink)}
.wi time{font-family:var(--f-sans),sans-serif;font-weight:300;font-size:10px;color:#C4B994;white-space:nowrap}
.wi p{margin-top:calc(var(--u)*6);font-family:var(--f-sans),sans-serif;font-weight:300;font-size:max(12px,calc(var(--u)*10));color:var(--gold);line-height:1.5;overflow-wrap:anywhere}
.tri{position:absolute;right:2px;width:24px;height:20px;border:0;background:none;padding:0;cursor:pointer;color:#D8CBA8}
.tri.u{top:0}.tri.d{bottom:0}

/* QUÀ */
.gb{background:none;border:0;cursor:pointer;display:block;margin:8px auto 0;color:inherit}
.gsvg{width:calc(var(--u)*240);max-width:70vw;animation:bob 3s ease-in-out infinite alternate}
@keyframes bob{to{transform:translateY(-6px)}}
.gb small{display:block;margin-top:4px;font-family:var(--f-sans),sans-serif;font-weight:500;font-size:var(--xs);color:var(--ink)}
.cl{font-size:var(--s);line-height:1.6;color:var(--ink);font-weight:600;margin-top:calc(var(--u)*18)}

/* DẢI HOA CHÂN TRANG */
.foot{position:relative;z-index:2;height:calc(var(--u)*170);margin-top:calc(var(--u)*-20);overflow:hidden}
.foot img{position:absolute;bottom:-6%;height:100%;width:auto;mix-blend-mode:multiply}

/* MODAL + NHẠC */
.modal{position:fixed;inset:0;z-index:70;background:rgba(40,50,30,.55);display:flex;align-items:center;justify-content:center;padding:20px}
.box{width:100%;max-width:360px;max-height:92vh;overflow:auto;background:var(--paper);color:var(--ink);border-radius:14px;padding:24px;text-align:left}
.box h3{text-align:center;font-weight:700;text-transform:uppercase;letter-spacing:.04em;font-size:15px;margin-bottom:16px}
.box label{display:block;font-size:13px;margin-bottom:12px}
.box input,.box select{width:100%;margin-top:4px;padding:10px 12px;border:1px solid #D9D2C3;border-radius:8px;font:inherit;background:#fff}
.seg{display:flex;gap:10px;margin-bottom:12px}
.seg label{flex:1;margin:0;text-align:center;border:1px solid #D9D2C3;border-radius:8px;padding:9px 4px;cursor:pointer;font-size:13px}
.seg label.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.seg input{position:absolute;opacity:0;width:0}
.qr{width:180px;height:180px;margin:12px auto;border:1px dashed var(--ink);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:12px;padding:12px;text-align:center;color:var(--gold)}
.qr img{width:100%;height:100%;object-fit:contain}
.mus{position:fixed;right:18px;bottom:18px;z-index:60;width:46px;height:46px;border-radius:50%;border:2px solid rgba(255,255,255,.25);background:radial-gradient(circle at 35% 30%,#8DA273,#43553A);color:#fff;font-size:18px;cursor:pointer;box-shadow:0 8px 22px rgba(0,0,0,.3)}
.mus.on{animation:spin 6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

.rv{opacity:0;transform:translateY(16px);transition:opacity .8s ease,transform .8s ease}
.rv.rv-in{opacity:1;transform:none}

/* điện thoại rất hẹp */
@container (max-width:340px){
  .meta{gap:calc(var(--u)*30)}
  .wn{padding:0 14%}
  .two{gap:calc(var(--u)*24)}
}
@media (prefers-reduced-motion:reduce){
  .cf .s,.gsvg,.mus.on,.hero-bg{transition:none;animation:none}
  .rv{opacity:1;transform:none;transition:none}
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

export default function BotanicalTemplate({ data, preview }: TemplateProps) {
  const W = useMemo(() => toBotanicalW(data), [data]);
  const th = { ...DEFAULTS, ...data.theme };
  const on = (k: string) => data.sections[k] !== false;

  const PHOTOS = data.media.photos.map((p) => p.url);
  const GROOM_IMG = data.media.groom_url;
  const BRIDE_IMG = data.media.bride_url;
  const BG = data.media.background_url; // ảnh nền giấy (tuỳ chọn)
  const MUSIC = data.media.music_url ?? "";
  const N = PHOTOS.length || 6;
  const dress = W.dressColors.length > 0 ? W.dressColors : DEFAULT_DRESS;

  const [a, setA] = useState(0);
  const [modal, setModal] = useState<null | "rsvp" | number>(null);
  const [left, setLeft] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const touch = useRef(0);
  const wishList = useRef<HTMLDivElement>(null);

  const root = useRef<HTMLDivElement>(null);
  useScrollReveal(root, ".sec > *");

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
  const countdown = s === null ? "" : `${Math.floor(s / 86400)} ngày ${Math.floor((s % 86400) / 3600)} giờ ${Math.floor((s % 3600) / 60)} phút ${s % 60} giây`;

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
      transform: `translateX(${o * 62}%) translateZ(${-ab * 110}px) rotateY(${-o * 30}deg)`,
      opacity: ab > 2 ? 0 : 1 - ab * 0.25,
      zIndex: 10 - ab,
      pointerEvents: ab > 2 ? "none" : "auto",
    };
  };

  const DateBlock = ({ label }: { label: string }) => (
    <>
      <div className="meta"><span>{label}</span><span>{weekday}</span></div>
      <div className="dt"><b>{dd}</b><i /><div><span>{monthLabel}</span><span>{y}</span></div></div>
      {W.lunar && <p className="lu">({W.lunar})</p>}
    </>
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
  const scrollWishes = (dy: number) => wishList.current?.scrollBy({ top: dy, behavior: "smooth" });

  const vars = { "--page": th.page, "--paper": th.paper, "--ink": th.ink, "--deep": th.deep, "--gold": th.gold, "--dim": th.dim } as React.CSSProperties;
  const colStyle: React.CSSProperties = BG
    ? { backgroundImage: `url(${BG})`, backgroundSize: "100% auto", backgroundRepeat: "repeat-y" }
    : { backgroundImage: TEXTURE };

  const decoStyle = (c: Deco): React.CSSProperties => ({
    top: c.top,
    width: `${c.w}%`,
    [c.side === "l" ? "left" : "right"]: c.ghost ? "-8%" : "-3%",
    transform: `rotate(${c.rot ?? 0}deg)${c.side === "r" ? " scaleX(-1)" : ""}`,
  });

  return (
    <div ref={root} className={`bt ${display.variable} ${serif.variable} ${sans.variable} ${script.variable}`} style={{ ...vars, fontFamily: "var(--f-serif),Georgia,serif" }}>
      <style>{CSS}</style>
      {MUSIC && <audio ref={audio} src={MUSIC} loop />}

      <main className="col" style={colStyle}>
        {/* Hoa lá trang trí hai bên lề + hoa mờ nền */}
        {DECOS.map((c, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={c.src} alt="" aria-hidden className={`fl ${c.ghost ? "ghost" : ""}`} style={decoStyle(c)} />
        ))}

        {/* HERO */}
        <section className="sec hero">
          <p className="wo">The wedding of</p>
          <div className="wreath hero-bg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={IMG.wreath} alt="" aria-hidden />
            <div className="wn">
              <p>{W.groom.short}</p>
              <span className="amp">&amp;</span>
              <p>{W.bride.short}</p>
            </div>
          </div>
        </section>

        {/* THÔNG TIN LỄ CƯỚI */}
        <section className="sec">
          <h2 className="hd">Thông tin lễ cưới</h2>
          <div className="pr">
            {[W.groom, W.bride].flatMap((p, i) => {
              const block = (
                <div key={`p${i}`}>
                  <p className="l">Ông Bà</p>
                  {p.parents.map((x) => <b key={x}>{x}</b>)}
                  {p.addr && <small>{p.addr}</small>}
                </div>
              );
              return i === 0 ? [block, <i key="sep" />] : [block];
            })}
          </div>
          <p className="inv">Kính mời quý vị đến dự bữa tiệc mừng ngày<br />chúng tôi nên duyên</p>

          {GROOM_IMG && <img className="pt" src={GROOM_IMG} alt={W.groom.full} />}
          <h3 className="nm">{W.groom.full}</h3>
          <span className="amp2">&amp;</span>
          {BRIDE_IMG && <img className="pt" src={BRIDE_IMG} alt={W.bride.full} />}
          <h3 className="nm" style={{ marginTop: 6 }}>{W.bride.full}</h3>

          <p className="cer">{W.ceremonyPlace || "Lễ thành hôn"}</p>
          <DateBlock label={`Vào lúc ${W.ceremonyTime}`} />
        </section>

        {/* ALBUM */}
        {on("album") && (
          <section className="sec" style={{ paddingTop: 10 }}>
            <h2 className="hd" style={{ fontSize: "var(--m)", marginBottom: 30 }}>Album ảnh</h2>
            <div className="cf"
              onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
              onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 40) setA((a + (dx < 0 ? 1 : N - 1)) % N); }}>
              <button className="nv" style={{ left: 4 }} onClick={() => setA((a + N - 1) % N)} aria-label="Ảnh trước">‹</button>
              {Array.from({ length: N }).map((_, i) => <div key={i} className="s" style={slide(i)} onClick={() => setA(i)} role="img" aria-label={`Ảnh cưới ${i + 1}`} />)}
              <button className="nv" style={{ right: 4 }} onClick={() => setA((a + 1) % N)} aria-label="Ảnh sau">›</button>
            </div>
            <p className="cnt">{a + 1} / {N}</p>
          </section>
        )}

        {/* THÔNG TIN TIỆC CƯỚI */}
        <section className="sec">
          <h2 className="hd">Thông tin tiệc cưới</h2>
          <p className="pt1">Tiệc cưới sẽ diễn ra vào lúc:</p>
          <DateBlock label={W.partyTime} />

          {on("countdown") && (
            <>
              <h3 className="cd-t">Cùng đếm ngược</h3>
              <p className="cd">{countdown || "…"}</p>
            </>
          )}

          <div className="two">
            <div><small>Đón khách</small><b>{W.guestTime}</b></div>
            <div><small>Khai tiệc</small><b>{W.partyTime}</b></div>
          </div>

          <div className="cal">
            <h3>Tháng {m} / {y}</h3>
            <div className="g">
              {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((x) => <div key={x} className="w">{x}</div>)}
              {cells.map((c, i) => <i key={i} className={c === day ? "on" : ""}><u>{c || ""}</u></i>)}
            </div>
          </div>
          <a className="lnk" href={calUrl} target="_blank" rel="noreferrer">Thêm vào lịch</a>
          <div style={{ marginTop: 14 }}><button className="btn" onClick={() => setModal("rsvp")}>Xác nhận tham dự</button></div>
        </section>

        {/* ĐỊA ĐIỂM */}
        {on("map") && (
          <section className="sec" style={{ paddingTop: 20 }}>
            <h2 className="hd" style={{ fontSize: "var(--m)", marginBottom: 8 }}>Tiệc cưới sẽ tổ chức tại</h2>
            <p className="vn">{W.venue}</p>
            <p className="vn">{W.address}</p>
            <iframe className="mapbox" title="Bản đồ" src={mapEmbed} loading="lazy" />
            <a className="dir" href={mapUrl} target="_blank" rel="noreferrer">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M21 3 3 10.5l7 3 3 7z" /></svg>
              Chỉ đường
            </a>
          </section>
        )}

        {/* DRESS CODE */}
        {on("dresscode") && (
          <section className="sec" style={{ paddingTop: 20 }}>
            <h2 className="hd" style={{ marginBottom: 4 }}>Dress code</h2>
            {W.dress && <p className="vn">{W.dress}</p>}
            <div className="dc">{dress.map((c) => <i key={c} style={{ background: c }} />)}</div>
          </section>
        )}

        {/* LỊCH TRÌNH */}
        {on("schedule") && W.schedule.length > 0 && (
          <section className="sec" style={{ paddingTop: 24 }}>
            <h2 className="hd" style={{ marginBottom: 14 }}>Lịch trình ngày cưới</h2>
            <div className="tl">{W.schedule.map((x, i) => <div key={i}><span>{x.t}</span><i /><span>{x.n}</span></div>)}</div>
          </section>
        )}

        {/* SỔ LƯU BÚT */}
        {on("guestbook") && (
          <section className="sec" style={{ paddingTop: 24 }}>
            <h2 className="hd" style={{ fontSize: "var(--m)" }}>Sổ lưu bút</h2>
            <div className="fc">
              <input placeholder="Nhập tên*" value={wish.name} onChange={(e) => setWish({ ...wish, name: e.target.value })} maxLength={150} />
              <textarea rows={4} placeholder="Nhập lời chúc*" value={wish.text} onChange={(e) => setWish({ ...wish, text: e.target.value })} maxLength={1000} />
              <div className="rw">
                <button className="wand" onClick={suggest} aria-label="Gợi ý lời chúc" title="Gợi ý lời chúc">🪄</button>
                <button className="btn" onClick={sendWish}>Gửi lời chúc</button>
              </div>
            </div>
            {wishes.length > 0 && (
              <div className="wbox">
                <button className="tri u" onClick={() => scrollWishes(-140)} aria-label="Cuộn lên"><svg viewBox="0 0 24 20"><path d="M12 2 23 18H1z" fill="currentColor" /></svg></button>
                <div className="wl2" ref={wishList}>
                  {wishes.map((x, i) => (
                    <div className="wi" key={i}>
                      <div className="tp"><b>{x.name}</b><time>{stamp(x.at)}</time></div>
                      <p>{x.text}</p>
                    </div>
                  ))}
                </div>
                <button className="tri d" onClick={() => scrollWishes(140)} aria-label="Cuộn xuống"><svg viewBox="0 0 24 20"><path d="M12 18 1 2h22z" fill="currentColor" /></svg></button>
              </div>
            )}
          </section>
        )}

        {/* HỘP QUÀ */}
        {on("gifts") && W.gifts.length > 0 && (
          <section className="sec" style={{ paddingTop: 24, paddingBottom: 10 }}>
            <h2 className="hd" style={{ fontSize: "var(--m)", marginBottom: 0 }}>Hộp quà mừng</h2>
            <button className="gb" onClick={() => setModal(0)} aria-label="Mở hộp quà mừng"><GiftBox /><small>Nhấn để mở</small></button>
          </section>
        )}
        <section className="sec" style={{ paddingTop: 0, paddingBottom: 30 }}>
          <p className="cl">{W.closing || "Sự hiện diện của quý khách là niềm vinh hạnh của gia đình chúng tôi!"}</p>
        </section>

        {/* DẢI HOA CHÂN TRANG */}
        <div className="foot" aria-hidden>
          <img src={IMG.footerFlower} alt="" style={{ width: "100%", left: "0%", transform: "scaleX(-1)" }} />
        </div>
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
                <div style={{ textAlign: "center", marginTop: 18 }}><button className="btn lg" onClick={() => setModal(null)}>Đóng</button></div>
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
                <div style={{ textAlign: "center" }}><button className="btn lg" onClick={sendRsvp}>Gửi xác nhận</button></div>
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
                <p className="gold" style={{ fontSize: 14 }}>{W.gifts[modal].name}</p>
                <div style={{ marginTop: 18 }}><button className="btn lg" onClick={() => setModal(null)}>Đóng</button></div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}