"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Montserrat, Lobster } from "next/font/google";
import "./home.css";

const sans = Montserrat({ subsets: ["vietnamese", "latin"], weight: ["300", "400", "500", "700"], variable: "--f-sans" });
const script = Lobster({ subsets: ["vietnamese", "latin"], weight: "400", variable: "--f-script" });

interface Me { username: string; full_name: string | null; role: "admin" | "user" }

// Mẫu thật (ready) trỏ tới trang xem thử. Sau này thay bằng API công khai /api/public/templates.
const TEMPLATES = [
  { code: "rose", name: "Hồng phấn", a: "#FDEEF2", b: "#E8668B", href: "/", ready: true },
  { code: "dragon", name: "Rồng phượng", a: "#4A1B2D", b: "#F2B8C6", href: "/template", ready: true },
  { code: "green", name: "Song Hỷ - Xanh", a: "#18281A", b: "#E8D3A0", href: "", ready: false },
  { code: "cream", name: "Tối giản - Nâu", a: "#F4EBDD", b: "#B08968", href: "", ready: false },
  { code: "peony", name: "Mẫu đơn", a: "#FFE3EA", b: "#C2185B", href: "", ready: false },
];

const STEPS = [
  { n: 1, t: "Chọn mẫu", d: "Thiệp đậm chất Việt Nam, đổi mẫu lúc nào cũng được" },
  { n: 2, t: "Điền thông tin", d: "Tên cô dâu chú rể, ngày giờ, địa điểm, ảnh cưới" },
  { n: 3, t: "Gửi thiệp", d: "Chia sẻ link qua Zalo, Messenger ngay lập tức" },
];

const FAQ = [
  ["Thiệp cưới online được sử dụng như thế nào?", "Bạn nhập thông tin một lần, hệ thống tạo ra một đường link. Gửi link cho khách, khách mở trên điện thoại để xem thiệp, xem bản đồ và xác nhận tham dự."],
  ["Tôi có cần biết lập trình hay thiết kế không?", "Không. Bạn chỉ điền form và chọn mẫu, phần giao diện đã có sẵn."],
  ["Tôi cần chuẩn bị những thông tin gì?", "Tên và thông tin gia đình hai bên, giờ lễ, giờ tiệc, địa điểm, ảnh cưới, tài khoản nhận mừng cưới nếu có."],
  ["Có chỉnh sửa được sau khi xuất bản không?", "Có. Link thiệp giữ nguyên, khách luôn xem được bản mới nhất."],
];

