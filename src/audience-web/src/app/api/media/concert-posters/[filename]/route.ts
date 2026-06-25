import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/lib/backend-bff";

const SAFE_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-\d+(?:-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?\.(jpg|png|webp)$/i;
const MEDIA_UPSTREAM_TIMEOUT_MS = 5_000;

type MediaRouteContext = {
  params: Promise<{ filename: string }>;
};

export async function GET(
  _request: NextRequest,
  context: MediaRouteContext,
): Promise<NextResponse> {
  const { filename } = await context.params;

  if (!SAFE_KEY_PATTERN.test(filename)) {
    return new NextResponse("Not found", { status: 404 });
  }

  let baseUrl: string;
  try {
    baseUrl = getBackendBaseUrl();
  } catch {
    return new NextResponse("Media proxy is not configured", { status: 500 });
  }

  const upstreamUrl = `${baseUrl}/media/concert-posters/${encodeURIComponent(filename)}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      cache: "force-cache",
      signal: AbortSignal.timeout(MEDIA_UPSTREAM_TIMEOUT_MS),
    });

    if (!upstream.ok) {
      return new NextResponse(null, { status: upstream.status });
    }

    const contentType =
      upstream.headers.get("content-type") ?? inferContentType(filename);

    const responseHeaders = new Headers({
      "Content-Type": contentType,
      "Cache-Control":
        upstream.headers.get("cache-control") ??
        "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    });
    copyHeader(upstream.headers, responseHeaders, "etag");
    copyHeader(upstream.headers, responseHeaders, "last-modified");

    return new NextResponse(upstream.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError")
    ) {
      return new NextResponse("Media upstream timed out", { status: 504 });
    }
    return new NextResponse("Media upstream unavailable", { status: 502 });
  }
}

function copyHeader(source: Headers, target: Headers, name: string): void {
  const value = source.get(name);
  if (value) target.set(name, value);
}

function inferContentType(filename: string): string {
  if (filename.endsWith(".jpg") || filename.endsWith(".jpeg"))
    return "image/jpeg";
  if (filename.endsWith(".png")) return "image/png";
  if (filename.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}
