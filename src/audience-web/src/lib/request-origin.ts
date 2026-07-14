function firstHeaderValue(value: string | null): string | null {
  const first = value?.split(",", 1)[0]?.trim();
  return first || null;
}

export function isSameOriginRequest(request: Request): boolean {
  const originHeader = request.headers.get("origin");
  if (!originHeader) return true;

  try {
    const origin = new URL(originHeader);
    if (originHeader !== origin.origin) return false;

    const requestUrl = new URL(request.url);
    const host =
      firstHeaderValue(request.headers.get("x-forwarded-host")) ??
      firstHeaderValue(request.headers.get("host")) ??
      requestUrl.host;
    const protocol =
      firstHeaderValue(request.headers.get("x-forwarded-proto")) ??
      requestUrl.protocol.replace(/:$/, "");

    if (protocol !== "http" && protocol !== "https") return false;
    return origin.origin === new URL(`${protocol}://${host}`).origin;
  } catch {
    return false;
  }
}
