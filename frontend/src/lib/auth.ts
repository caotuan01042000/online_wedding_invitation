// Only allow same-site relative paths to avoid open redirects (e.g. ?next=//evil.com).
export function safeNext(): string | null {
  const n = new URLSearchParams(window.location.search).get("next");
  return n && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : null;
}

export function homeFor(role?: string): string {
  return role === "admin" ? "/admin" : "/template";
}