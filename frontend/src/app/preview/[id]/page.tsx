"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { registry } from "@/components/invitation/registry";
import type { InvitationData } from "@/types/invitation";

export default function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<InvitationData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<InvitationData>(`/api/admin/invitations/${id}/render`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Có lỗi xảy ra"));
  }, [id]);

  if (error) return <p style={{ padding: 24 }}>{error}</p>;
  if (!data) return <p style={{ padding: 24 }}>Đang tải thiệp...</p>;

  const Template = registry[data.template.code];
  if (!Template) return <p style={{ padding: 24 }}>Template “{data.template.code}” chưa có giao diện trong registry.</p>;

  return <Template data={data} preview />;
}