export default function HomePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [a, setA] = useState(0);
  const N = TEMPLATES.length;

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (r) => { if (r.ok) setMe(await r.json()); })
      .catch(() => {});
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  const slide = (i: number): React.CSSProperties => {
    let o = i - a;
    if (o > N / 2) o -= N;
    if (o < -N / 2) o += N;
    const ab = Math.abs(o);
    return {
      background: `linear-gradient(160deg,${TEMPLATES[i].a},${TEMPLATES[i].b})`,
      transform: `translateX(${o * 62}%) translateZ(${-ab * 160}px) rotateY(${-o * 34}deg)`,
      opacity: ab > 2 ? 0 : 1 - ab * 0.3,
      zIndex: 10 - ab,
      pointerEvents: ab > 2 ? "none" : "auto",
    };
  };

  const cur = TEMPLATES[a];

  return (
    <div className={`hm ${sans.variable} ${script.variable}`}>
      {/* HEADER */}
      <header className="top">
        <Link href="/home" className="logo"><span className="mark">♥</span><span className="script">Thiệp Cưới</span></Link>
        <nav>
          <a href="#mau">Mẫu thiệp</a>
          <a href="#buoc">Cách làm</a>
          <a href="#faq">Hỏi đáp</a>
        </nav>
        <div className="who">
          {me && <span className="hello">Xin chào, {me.full_name || me.username}</span>}
          {me?.role === "admin" && <Link href="/admin" className="btn ghost sm">Trang quản trị</Link>}
          <button className="btn sm" onClick={logout}>Đăng xuất</button>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="hero-txt">
          <h1>Làm thiệp cưới online <span className="script pk">miễn phí</span></h1>
          <p className="quote">“Cuộc sống hối hả, nhưng tình người vẫn vẹn nguyên”</p>
          <p className="dim">Mảnh ghép hiện đại của truyền thống mời cưới: gửi tấm chân tình nhanh hơn, xa hơn, đến nhiều người hơn.</p>
          <div className="cta">
            <Link href="/template" className="btn lg">Tạo thiệp ngay</Link>
            <a href="#mau" className="btn ghost lg">Xem mẫu</a>
          </div>
        </div>
        <div className="phones" aria-hidden>
          <div className="phone p1"><i /><b /><em /></div>
          <div className="phone p2"><i /><b /><em /></div>
        </div>
      </section>

      {/* CAROUSEL MẪU */}
      <section id="mau" className="sec">
        <h2>Mẫu thiệp cưới online <span className="script pk">đẹp nhất</span></h2>
        <p className="dim sub">Khám phá những mẫu thiệp được thiết kế tinh tế và hiện đại</p>
        <div className="cf">
          <button className="nv l" onClick={() => setA((a + N - 1) % N)} aria-label="Mẫu trước">‹</button>
          {TEMPLATES.map((t, i) => (
            <div key={t.code} className="s" style={slide(i)} onClick={() => setA(i)} role="img" aria-label={t.name}>
              <span>{t.name}</span>
              {!t.ready && <em>Sắp ra mắt</em>}
            </div>
          ))}
          <button className="nv r" onClick={() => setA((a + 1) % N)} aria-label="Mẫu sau">›</button>
        </div>
        <div className="dots">
          {TEMPLATES.map((t, i) => <button key={t.code} className={i === a ? "on" : ""} onClick={() => setA(i)} aria-label={`Chọn ${t.name}`} />)}
        </div>
        <p className="cur">{cur.name}</p>
        {cur.ready
          ? <Link href={cur.href} className="btn ghost">Xem thử mẫu này</Link>
          : <span className="dim">Mẫu này đang được thiết kế</span>}
      </section>

      {/* 3 BƯỚC */}
      <section id="buoc" className="sec dark">
        <h2>Làm thiệp cưới điện tử miễn phí <span className="script pk">&amp; quản lý khách mời</span></h2>
        <p className="dim sub">Giữ nét đẹp truyền thống · Tiện lợi thời hiện đại</p>
        <ol className="steps">
          {STEPS.map((s) => (
            <li key={s.n}>
              <span className="ic">{s.n}</span>
              <div><small>Bước {s.n}</small><b>{s.t}</b><p className="dim">{s.d}</p></div>
            </li>
          ))}
        </ol>
        <Link href="/template" className="btn lg">Bắt đầu tạo thiệp</Link>
      </section>

      {/* RSVP */}
      <section className="sec split">
        <div>
          <span className="badge">Quản lý khách &amp; RSVP · Sắp có</span>
          <h2 className="left">Biết ai sẽ đến, <span className="script pk">tiệc cưới nhẹ tênh</span></h2>
          <p className="dim">Gửi lời mời thật trang trọng, rồi yên tâm chuẩn bị. Khỏi phải lục tin nhắn đếm ai đi ai không.</p>
          <ul className="ticks">
            <li>Khách xác nhận có đến hay không, kèm số người đi cùng</li>
            <li>Khách gửi lời chúc ngay trên thiệp</li>
            <li>Xem tổng số khách và danh sách phản hồi trong nháy mắt</li>
            <li>Xuất danh sách ra CSV</li>
          </ul>
        </div>
        <div className="stat" aria-hidden>
          <small>QUẢN LÝ KHÁCH (dữ liệu minh họa)</small>
          <p>RSVP tự gom về một nơi</p>
          <div className="big"><b>58</b><span>người dự tiệc</span></div>
          <div className="bar"><i style={{ width: "84%" }} /></div>
          <div className="trio">
            <div className="ok"><b>24</b>Có đến</div>
            <div className="no"><b>3</b>Không đến</div>
            <div><b>5</b>Chưa trả lời</div>
          </div>
        </div>
      </section>

      {/* ĐỔI MẪU */}
      <section className="sec split dark">
        <div>
          <span className="badge">Đổi mẫu tự do</span>
          <h2 className="left">Đổi mẫu không cần <span className="script pk">nhập lại thông tin</span></h2>
          <p className="dim">Chọn mẫu khác bất cứ lúc nào. Tên, ngày giờ, địa điểm và ảnh cưới đều được giữ nguyên, chỉ có thiết kế thay đổi.</p>
          <ul className="ticks">
            <li>Mọi thông tin đã nhập được giữ nguyên</li>
            <li>Đổi bao nhiêu lần cũng được</li>
            <li>Link thiệp đã gửi không đổi, khách vẫn xem được bản mới nhất</li>
          </ul>
          <div className="cta"><Link href="/template" className="btn">Tạo thiệp miễn phí</Link><a href="#mau" className="btn ghost">Xem tất cả mẫu</a></div>
        </div>
        <div className="mini" style={{ background: `linear-gradient(160deg,${TEMPLATES[2].a},${TEMPLATES[2].b})` }} aria-hidden>
          <span>WELCOME TO OUR WEDDING</span><b>Minh Tuấn &amp; Ngọc Anh</b>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="sec">
        <h2>Câu hỏi <span className="script pk">thường gặp</span></h2>
        <div className="faq">
          {FAQ.map(([q, ans]) => (
            <details key={q}><summary>{q}</summary><p className="dim">{ans}</p></details>
          ))}
        </div>
      </section>

      <footer className="foot">
        <div><span className="script pk" style={{ fontSize: 26 }}>Thiệp Cưới</span><p className="dim">Làm thiệp cưới online sang trọng, không cần kỹ năng thiết kế.</p></div>
        <p className="dim">© {new Date().getFullYear()} Thiệp Cưới Online</p>
      </footer>
    </div>
  );
}