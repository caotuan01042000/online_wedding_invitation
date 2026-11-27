"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Montserrat, Lobster } from "next/font/google";
import "./list-templates.css";


const sans = Montserrat({ subsets: ["vietnamese", "latin"], weight: ["300", "400", "500", "700"], variable: "--f-sans" });
const script = Lobster({ subsets: ["vietnamese", "latin"], weight: "400", variable: "--f-script" });

interface Me { username: string; full_name: string | null; role: "admin" | "user" }

// Mẫu thật (ready) trỏ tới trang xem thử. Sau này thay bằng API công khai /api/public/templates.
// Dữ liệu tạm: thay bằng kết quả API khi backend sẵn sàng.
const TEMPLATES = [
  { code: "rose", name: "Hoàng Long & Bảo Ngọc", href: "/template?code=rose" },
  { code: "cream", name: "Hoàng Nam & Thảo Vy", href: "/template?code=cream" },
  { code: "green", name: "Hải Nam & Khánh Linh", href: "/template?code=green" },
  { code: "dragon", name: "Trung Hiếu & Thanh Hà", href: "/template?code=dragon" },
  { code: "gold", name: "Tuấn Kiệt & Thu Hà", href: "/template?code=gold" },
  { code: "pink", name: "Minh Quân & Thu Hà", href: "/template?code=pink" },
  { code: "red", name: "Gia Khánh & Quỳnh Anh", href: "/template?code=red" },
  { code: "leaf", name: "Minh Quân & Ngọc Anh", href: "/template?code=leaf" },
  { code: "ivory", name: "Xuân Trường & Mai Anh", href: "/template?code=ivory" },
  { code: "wine", name: "Tuấn Kiệt & Thanh Hà", href: "/template?code=wine" },
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

export default function ListTemplate() {

  const [me, setMe] = useState<Me | null>(null);


  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (r) => { if (r.ok) setMe(await r.json()); })
      .catch(() => {});
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <div className={`hm ${sans.variable} ${script.variable}`}>
      {/* DANH SÁCH MẪU */}
      <section id="mau" className="gallery">
        <div className="gallery-heading">
          <h1>Mẫu thiệp mời đám cưới</h1>
          <p>Tạo miễn phí · Thử 3 ngày · Đẹp mới thanh toán</p>
          <small>Bạn có thể đổi mẫu bất cứ lúc nào khi chỉnh sửa</small>
        </div>
        <div className="template-grid">
          {TEMPLATES.map((t, i) => (
            <Link key={t.code} href={t.href} className={`template-card theme-${i}`}>
              <div className="template-art">
                <span className="template-badge">{i < 3 ? "Hot" : "Mới"}</span>
                <span className="template-kicker">SAVE THE DATE</span>
                <span className="template-ornament">囍</span>
                <span className="template-frame"><span>♥</span></span>
                <span className="template-names">{t.name}</span>
              </div>
            </Link>
          ))}
        </div>
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
        <div className="mini" style={{ background: "linear-gradient(160deg,#173b2b,#d8c8a0)" }} aria-hidden>
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