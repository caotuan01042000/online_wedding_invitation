"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { landing } from "@/lib/auth";            
import "../auth.css";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Already logged in -> go straight to the target page
  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (r) => {
        if (!r.ok) return;
        const u = await r.json();
        router.replace(landing(u.role));

      })
      .catch(() => {});
  }, [router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Đăng nhập thất bại");
      router.replace(landing(data.role));
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="lg">
      <form onSubmit={submit}>
        <h1>Đăng nhập</h1>
        <label>
          Tài khoản
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
        </label>
        <label>
          Mật khẩu
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        <div className="err" role="alert">{error}</div>
        <button disabled={loading}>{loading ? "Đang đăng nhập..." : "Đăng nhập"}</button>
        <p className="alt">Chưa có tài khoản? <Link href="/register">Đăng ký</Link></p>
      </form>
    </main>
  );
}