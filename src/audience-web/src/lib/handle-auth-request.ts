import "server-only";

import { NextResponse } from "next/server";
import { getBackendBaseUrl, setAccessToken } from "./backend-bff";
import type { AuthResponse } from "./auth-types";

export async function handleAuthRequest(request: Request, action: "login" | "register"): Promise<Response> {
  try {
    const response = await fetch(`${getBackendBaseUrl()}/auth/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
      cache: "no-store",
    });
    const body = (await response.json().catch(() => ({ message: "Invalid backend response" }))) as AuthResponse;
    if (!response.ok) return NextResponse.json(body, { status: response.status });
    if (body.user.role !== "audience") {
      return NextResponse.json({ message: "Tài khoản này không thuộc nhóm khán giả." }, { status: 403 });
    }
    await setAccessToken(body);
    return NextResponse.json({ user: body.user });
  } catch {
    return NextResponse.json({ message: "Authentication service is unavailable" }, { status: 503 });
  }
}
