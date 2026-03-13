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

// SSE streaming request — calls onChunk for each parsed SSE data line.
export interface StreamChunk {
  agent_name: string;
  agent_results: any;
  message: string;
  status: "STARTED" | "INPROGRESS" | "COMPLETED";
}

export async function apiStreamRequest(opts: {
  url: string;
  payload: any;
  isAuth?: boolean;
  onChunk: (chunk: StreamChunk) => void;
}): Promise<void> {
  const { url, payload, isAuth = false, onChunk } = opts;

  const finalUrl = `${API_BASE_URL}${url}?is_stream=true`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (isAuth) {
    let token = getAccessToken();
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
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(finalUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("ReadableStream not supported");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;
      const jsonStr = trimmed.slice(6);
      try {
        const chunk: StreamChunk = JSON.parse(jsonStr);
        onChunk(chunk);
      } catch {
        // skip malformed lines
      }
    }
  }

  // Process any remaining buffer
  if (buffer.trim().startsWith("data: ")) {
    try {
      const chunk: StreamChunk = JSON.parse(buffer.trim().slice(6));
      onChunk(chunk);
    } catch {
      // skip
    }
  }
}

// Download a remote resource via backend proxy. Returns a Blob when successful.
export async function apiDownload(opts: { url: string; payload?: any; isAuth?: boolean; headers?: Record<string,string> }) {
  const { url, payload, isAuth = false, headers = {} } = opts;
  const finalUrl = `${API_BASE_URL}${url}`;

  const baseHeaders: Record<string, string> = { "Content-Type": "application/json", ...headers };

  if (isAuth) {
    let token = getAccessToken();

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
    method: 'POST',
    headers: baseHeaders,
    body: JSON.stringify(payload ?? {}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }

  const blob = await res.blob();
  return blob;
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

export async function apiUploadFiles(files: File[]): Promise<Array<{ name: string; path: string; type: string; size: number; id: string }>> {
  const finalUrl = `${API_BASE_URL}/chats/file-upload`;
  const headers: Record<string, string> = {};

  let token = getAccessToken();
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
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const res = await fetch(finalUrl, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  const data: any[] = json?.data ?? [];
  return data.map((d: any) => ({
    name: d.name,
    path: d.path,
    type: d.type,
    size: d.size,
    id: d.id,
  }));
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
