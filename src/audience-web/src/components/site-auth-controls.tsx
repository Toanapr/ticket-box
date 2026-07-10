"use client";

import Link from "next/link";
import { useAuth } from "./auth-provider";

export function SiteAuthControls(): React.ReactElement {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="hidden min-h-11 items-center rounded-full border border-black/10 bg-white px-4 text-sm font-black transition hover:border-ticket-green/50 sm:flex"
        >
          Đăng nhập
        </Link>
        <Link
          href="/register"
          className="flex min-h-11 items-center rounded-full bg-ticket-obsidian px-4 text-sm font-black text-white transition hover:bg-ticket-green"
        >
          Đăng ký
        </Link>
      </div>
    );
  }

  const displayName = user.fullName?.trim() || user.email;
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/user"
        className="flex min-h-11 items-center rounded-full border border-black/10 bg-white px-2 py-1 text-sm font-bold transition hover:border-ticket-green/50"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-ticket-green text-xs text-white">
          {initials || "KG"}
        </span>
        <span className="hidden max-w-32 truncate px-2 sm:inline">
          {displayName}
        </span>
      </Link>
      <Link
        href="/logout"
        className="hidden min-h-11 items-center rounded-full border border-black/10 bg-white px-4 text-sm font-black transition hover:border-ticket-green/50 lg:flex"
      >
        Đăng xuất
      </Link>
    </div>
  );
}
