import { handleAuthRequest } from "@/lib/handle-auth-request";

export async function POST(request: Request): Promise<Response> {
  return handleAuthRequest(request, "login");
}
