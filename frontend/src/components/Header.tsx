
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Me {
  username: string;
  full_name: string | null;
  role: "admin" | "user";
}

export default function Header() {
  const [me, setMe] = useState<Me | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch("/api/auth/me");

        if (res.ok) {
          const data = await res.json();
          setMe(data);
        }
      } catch (err) {
        console.error("Không thể lấy thông tin user:", err);
      }
    };

    fetchMe();
  }, []);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <header className="top">
      <Link href="/home" className="logo">
        <span className="mark">♥</span>
        <span className="script">Thiệp Cưới</span>
      </Link>

      <nav>
        <a href="/list-templates">Mẫu thiệp</a>
        <a href="#buoc">Cách làm</a>
        <a href="#faq">Hỏi đáp</a>
      </nav>

      <div className="who">
        {me && (
          <span className="hello">
            Xin chào, {me.full_name || me.username}
          </span>
        )}

        {me?.role === "admin" && (
          <Link href="/admin" className="btn ghost sm">
            Trang quản trị
          </Link>
        )}

        <button className="btn sm" onClick={logout}>
          Đăng xuất
        </button>
      </div>
    </header>
  );
}
