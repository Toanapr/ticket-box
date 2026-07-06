import "server-only";

import { redirect } from "next/navigation";
import { getServerAuthUser } from "./backend-bff";
import type { AuthUser } from "./auth-types";

export async function requireAuthUser(returnTo: string): Promise<AuthUser> {
  const user = await getServerAuthUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return user;
}

export function safeNextPath(value: string | undefined): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/user";
}
