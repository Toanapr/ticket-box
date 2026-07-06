import assert from "node:assert/strict";
import test from "node:test";

const moduleUrl = new URL("./backend-proxy-request.ts", import.meta.url).href;
const { prepareBackendProxyRequest } = (await import(
  moduleUrl
)) as typeof import("./backend-proxy-request");

test("preserves multipart boundary while forwarding exact request bytes", async () => {
  const formData = new FormData();
  formData.append("poster", new Blob(["poster-bytes"]), "poster.png");
  const incoming = new Request("http://admin.test/upload", {
    method: "PUT",
    body: formData,
  });
  const incomingContentType = incoming.headers.get("content-type");
  const expectedBody = Buffer.from(await incoming.clone().arrayBuffer());

  const prepared = await prepareBackendProxyRequest(
    incoming,
    new Headers(incoming.headers),
  );

  assert.equal(prepared.ok, true);
  if (!prepared.ok) return;

  const forwarded = new Request("http://backend.test/upload", prepared.init);
  assert.equal(forwarded.headers.get("content-type"), incomingContentType);
  assert.match(forwarded.headers.get("content-type") ?? "", /boundary=/);
  assert.deepEqual(Buffer.from(await forwarded.arrayBuffer()), expectedBody);
});

test("rejects malformed multipart requests without a boundary", async () => {
  const request = new Request("http://admin.test/upload", {
    method: "PUT",
    headers: { "content-type": "multipart/form-data" },
    body: "malformed",
  });

  const prepared = await prepareBackendProxyRequest(
    request,
    new Headers(request.headers),
  );

  assert.deepEqual(prepared, {
    ok: false,
    message: "Multipart request is missing its boundary",
  });
});
