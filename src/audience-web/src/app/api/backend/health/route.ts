import { NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/lib/backend-bff";

export async function GET(): Promise<Response> {
  try {
    const response = await fetch(`${getBackendBaseUrl()}/health`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { message: "Backend health check failed" },
        { status: 503 },
      );
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "Backend service is unavailable" },
      { status: 503 },
    );
  }
}
