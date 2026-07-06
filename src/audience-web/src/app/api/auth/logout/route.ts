import { NextResponse } from "next/server";
import { clearAccessToken } from "@/lib/backend-bff";

export async function POST(): Promise<Response> {
  await clearAccessToken();
  return NextResponse.json({ ok: true });
}
