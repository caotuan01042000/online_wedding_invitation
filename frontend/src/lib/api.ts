// Fetch wrapper for client components: JSON in/out, 401 -> login page, errors as ApiError.
export class ApiError extends Error {
  constructor(public status: number, message: string, public fields?: Record<string, string>) {
    super(message);
  }
}

export interface Paged<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (res.status === 401) {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    throw new ApiError(401, "chưa đăng nhập");
  }
  const body = await res.json().catch(() => ({})); // 204 has no body
  if (!res.ok) throw new ApiError(res.status, body.error || "Có lỗi xảy ra", body.fields);
  return body as T;
}