import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, apiBaseUrl } from "@/lib/auth";
import { prepareBackendProxyRequest } from "@/lib/backend-proxy-request";

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

  const preparedRequest = await prepareBackendProxyRequest(request, headers);
  if (!preparedRequest.ok) {
    return NextResponse.json(
      { message: preparedRequest.message },
      { status: 400 },
    );
  }

  const backendResponse = await fetch(targetUrl, {
    ...preparedRequest.init,
  });

  const responseHeaders = new Headers(backendResponse.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  return new NextResponse(backendResponse.body, {
    status: backendResponse.status,
    headers: responseHeaders,
  });
}
