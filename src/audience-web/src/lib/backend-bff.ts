import "server-only";

import { cookies } from "next/headers";
import type { AuthResponse, AuthUser } from "./auth-types";

export const authCookieName = "ticketbox_access_token";

export function getBackendBaseUrl(): string {
  const configured = process.env.BACKEND_API_BASE_URL;
  if (!configured) throw new Error("BACKEND_API_BASE_URL is not configured");
  return configured.replace(/\/$/, "");
}

export async function getAccessToken(): Promise<string | null> {
  return (await cookies()).get(authCookieName)?.value ?? null;
}

export async function setAccessToken(auth: AuthResponse): Promise<void> {
  const expiresAt = readJwtExpiry(auth.accessToken);
  (await cookies()).set(authCookieName, auth.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt ?? undefined,
  });
}

export async function clearAccessToken(): Promise<void> {
  (await cookies()).delete(authCookieName);
}

export async function getServerAuthUser(): Promise<AuthUser | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const response = await fetch(`${getBackendBaseUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as AuthUser;
  } catch {
    return null;
  }
}

function readJwtExpiry(token: string): Date | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")) as { exp?: number };
    return typeof payload.exp === "number" ? new Date(payload.exp * 1000) : null;
  } catch {
    return null;
  }
}
