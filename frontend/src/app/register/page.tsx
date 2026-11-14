"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { homeFor, safeNext } from "@/lib/auth";
import "../auth.css";

type Fields = Partial<Record<"username" | "email" | "password" | "full_name" | "confirm", string>>;

export default function RegisterPage() {
  const router = useRouter();
  const [f, setF] = useState({ username: "", email: "", full_name: "", password: "", confirm: "" });
  const [fields, setFields] = useState<Fields>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  // Mirrors backend rules so most mistakes are caught before calling the API
  const validate = (): Fields => {
    const e: Fields = {};
    if (!/^[a-zA-Z0-9_.]{3,50}$/.test(f.username.trim())) e.username = "3-50 ký tự, chỉ gồm chữ, số, '_' hoặc '.'";
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = "Email không hợp lệ";
    if (f.password.length < 8 || f.password.length > 72) e.password = "Mật khẩu từ 8 đến 72 ký tự";
    if (f.confirm !== f.password) e.confirm = "Mật khẩu nhập lại không khớp";
    return e;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    setError("");
    const local = validate();
    setFields(local);
    if (Object.keys(local).length) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: f.username.trim(),
          email: f.email.trim(),
          password: f.password,
          full_name: f.full_name.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 422 && data.fields) setFields(data.fields); // server-side field errors
      if (!res.ok) throw new Error(data.error || "Đăng ký thất bại");
      router.replace(safeNext() ?? homeFor(data.role)); // backend already set the login cookie
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="lg">
      <form onSubmit={submit} noValidate>
        <h1>Đăng ký</h1>
        <label>
          Tên đăng nhập
          <input value={f.username} onChange={set("username")} autoComplete="username" />
          {fields.username && <span className="fe">{fields.username}</span>}
        </label>
        <label>
          Email
          <input type="email" value={f.email} onChange={set("email")} autoComplete="email" />
          {fields.email && <span className="fe">{fields.email}</span>}
        </label>
        <label>
          Họ và tên (không bắt buộc)
          <input value={f.full_name} onChange={set("full_name")} autoComplete="name" />
          {fields.full_name && <span className="fe">{fields.full_name}</span>}
        </label>
        <label>
          Mật khẩu
          <input type="password" value={f.password} onChange={set("password")} autoComplete="new-password" />
          {fields.password && <span className="fe">{fields.password}</span>}
        </label>
        <label>
          Nhập lại mật khẩu
          <input type="password" value={f.confirm} onChange={set("confirm")} autoComplete="new-password" />
          {fields.confirm && <span className="fe">{fields.confirm}</span>}
        </label>
        <div className="err" role="alert">{error}</div>
        <button disabled={loading}>{loading ? "Đang tạo tài khoản..." : "Đăng ký"}</button>
        <p className="alt">Đã có tài khoản? <Link href="/login">Đăng nhập</Link></p>
      </form>
    </main>
  );
}