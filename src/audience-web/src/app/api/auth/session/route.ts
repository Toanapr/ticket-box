import { NextResponse } from "next/server";
import { clearAccessToken, getAccessToken, getBackendBaseUrl } from "@/lib/backend-bff";

export async function GET(): Promise<Response> {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ user: null }, { status: 401 });

  try {
    const response = await fetch(`${getBackendBaseUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) {
      if (response.status === 401) await clearAccessToken();
      return NextResponse.json({ user: null }, { status: response.status });
    }
    return NextResponse.json({ user: await response.json() });
  } catch {
    return NextResponse.json({ message: "Authentication service is unavailable" }, { status: 503 });
  }
}
