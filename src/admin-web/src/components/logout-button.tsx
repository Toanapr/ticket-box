"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminButton } from "./admin-ui";

export function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.replace("/login");
    router.refresh();
  }

  return (
    <AdminButton
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      variant="secondary"
      className="min-h-11 rounded-full px-4 text-xs"
    >
      {isLoggingOut ? "Signing out..." : "Sign out"}
    </AdminButton>
  );
}
