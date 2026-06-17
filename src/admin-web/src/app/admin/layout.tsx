import Link from "next/link";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/admin/concerts" className="text-lg font-bold text-slate-950">
            TicketBox Admin
          </Link>
          <nav className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Link
              href="/admin/concerts"
              className="rounded-md px-3 py-2 hover:bg-slate-100 hover:text-slate-950"
            >
              Concerts
            </Link>
            <Link
              href="/admin/notifications"
              className="rounded-md px-3 py-2 hover:bg-slate-100 hover:text-slate-950"
            >
              Notifications
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
