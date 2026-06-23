"use client";

import type { AuthActionResult, AuthUser } from "./auth-types";

export async function registerUser(input: {
  fullName: string;
  email: string;
  password: string;
}): Promise<AuthActionResult> {
  return submitAuth("/api/auth/register", input);
}

export async function loginUser(input: { email: string; password: string }): Promise<AuthActionResult> {
  return submitAuth("/api/auth/login", input);
}

export async function logoutUser(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

async function submitAuth(path: string, input: object): Promise<AuthActionResult> {
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = (await response.json().catch(() => ({}))) as {
      user?: AuthUser;
      message?: string | string[];
    };
    if (!response.ok) return { ok: false, message: normalizeMessage(body.message, response.status) };
    return { ok: true, message: "Xác thực thành công.", user: body.user };
  } catch {
    return { ok: false, message: "Không thể kết nối máy chủ. Vui lòng thử lại." };
  }
}

function normalizeMessage(message: string | string[] | undefined, status: number): string {
  if (status === 401) return "Email hoặc mật khẩu không đúng.";
  if (status === 409) return "Email này đã được đăng ký.";
  if (Array.isArray(message)) return message.join(" ");
  return message ?? "Không thể xử lý yêu cầu lúc này.";
}
