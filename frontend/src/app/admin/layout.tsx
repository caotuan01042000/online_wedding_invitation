"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import "./admin.css";

const MENU = [
  { href: "/admin", label: "Tổng quan", exact: true },
  { href: "/admin/users", label: "Người dùng" },
  { href: "/admin/templates", label: "Mẫu thiệp" },
  { href: "/admin/invitations", label: "Thiệp cưới" },
  // Phase 2: { href: "/admin/invitations", label: "Thiệp cưới" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [name, setName] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (r) => {
        if (!r.ok) return;
        const u = await r.json();
        setName(u.full_name || u.username);
      })
      .catch(() => {});
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  return (
    <div className="ad">
      <nav>
        <h2>Thiệp cưới · Admin</h2>
        {MENU.map((m) => {
          const on = m.exact ? path === m.href : path.startsWith(m.href);
          return <Link key={m.href} href={m.href} className={on ? "on" : ""}>{m.label}</Link>;
        })}
        <a href="#" onClick={(e) => { e.preventDefault(); logout(); }}>Đăng xuất</a>
        <div className="who">{name}</div>
      </nav>
      <div className="main">{children}</div>
    </div>
  );
}