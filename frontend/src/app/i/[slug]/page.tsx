import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { registry } from "@/components/invitation/registry";
import type { InvitationData } from "@/types/invitation";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8080";

// cache(): generateMetadata and the page share one request.
const load = cache(async (slug: string): Promise<InvitationData | null> => {
  const res = await fetch(`${BACKEND}/api/public/invitations/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("không tải được thiệp");
  return res.json();
});

// params is a Promise in this Next version
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) return { title: "Không tìm thấy thiệp" };
  return {
    title: data.title,
    openGraph: { title: data.title, images: data.media.cover_url ? [data.media.cover_url] : [] }, // preview on Zalo / Facebook
  };
}

export default async function InvitationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) notFound();

  const Template = registry[data.template.code];
  if (!Template) notFound();

  return <Template data={data} />;
}