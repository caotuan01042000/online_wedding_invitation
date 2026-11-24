"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import InvitationForm, { fromDetail, type Detail, type FormState, type Tpl } from "@/components/admin/InvitationForm";
import MediaManager, { type MediaItem } from "@/components/admin/MediaManager";

const msg = (e: unknown) => (e instanceof Error ? e.message : "Có lỗi xảy ra");

export default function EditInvitationPage() {
  const { id } = useParams<{ id: string }>();
  const [tpls, setTpls] = useState<Tpl[] | null>(null);
  const [initial, setInitial] = useState<FormState | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [error, setError] = useState("");

  const reloadMedia = useCallback(
    () =>
      api<{ items: MediaItem[] }>(`/api/admin/invitations/${id}/media`)
        .then((d) => setMedia(d.items))
        .catch((e) => setError(msg(e))),
    [id],
  );

  useEffect(() => {
    // all templates (not only active ones): this invitation may use one that was switched off
    Promise.all([api<{ items: Tpl[] }>("/api/admin/templates"), api<Detail>(`/api/admin/invitations/${id}`)])
      .then(([t, d]) => { setTpls(t.items); setInitial(fromDetail(d)); })
      .catch((e) => setError(msg(e)));
    reloadMedia();
  }, [id, reloadMedia]);

  const save = async (body: object) => {
    await api(`/api/admin/invitations/${id}`, { method: "PUT", body: JSON.stringify(body) });
  };

  return (
    <>
      <h1>Sửa thiệp cưới</h1>
      {error && <p className="err" role="alert">{error}</p>}
      {!initial && !error && <p>Đang tải...</p>}
      {tpls && initial && (
        <>
          <div className="acts" style={{ marginBottom: 16 }}>
            <a className="b g" href={`/preview/${id}`} target="_blank" rel="noreferrer">Xem thiệp</a>
          </div>
          <InvitationForm mode="edit" templates={tpls} initial={initial} qrOptions={media.filter((m) => m.kind === "qr")} onSubmit={save} />
          <MediaManager invitationId={id} items={media} onChange={reloadMedia} />
        </>
      )}
    </>
  );
}