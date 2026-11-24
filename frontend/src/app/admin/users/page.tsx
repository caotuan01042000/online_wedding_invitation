"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError, type Paged } from "@/lib/api";
import Modal from "@/components/admin/Modal";
import Field from "@/components/admin/Field";

interface U {
    id: string;
    username: string;
    email: string | null;
    full_name: string | null;
    phone: string | null;
    role: "admin" | "user";
    is_active: boolean;
    created_at: string;
    last_login_at: string | null;
}

const PAGE_SIZE = 10;
const fmt = (s: string | null) => (s ? new Date(s).toLocaleString("vi-VN") : "–");
const msg = (e: unknown) => (e instanceof Error ? e.message : "Có lỗi xảy ra");

export default function UsersPage() {
    const [me, setMe] = useState("");
    const [qInput, setQInput] = useState("");
    const [q, setQ] = useState("");
    const [role, setRole] = useState("");
    const [page, setPage] = useState(1);
    const [reload, setReload] = useState(0);
    const [data, setData] = useState<Paged<U> | null>(null);
    const [error, setError] = useState("");
    const [modal, setModal] = useState<null | "create" | U>(null); // U = reset password for that user

    useEffect(() => {
        api<{ id: string }>("/api/auth/me").then((u) => setMe(u.id)).catch(() => { });
    }, []);

    useEffect(() => {
        let stale = false;
        const qs = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
        if (q) qs.set("q", q);
        if (role) qs.set("role", role);
        api<Paged<U>>(`/api/admin/users?${qs}`)
            .then((d) => { if (!stale) { setData(d); setError(""); } })
            .catch((e) => { if (!stale) setError(msg(e)); });
        return () => { stale = true; };
    }, [q, role, page, reload]);

    const run = async (fn: () => Promise<unknown>) => {
        setError("");
        try { await fn(); setReload((n) => n + 1); } catch (e) { setError(msg(e)); }
    };
    const patch = (u: U, body: object) => run(() => api(`/api/admin/users/${u.id}`, { method: "PATCH", body: JSON.stringify(body) }));
    const remove = (u: U) => { if (confirm(`Xóa người dùng "${u.username}"?`)) run(() => api(`/api/admin/users/${u.id}`, { method: "DELETE" })); };

    const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

    return (
        <>
            <h1>Người dùng</h1>
            <div className="bar">
                <form onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(qInput.trim()); }}>
                    <input placeholder="Tìm theo tên đăng nhập, email, họ tên..." value={qInput} onChange={(e) => setQInput(e.target.value)} />
                    <button className="b g">Tìm</button>
                </form>
                <select value={role} onChange={(e) => { setPage(1); setRole(e.target.value); }} aria-label="Lọc theo vai trò">
                    <option value="">Mọi vai trò</option>
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                </select>
                <button className="b" onClick={() => setModal("create")}>+ Thêm người dùng</button>
            </div>

            {error && <p className="err" role="alert">{error}</p>}

            <div className="tw">
                <table>
                    <thead>
                        <tr><th>Tên đăng nhập</th><th>Họ tên</th><th>Email</th><th>Vai trò</th><th>Trạng thái</th><th>Đăng nhập gần nhất</th><th /></tr>
                    </thead>
                    <tbody>
                        {data?.items.map((u) => {
                            const self = u.id === me;
                            return (
                                <tr key={u.id}>
                                    <td>{u.username}{self && " (bạn)"}</td>
                                    <td>{u.full_name || "–"}</td>
                                    <td>{u.email || "–"}</td>
                                    <td>
                                        <select value={u.role} disabled={self} onChange={(e) => patch(u, { role: e.target.value })} aria-label={`Vai trò của ${u.username}`}>
                                            <option value="user">User</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </td>
                                    <td><span className={`tag ${u.is_active ? "" : "off"}`}>{u.is_active ? "Hoạt động" : "Đã khóa"}</span></td>
                                    <td>{fmt(u.last_login_at)}</td>
                                    <td>
                                        <div className="acts">
                                            <button className="b g s" disabled={self} onClick={() => patch(u, { is_active: !u.is_active })}>{u.is_active ? "Khóa" : "Mở khóa"}</button>
                                            <button className="b g s" onClick={() => setModal(u)}>Đặt lại MK</button>
                                            <button className="b d s" disabled={self} onClick={() => remove(u)}>Xóa</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {data && data.items.length === 0 && <tr><td colSpan={7}>Không có người dùng nào.</td></tr>}
                        {!data && !error && <tr><td colSpan={7}>Đang tải...</td></tr>}
                    </tbody>
                </table>
            </div>

            <div className="pg">
                <span>Tổng {data?.total ?? 0} · Trang {page}/{pages}</span>
                <button className="b g s" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹ Trước</button>
                <button className="b g s" disabled={page >= pages} onClick={() => setPage(page + 1)}>Sau ›</button>
            </div>

            {modal === "create" && (
                <Modal title="Thêm người dùng" onClose={() => setModal(null)}>
                    <CreateUserForm onClose={() => setModal(null)} onDone={() => { setModal(null); setReload((n) => n + 1); }} />
                </Modal>
            )}
            {modal && modal !== "create" && (
                <Modal title={`Đặt lại mật khẩu: ${modal.username}`} onClose={() => setModal(null)}>
                    <ResetPasswordForm user={modal} onClose={() => setModal(null)} />
                </Modal>
            )}
        </>
    );
}

const EMPTY = { username: "", email: "", password: "", full_name: "", phone: "", role: "user" };

function CreateUserForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
    const [f, setF] = useState(EMPTY);
    const [fields, setFields] = useState<Record<string, string>>({});
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

    const submit = async (ev: FormEvent) => {
        ev.preventDefault();
        setBusy(true); setError(""); setFields({});
        try {
            await api("/api/admin/users", { method: "POST", body: JSON.stringify(f) });
            onDone();
        } catch (e) {
            if (e instanceof ApiError) setFields(e.fields ?? {});
            setError(msg(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit} noValidate>
            <Field label="Tên đăng nhập" error={fields.username}><input value={f.username} onChange={set("username")} autoComplete="off" /></Field>
            <Field label="Email" error={fields.email}><input type="email" value={f.email} onChange={set("email")} autoComplete="off" /></Field>
            <Field label="Mật khẩu (8-72 ký tự)" error={fields.password}><input type="password" value={f.password} onChange={set("password")} autoComplete="new-password" /></Field>
            <Field label="Họ và tên" error={fields.full_name}><input value={f.full_name} onChange={set("full_name")} /></Field>
            <Field label="Số điện thoại" error={fields.phone}><input value={f.phone} onChange={set("phone")} /></Field>
            <Field label="Vai trò" error={fields.role}>
                <select value={f.role} onChange={set("role")}><option value="user">User</option><option value="admin">Admin</option></select>
            </Field>
            {error && <p className="err" role="alert">{error}</p>}
            <div className="row">
                <button type="button" className="b g" onClick={onClose}>Hủy</button>
                <button className="b" disabled={busy}>{busy ? "Đang tạo..." : "Tạo"}</button>
            </div>
        </form>
    );
}

function ResetPasswordForm({ user, onClose }: { user: U; onClose: () => void }) {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);
    const [busy, setBusy] = useState(false);

    const submit = async (ev: FormEvent) => {
        ev.preventDefault();
        setBusy(true); setError("");
        try {
            await api(`/api/admin/users/${user.id}/reset-password`, { method: "POST", body: JSON.stringify({ password }) });
            setDone(true);
        } catch (e) {
            setError(e instanceof ApiError && e.fields?.password ? e.fields.password : msg(e));
        } finally {
            setBusy(false);
        }
    };

    if (done) return (<><p>Đã đặt lại mật khẩu cho {user.username}.</p><div className="row"><button className="b" onClick={onClose}>Đóng</button></div></>);

    return (
        <form onSubmit={submit}>
            <Field label="Mật khẩu mới (8-72 ký tự)"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></Field>
            {error && <p className="err" role="alert">{error}</p>}
            <div className="row">
                <button type="button" className="b g" onClick={onClose}>Hủy</button>
                <button className="b" disabled={busy}>{busy ? "Đang lưu..." : "Lưu"}</button>
            </div>
        </form>
    );
}