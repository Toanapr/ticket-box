import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, apiBaseUrl } from "./auth";

export async function serverApiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  const headers = new Headers(init?.headers);

  headers.set("Content-Type", "application/json");

  if (path.startsWith("/admin") && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.message ?? `API request failed with ${response.status}`,
    );
  }

  return response.json() as Promise<T>;
}
