import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

// Only logged-in users may open these routes (/admin additionally needs role "admin").
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = req.cookies.get("token")?.value;

  const toLogin = (clearCookie: boolean) => {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    const res = NextResponse.redirect(url);
    if (clearCookie) res.cookies.delete("token");
    return res;
  };

  if (!token) return toLogin(false);

  let user: { role?: string };
  try {
    const r = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: { cookie: `token=${token}` },
      cache: "no-store",
    });
    if (r.status === 401) return toLogin(true); // expired, invalid or locked
    if (!r.ok) return new NextResponse("Dịch vụ tạm thời không khả dụng", { status: 503 });
    user = await r.json();
  } catch {
    return new NextResponse("Dịch vụ tạm thời không khả dụng", { status: 503 });
  }

  if (pathname.startsWith("/admin") && user.role !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/home";   // trước đây là /template
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/home/:path*", "/template/:path*", "/admin/:path*"],
};