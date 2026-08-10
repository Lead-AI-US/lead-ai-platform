import { auth } from "@/lib/firebase/client";

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  if (!auth?.currentUser) throw new Error("Not authenticated");
  const token = await auth.currentUser.getIdToken();
  return fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });
}

async function toApiError(res: Response): Promise<Error> {
  let message = `Request failed (${res.status})`;
  try {
    const data = await res.json();
    if (data?.error) message = data.error;
  } catch {
    // response body wasn't JSON - keep the generic message
  }
  return new Error(message);
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await authedFetch(path);
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await authedFetch(path, { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<T>;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await authedFetch(path, { method: "PATCH", body: JSON.stringify(body) });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<T>;
}
