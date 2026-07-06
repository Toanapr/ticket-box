import Link from "next/link";
import { ArrowRightIcon } from "./icons";

function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export const inputClassName =
  "mt-2 min-h-12 w-full rounded border border-black/10 bg-ticket-alabaster px-4 text-sm font-bold text-ticket-obsidian outline-none transition placeholder:text-slate-400 focus:border-ticket-green focus:bg-white";

export const fileInputClassName =
  "mt-2 block w-full text-sm font-semibold text-slate-600 file:mr-4 file:rounded file:border-0 file:bg-ticket-green/10 file:px-4 file:py-3 file:text-sm file:font-black file:text-ticket-green hover:file:bg-ticket-green/15";

export function AdminPageShell({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <main className="mx-auto min-h-[calc(100dvh-18rem)] w-full max-w-7xl px-5 py-8 md:px-10 md:py-12">
      {children}
    </main>
  );
}

export function AdminBackLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-slate-500 transition hover:text-ticket-green"
    >
      <span className="rotate-180">
        <ArrowRightIcon className="h-3.5 w-3.5" />
      </span>
      {children}
    </Link>
  );
}

export function AdminHero({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}): React.ReactElement {
  return (
    <section className="rounded-[28px] border border-black/10 bg-white px-6 py-6 shadow-[8px_8px_0_#0d1118] md:px-8 md:py-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="text-xs font-black uppercase tracking-[0.28em] text-ticket-green">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-3 font-display text-3xl font-black tracking-tight text-ticket-obsidian md:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </section>
  );
}

export function AdminPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <section
      className={cn(
        "rounded-[24px] border border-black/10 bg-white p-5 shadow-[6px_6px_0_rgba(13,17,24,0.08)] md:p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function AdminPanelTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}): React.ReactElement {
  return (
    <div className="mb-5">
      <h2 className="font-display text-2xl font-black tracking-tight text-ticket-obsidian">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      ) : null}
    </div>
  );
}

export function AdminButton({
  children,
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}): React.ReactElement {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex min-h-12 items-center justify-center rounded px-5 text-sm font-black uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" &&
          "bg-ticket-green text-white hover:bg-[#00984c]",
        variant === "secondary" &&
          "border border-black/10 bg-ticket-alabaster text-ticket-obsidian hover:bg-white",
        variant === "ghost" &&
          "text-slate-600 hover:bg-ticket-stone hover:text-ticket-obsidian",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function AdminLinkButton({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}): React.ReactElement {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-12 items-center justify-center rounded px-5 text-sm font-black uppercase tracking-wide transition",
        variant === "primary" &&
          "bg-ticket-green text-white hover:bg-[#00984c]",
        variant === "secondary" &&
          "border border-black/10 bg-ticket-alabaster text-ticket-obsidian hover:bg-white",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function AdminNotice({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "error";
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div
      className={cn(
        "rounded border px-4 py-3 text-sm font-bold",
        tone === "neutral" && "border-black/10 bg-ticket-stone text-slate-700",
        tone === "success" &&
          "border-ticket-green/20 bg-ticket-green/10 text-[#007a3d]",
        tone === "error" && "border-red-200 bg-red-50 text-red-700",
      )}
    >
      {children}
    </div>
  );
}

export function AdminField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <label className="block text-sm font-black text-ticket-obsidian">
      {label}
      {children}
    </label>
  );
}

export function AdminStatusBadge({
  status,
}: {
  status: string;
}): React.ReactElement {
  const normalized = status.toLowerCase();
  const classes =
    normalized === "published" || normalized === "sent"
      ? "bg-ticket-green text-white"
      : normalized === "draft" || normalized === "imported"
        ? "bg-ticket-obsidian text-white"
        : normalized === "validation_failed" || normalized === "failed"
          ? "bg-red-100 text-red-700"
          : "bg-slate-200 text-slate-700";

  return (
    <span
      className={cn(
        "inline-flex rounded px-2.5 py-1 text-[11px] font-black uppercase tracking-wide",
        classes,
      )}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function AdminDataTable({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="overflow-hidden rounded-[24px] border border-black/10 bg-white shadow-[6px_6px_0_rgba(13,17,24,0.08)]">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function AdminTable({
  children,
  minWidthClassName,
}: {
  children: React.ReactNode;
  minWidthClassName?: string;
}): React.ReactElement {
  return (
    <table
      className={cn(
        "w-full border-collapse text-left text-sm",
        minWidthClassName,
      )}
    >
      {children}
    </table>
  );
}

export function AdminTableHead({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <thead className="bg-ticket-stone text-[11px] uppercase tracking-[0.24em] text-slate-500">
      {children}
    </thead>
  );
}

export function AdminTableBody({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <tbody className="divide-y divide-black/10">{children}</tbody>;
}

export function AdminEmptyState({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="border-t border-black/10 px-6 py-12 text-center text-sm font-semibold text-slate-600">
      {children}
    </div>
  );
}
