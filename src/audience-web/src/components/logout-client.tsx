"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "./auth-provider";
import { CreditCardIcon, TicketIcon } from "./icons";
import { logoutUser } from "@/lib/auth-client";

export function LogoutClient(): React.ReactElement {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [working, setWorking] = useState(false);

  async function handleLogout(): Promise<void> {
    setWorking(true);
    await logoutUser();
    setUser(null);
    router.push("/login");
    router.refresh();
  }

  return (
    <section className="mx-auto max-w-2xl rounded-lg border border-ticket-obsidian bg-white p-6 text-center shadow-[6px_6px_0_#0d1118] md:p-8">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-ticket-green/10 text-ticket-green">
        <TicketIcon className="h-8 w-8" />
      </div>
      <h1 className="mt-5 font-display text-3xl font-black tracking-tight">Đăng xuất tài khoản</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        {user ? `Bạn đang đăng nhập bằng ${user.email}.` : "Bạn hiện chưa đăng nhập trong trình duyệt này."}
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleLogout}
          disabled={working}
          className="flex min-h-12 items-center justify-center gap-2 rounded bg-ticket-obsidian px-4 text-sm font-black uppercase tracking-wide text-white"
        >
          <CreditCardIcon className="h-5 w-5" />
          {working ? "Đang đăng xuất..." : "Đăng xuất"}
        </button>
        <Link href="/user" className="flex min-h-12 items-center justify-center rounded border border-black/10 px-4 text-sm font-black uppercase tracking-wide">
          Quay lại tài khoản
        </Link>
      </div>
    </section>
  );
}
