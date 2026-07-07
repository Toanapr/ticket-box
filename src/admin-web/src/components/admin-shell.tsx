"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { BellIcon, LayersIcon, TicketIcon, UserIcon } from "./icons";
import { AdminPageShell } from "./admin-ui";

const navItems = [
  {
    href: "/admin/concerts",
    label: "Concerts",
    icon: LayersIcon,
  },
  {
    href: "/admin/notifications",
    label: "Notifications",
    icon: BellIcon,
  },
  {
    href: "/admin/profile",
    label: "Profile",
    icon: UserIcon,
  },
];

export function AdminAppShell({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-[rgba(250,250,248,0.92)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 md:px-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/admin/concerts"
              className="flex items-center gap-3 font-display text-xl font-black tracking-tight text-ticket-obsidian"
            >
              <span className="grid h-11 w-11 place-items-center rounded-full border border-black/10 bg-white">
                <TicketIcon className="h-6 w-6 text-ticket-green" />
              </span>
              <span>
                Ticket<span className="text-ticket-green">Box</span> Admin
              </span>
            </Link>
            <div className="hidden rounded-full border border-black/10 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 sm:block">
              Organizer workspace
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between lg:gap-4">
            <nav
              aria-label="Admin navigation"
              className="flex flex-wrap items-center gap-2"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-black transition ${
                      isActive
                        ? "bg-ticket-obsidian text-white"
                        : "bg-white text-slate-600 hover:text-ticket-green"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <LogoutButton />
          </div>
        </div>
      </header>

      <AdminPageShell>{children}</AdminPageShell>
    </div>
  );
}
