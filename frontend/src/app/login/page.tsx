"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const CSS = `
.lg{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#FDEEF2;font-family:system-ui,sans-serif;color:#3B1F2B}
.lg form{width:100%;max-width:360px;background:#fff;border-radius:20px;padding:32px;box-shadow:0 20px 60px -30px rgba(184,58,99,.5)}
.lg h1{margin:0 0 24px;font-size:22px;text-align:center;font-weight:500}
.lg label{display:block;font-size:14px;margin-bottom:16px}
.lg input{width:100%;box-sizing:border-box;margin-top:4px;padding:10px 14px;border:1px solid rgba(232,102,139,.4);border-radius:12px;font:inherit}
.lg input:focus-visible,.lg button:focus-visible{outline:2px solid #B83A63;outline-offset:2px}
.lg button{width:100%;border:0;border-radius:999px;background:#B83A63;color:#fff;padding:12px;font:inherit;font-weight:500;cursor:pointer}
.lg button:disabled{opacity:.6;cursor:default}
.lg .err{min-height:20px;margin-bottom:12px;font-size:14px;color:#c0392b}
`;

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Đã đăng nhập thì vào thẳng admin
  useEffect(() => {
    fetch("/api/auth/me").then((r) => {
      if (r.ok) router.replace("/admin");
    });
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
      router.replace("/admin");
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="lg">
      <style>{CSS}</style>
      <form onSubmit={submit}>
        <h1>Đăng nhập quản trị</h1>
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
      </form>
    </main>
  );
}