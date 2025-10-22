import {jwtDecode} from "jwt-decode";


const API_BASE_URL = 'http://localhost:4000/api/v1';
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequestOptions<TBody = any, TQuery = Record<string, any>> {
  url: string;
  method?: HttpMethod;
  payload?: TBody;
  queryParams?: TQuery;
  isAuth?: boolean;
  headers?: Record<string, string>;
}

function buildQuery(params?: Record<string, any>) {
  if (!params) return "";
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    usp.append(k, String(v));
  });
  const s = usp.toString();
  return s ? `?${s}` : "";
}

export async function apiRequest<TResp = any, TBody = any, TQuery = Record<string, any>>(
  opts: ApiRequestOptions<TBody, TQuery>
): Promise<TResp> {
  const { url, method = "GET", payload, queryParams, isAuth = false, headers = {} } = opts;

  const query = buildQuery(queryParams as any);
  const finalUrl = `${API_BASE_URL}${url}${query}`;

  const baseHeaders: Record<string, string> = { "Content-Type": "application/json", ...headers };

  if (isAuth) {
    let token = getAccessToken();

    // If no token or expired, attempt refresh using refresh_token cookie
    if (!token || isTokenExpired(token)) {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        const resp = await apiRequest<any>({
          url: "/user/get-access-token",
          method: "POST",
          payload: { refresh_token: refreshToken },
          isAuth: false,
        });
        token = resp?.data?.access_token ?? null;
        if (token) setJwtCookie('access_token', token);
      }
    }

    if (token) baseHeaders["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(finalUrl, {
    method,
    headers: baseHeaders,
    body: method === "GET" || method === "DELETE" ? undefined : JSON.stringify(payload ?? {}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as TResp;
  return data;
}

// Cookie helpers
function setCookie(name: string, value: string, maxAgeSeconds?: number) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=/`,
    `SameSite=Lax`,
  ];
  if (typeof maxAgeSeconds === 'number') parts.splice(1, 0, `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`);
  document.cookie = parts.join('; ');
}

function setJwtCookie(name: string, jwt: string) {
  try {
    const decoded: any = jwtDecode(jwt);
    const now = Math.floor(Date.now() / 1000);
    const exp: number | undefined = decoded?.exp;
    // Max-Age must be relative seconds, not absolute epoch
    const maxAge = exp ? Math.max(0, exp - now) : undefined;
    setCookie(name, jwt, maxAge);
  } catch {
    // Fallback to session cookie if decode fails
    setCookie(name, jwt);
  }
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function eraseCookie(name: string) {
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
}

export function setAuth(auth: { access_token?: string; refresh_token?: string; user?: any }) {
  if (auth.access_token) setJwtCookie('access_token', auth.access_token);
  if (auth.refresh_token) setJwtCookie('refresh_token', auth.refresh_token);
  if (auth.user) setCookie('user', JSON.stringify(auth.user));
}

export function getAccessToken(): string | null {
  return getCookie('access_token');
}

export function getRefreshToken(): string | null {
  return getCookie('refresh_token');
}

export function logout() {
  eraseCookie('access_token');
  eraseCookie('refresh_token');
  eraseCookie('user');
}

function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const decoded: any = jwtDecode(token);
    const currentTime = Math.floor(Date.now() / 1000);
    return typeof decoded?.exp === 'number' ? decoded.exp <= currentTime : true;
  } catch {
    return true;
  }
}