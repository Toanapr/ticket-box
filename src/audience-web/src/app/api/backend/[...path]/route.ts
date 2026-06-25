import { NextResponse } from "next/server";
import { clearAccessToken, getAccessToken, getBackendBaseUrl } from "@/lib/backend-bff";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

const allowedRoutes = [
  { method: "POST", pattern: /^reservations$/ },
  { method: "POST", pattern: /^orders$/ },
  { method: "GET", pattern: /^orders\/[0-9a-f-]{36}$/i },
  { method: "POST", pattern: /^payments\/[0-9a-f-]{36}\/intent$/i },
  { method: "POST", pattern: /^payments\/mock-success$/ },
  { method: "GET", pattern: /^tickets\/[0-9a-f-]{36}$/i },
];

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  return proxyRequest(request, context);
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  return proxyRequest(request, context);
}

async function proxyRequest(request: Request, context: RouteContext): Promise<Response> {
  const path = (await context.params).path.join("/");
  if (!allowedRoutes.some((route) => route.method === request.method && route.pattern.test(path))) {
    return NextResponse.json({ message: "Backend route is not allowed" }, { status: 404 });
  }

  const origin = request.headers.get("origin");
  if (request.method !== "GET" && origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ message: "Cross-origin request rejected" }, { status: 403 });
  }

  const token = await getAccessToken();
  if (!token) return NextResponse.json({ message: "Authentication required" }, { status: 401 });

  const headers = new Headers({ Authorization: `Bearer ${token}` });
  for (const name of ["content-type", "idempotency-key", "x-correlation-id", "x-sale-access-token"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    const incomingUrl = new URL(request.url);
    const response = await fetch(`${getBackendBaseUrl()}/${path}${incomingUrl.search}`, {
      method: request.method,
      headers,
      body: request.method === "GET" ? undefined : await request.arrayBuffer(),
      cache: "no-store",
    });
    if (response.status === 401) await clearAccessToken();

    const responseHeaders = new Headers();
    for (const name of ["content-type", "retry-after", "x-correlation-id", "x-sale-access-token", "x-sale-access-expires-at"]) {
      const value = response.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new NextResponse(response.body, { status: response.status, headers: responseHeaders });
  } catch {
    return NextResponse.json({ message: "Backend service is unavailable" }, { status: 503 });
  }
}
