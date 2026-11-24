// Only allow same-site relative paths to avoid open redirects (e.g. ?next=//evil.com).
export function safeNext(): string | null {
  const n = new URLSearchParams(window.location.search).get("next");
  return n && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : null;
}

export function homeFor(role?: string): string {
  return role === "admin" ? "/admin" : "/home";
}

// Where to go after login/register: honor ?next= only when it fits the role.
// Admins land on /admin unless they were heading to another /admin page.
export function landing(role?: string): string {
  const next = safeNext();
  if (role === "admin") return next?.startsWith("/admin") ? next : "/admin";
  return next && !next.startsWith("/admin") ? next : homeFor(role);
}