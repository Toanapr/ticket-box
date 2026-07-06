import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, apiBaseUrl } from "@/lib/auth";

type LoginResponse = {
  accessToken?: string;
  tokenType?: string;
  user?: {
    role?: string;
  };
  message?: string;
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  const backendResponse = await fetch(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await backendResponse
    .json()
    .catch(() => null)) as LoginResponse | null;

  if (
    !backendResponse.ok ||
    !payload?.accessToken ||
    payload.user?.role !== "organizer"
  ) {
    return NextResponse.json(payload ?? { message: "Login failed" }, {
      status: backendResponse.status || 403,
    });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: payload.accessToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });

  return response;
}
