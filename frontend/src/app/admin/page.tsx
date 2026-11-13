"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (r) => {
        if (!r.ok) return router.replace("/login");
        const d = await r.json();
        setUser(d.username);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  if (!user) return <p style={{ padding: 24 }}>Đang kiểm tra phiên đăng nhập...</p>;

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Trang quản trị</h1>
      <p>Xin chào, {user}</p>
      <button onClick={logout}>Đăng xuất</button>
      {/* TODO: danh sách RSVP, lời chúc */}
    </main>
  );
}