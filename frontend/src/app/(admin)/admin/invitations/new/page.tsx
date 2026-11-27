"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import InvitationForm, { emptyForm, type Tpl } from "@/components/admin/InvitationForm";

export default function NewInvitationPage() {
  const router = useRouter();
  const [tpls, setTpls] = useState<Tpl[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ items: Tpl[] }>("/api/admin/templates?is_active=true")
      .then((d) => setTpls(d.items))
      .catch((e) => setError(e instanceof Error ? e.message : "Có lỗi xảy ra"));
  }, []);

  const create = async (body: object) => {
    const res = await api<{ id: string }>("/api/admin/invitations", { method: "POST", body: JSON.stringify(body) });
    router.replace(`/admin/invitations/${res.id}/edit`); // next step: upload photos, music, QR
  };

  return (
    <>
      <h1>Tạo thiệp cưới</h1>
      {error && <p className="err" role="alert">{error}</p>}
      {!tpls && !error && <p>Đang tải...</p>}
      {tpls && <InvitationForm mode="create" templates={tpls} initial={emptyForm(tpls[0]?.id ?? "")} onSubmit={create} />}
    </>
  );
}