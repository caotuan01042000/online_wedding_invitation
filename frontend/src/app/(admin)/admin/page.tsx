"use client";

import { useEffect, useState } from "react";
import { api, type Paged } from "@/lib/api";

export default function AdminHome() {
  const [stats, setStats] = useState<{ users: number; templates: number } | null>(null);

  useEffect(() => {
    Promise.all([
      api<Paged<unknown>>("/api/admin/users?page_size=1"),
      api<{ items: unknown[] }>("/api/admin/templates"),
    ])
      .then(([u, t]) => setStats({ users: u.total, templates: t.items.length }))
      .catch(() => {});
  }, []);

  return (
    <>
      <h1>Tổng quan</h1>
      <div className="grid">
        <div className="card stat"><p>Người dùng</p><b>{stats?.users ?? "–"}</b></div>
        <div className="card stat"><p>Mẫu thiệp</p><b>{stats?.templates ?? "–"}</b></div>
      </div>
    </>
  );
}