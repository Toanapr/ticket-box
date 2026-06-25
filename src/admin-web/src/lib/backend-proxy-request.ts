const BODYLESS_METHODS = new Set(["GET", "HEAD"]);

export type PreparedProxyRequest =
  | { ok: true; init: RequestInit }
  | { ok: false; message: string };

export async function prepareBackendProxyRequest(
  request: Request,
  headers: Headers,
): Promise<PreparedProxyRequest> {
  const contentType = headers.get("content-type") ?? "";
  if (
    contentType.includes("multipart/form-data") &&
    !contentType.includes("boundary=")
  ) {
    return { ok: false, message: "Multipart request is missing its boundary" };
  }

  return {
    ok: true,
    init: {
      method: request.method,
      headers,
      body: BODYLESS_METHODS.has(request.method)
        ? undefined
        : await request.arrayBuffer(),
    },
  };
}
