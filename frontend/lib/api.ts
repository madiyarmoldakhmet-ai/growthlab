const TOKEN_KEY = "growthlab_token";
const TOKEN_USER_KEY = "growthlab_user";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const API_URL = apiUrl.replace(/\/$/, "");

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  organizationId: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUser;
}

// ─── Token storage (browser-only, guarded for SSR) ─────────────────────
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(TOKEN_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setSession(session: LoginResponse): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, session.accessToken);
  window.localStorage.setItem(TOKEN_USER_KEY, JSON.stringify(session.user));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(TOKEN_USER_KEY);
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

type ApiOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  /** When false, do not attach the Authorization header (e.g. for login). */
  auth?: boolean;
};

/**
 * Fetch wrapper that attaches the JWT and handles 401 by clearing the session.
 * Throws an Error with a human-readable message on non-2xx responses.
 */
export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const requireAuth = options.auth !== false;

  if (options.body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  if (requireAuth) {
    const token = getToken();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path.startsWith("/") ? path : `/${path}`}`, {
      ...options,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (err) {
    // Network error / backend down — degrade gracefully so the UI can fall back to mock.
    throw new Error(
      `Не удалось подключиться к серверу (${API_URL}). Проверьте, что backend запущен.`,
    );
  }

  if (response.status === 401 && requireAuth && typeof window !== "undefined") {
    clearSession();
    if (!window.location.pathname.startsWith("/login")) {
      window.location.assign("/login");
    }
    throw new Error("Сессия истекла. Войдите снова.");
  }

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const payload = await response.json();
      const msg =
        (payload && (payload.message ?? payload.error)) ||
        (payload?.data && (payload.data.message ?? payload.data.error));
      if (typeof msg === "string" && msg) detail = msg;
      else if (Array.isArray(msg) && msg.length) detail = msg.join(", ");
    } catch {
      /* response had no JSON body — keep the status text */
    }
    throw new Error(`Ошибка запроса: ${detail}`);
  }

  // Some endpoints (logout) return no body; tolerate it.
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}