"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "./auth-provider";
import { CheckIcon, TicketIcon, UsersIcon } from "./icons";
import { loginUser, registerUser } from "@/lib/auth-client";

type AuthMode = "login" | "register";

interface AuthFormClientProps {
  mode: AuthMode;
  nextPath?: string;
}

const fieldClass =
  "mt-2 min-h-12 w-full rounded border border-black/10 bg-ticket-alabaster px-4 text-base font-bold outline-none transition focus:border-ticket-green focus:bg-white";

export function AuthFormClient({ mode, nextPath = "/user" }: AuthFormClientProps): React.ReactElement {
  const router = useRouter();
  const { setUser } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const isRegister = mode === "register";

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setWorking(true);

    const data = new FormData(event.currentTarget);
    const result = isRegister
      ? await registerUser({
          fullName: String(data.get("fullName") ?? ""),
          email: String(data.get("email") ?? ""),
          password: String(data.get("password") ?? ""),
        })
      : await loginUser({
          email: String(data.get("email") ?? ""),
          password: String(data.get("password") ?? ""),
        });

    setMessage(result.message);
    setWorking(false);
    if (result.ok && result.user) {
      setUser(result.user);
      router.push(nextPath);
      router.refresh();
    }
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-start">
      <div className="rounded-lg border border-ticket-obsidian bg-white p-6 shadow-[6px_6px_0_#0d1118] md:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-ticket-green/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-ticket-green">
          <UsersIcon className="h-4 w-4" />
          Tài khoản khán giả
        </div>
        <h1 className="mt-5 font-display text-3xl font-black tracking-tight md:text-4xl">
          {isRegister ? "Tạo tài khoản TicketBox" : "Đăng nhập TicketBox"}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
          {isRegister
            ? "Lưu thông tin mua vé, theo dõi đơn giữ chỗ và nhận e-ticket trong một nơi."
            : "Tiếp tục xem vé đang giữ chỗ, lịch sử mua vé và thông tin tài khoản của bạn."}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
          {isRegister ? (
            <AuthField label="Họ và tên" name="fullName" autoComplete="name" minLength={2} maxLength={120} required />
          ) : null}
          <AuthField label="Email" name="email" type="email" autoComplete="email" required />
          <AuthField
            label="Mật khẩu"
            name="password"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            minLength={8}
            required
          />

          {message ? (
            <div role="status" className="rounded border border-black/10 bg-ticket-stone px-4 py-3 text-sm font-bold text-slate-700">
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={working}
            className="min-h-12 rounded bg-ticket-green px-5 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#00984c] disabled:opacity-60"
          >
            {working ? "Đang xử lý..." : isRegister ? "Đăng ký" : "Đăng nhập"}
          </button>
        </form>

        <p className="mt-6 text-sm font-bold text-slate-600">
          {isRegister ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
          <Link
            href={`${isRegister ? "/login" : "/register"}${nextPath !== "/user" ? `?next=${encodeURIComponent(nextPath)}` : ""}`}
            className="text-ticket-green underline-offset-4 hover:underline"
          >
            {isRegister ? "Đăng nhập" : "Đăng ký"}
          </Link>
        </p>
      </div>

      <aside className="rounded-lg border border-black/10 bg-ticket-obsidian p-6 text-white md:p-8">
        <TicketIcon className="h-10 w-10 text-ticket-green" />
        <h2 className="mt-5 font-display text-2xl font-black">Một tài khoản cho toàn bộ hành trình vé.</h2>
        <div className="mt-6 grid gap-4 text-sm leading-6 text-slate-200">
          <AuthBenefit text="Xem vé đang giữ chỗ nhưng chưa thanh toán." />
          <AuthBenefit text="Mở nhanh e-ticket đã phát hành." />
          <AuthBenefit text="Dùng lại thông tin mua vé ở lần checkout sau." />
        </div>
        <div className="mt-8 rounded border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
          Phiên đăng nhập được bảo vệ bằng cookie HttpOnly và tự hết hạn theo access token.
        </div>
      </aside>
    </section>
  );
}

function AuthField({ label, name, type = "text", ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }): React.ReactElement {
  return (
    <label className="block text-sm font-black text-ticket-obsidian">
      {label}
      <input className={fieldClass} name={name} type={type} {...props} />
    </label>
  );
}

function AuthBenefit({ text }: { text: string }): React.ReactElement {
  return (
    <div className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ticket-green/15 text-ticket-green">
        <CheckIcon className="h-4 w-4" />
      </span>
      <span>{text}</span>
    </div>
  );
}
