"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Small floating bar: shows an "Admin" link for admins and a logout button for everyone logged in.
export default function TopBar() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (r) => { if (r.ok) setRole((await r.json()).role); })
      .catch(() => {});
  }, []);

  if (!role) return null;

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  const style: React.CSSProperties = {
    padding: "6px 14px", borderRadius: 999, border: "1px solid rgba(255,255,255,.6)",
    background: "rgba(0,0,0,.55)", color: "#fff", fontSize: 13, cursor: "pointer", textDecoration: "none",
  };

  return (
    <div style={{ position: "fixed", top: 12, left: 12, zIndex: 80, display: "flex", gap: 8 }}>
      {role === "admin" && <Link href="/admin" style={style}>Trang quản trị</Link>}
      <button onClick={logout} style={style}>Đăng xuất</button>
    </div>
  );
}