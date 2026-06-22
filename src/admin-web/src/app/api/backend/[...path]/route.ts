import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, apiBaseUrl } from "@/lib/auth";

const BODYLESS_METHODS = new Set(["GET", "HEAD"]);

type BackendRouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

export async function GET(request: NextRequest, context: BackendRouteContext) {
  return proxyBackendRequest(request, context);
}

export async function POST(request: NextRequest, context: BackendRouteContext) {
  return proxyBackendRequest(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: BackendRouteContext,
) {
  return proxyBackendRequest(request, context);
}

export async function PUT(request: NextRequest, context: BackendRouteContext) {
  return proxyBackendRequest(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: BackendRouteContext,
) {
  return proxyBackendRequest(request, context);
}

async function proxyBackendRequest(
  request: NextRequest,
  context: BackendRouteContext,
) {
  const { path } = await context.params;
  const targetUrl = new URL(`/${path.join("/")}`, apiBaseUrl);
  targetUrl.search = request.nextUrl.search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.delete("cookie");

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (targetUrl.pathname.startsWith("/admin") && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const backendResponse = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: BODYLESS_METHODS.has(request.method)
      ? undefined
      : await request.text(),
  });

  const responseHeaders = new Headers(backendResponse.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  return new NextResponse(backendResponse.body, {
    status: backendResponse.status,
    headers: responseHeaders,
  });
}
