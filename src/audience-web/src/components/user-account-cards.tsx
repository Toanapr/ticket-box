import Link from "next/link";
import { AlertIcon, CheckIcon } from "./icons";
import { formatCurrency, formatDateTime, shortVenue } from "@/lib/format";
import { findConcert } from "@/lib/mock-data";
import type { OrderRecord, TicketRecord } from "@/lib/types";

export function ProfileRow({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-black/10 pb-3">
      <span className="font-bold text-slate-500">{label}</span>
      <span className="font-black text-ticket-obsidian">{value}</span>
    </div>
  );
}

export function Metric({ label, value, tone }: { label: string; value: string; tone: "amber" | "green" | "dark" }): React.ReactElement {
  const toneClass = {
    amber: "bg-amber-50 text-amber-800",
    green: "bg-ticket-green/10 text-ticket-green",
    dark: "bg-ticket-obsidian text-white",
  }[tone];

  return (
    <div className={`rounded-lg p-4 ${toneClass}`}>
      <div className="text-xs font-black uppercase tracking-wide opacity-75">{label}</div>
      <div className="mt-2 break-words font-display text-2xl font-black">{value}</div>
    </div>
  );
}

export function AccountPanel({ title, description, icon, children }: { title: string; description: string; icon: React.ReactNode; children: React.ReactNode }): React.ReactElement {
  return (
    <section className="rounded-lg border border-black/10 bg-white p-5 md:p-6">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded bg-ticket-stone text-ticket-obsidian">{icon}</div>
        <div>
          <h2 className="font-display text-xl font-black">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function OrderCard({ order, actionHref, actionLabel }: { order: OrderRecord; actionHref: string; actionLabel: string }): React.ReactElement {
  const concert = findConcert(order.concertId);
  const ticketType = concert?.ticketTypes.find((item) => item.id === order.ticketTypeId);

  return (
    <article className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded bg-white px-2 py-1 text-[11px] font-black uppercase tracking-wide text-amber-700">
            <AlertIcon className="h-3.5 w-3.5" />
            Chờ thanh toán
          </div>
          <h3 className="mt-3 font-display text-lg font-black">{concert?.title ?? order.concertId}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            {ticketType?.name ?? order.ticketTypeId} x {order.quantity}
          </p>
        </div>
        <div className="text-right font-black">{formatCurrency(order.totalAmount)}</div>
      </div>
      <div className="mt-4 grid gap-2 text-xs font-bold text-slate-600 sm:grid-cols-2">
        <span>Mã đơn: {order.orderId}</span>
        <span>Tạo lúc: {formatDateTime(order.createdAt)}</span>
      </div>
      <Link href={actionHref} className="mt-4 flex min-h-11 items-center justify-center rounded bg-ticket-obsidian px-4 text-sm font-black uppercase tracking-wide text-white">
        {actionLabel}
      </Link>
    </article>
  );
}

export function TicketCard({ ticket }: { ticket: TicketRecord }): React.ReactElement {
  const concert = findConcert(ticket.concertId);
  const ticketType = concert?.ticketTypes.find((item) => item.id === ticket.ticketTypeId);

  return (
    <article className="rounded-lg border border-ticket-green/30 bg-ticket-green/5 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded bg-white px-2 py-1 text-[11px] font-black uppercase tracking-wide text-ticket-green">
            <CheckIcon className="h-3.5 w-3.5" />
            Đã phát hành
          </div>
          <h3 className="mt-3 font-display text-lg font-black">{concert?.title ?? ticket.concertId}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            {ticketType?.name ?? ticket.ticketTypeId} - {shortVenue(concert?.venue ?? "TicketBox")}
          </p>
        </div>
        <div className="text-right text-sm font-black">{ticket.quantity} vé</div>
      </div>
      <div className="mt-4 grid gap-2 text-xs font-bold text-slate-600 sm:grid-cols-2">
        <span>Mã vé: {ticket.ticketId}</span>
        <span>Xuất lúc: {formatDateTime(ticket.issuedAt)}</span>
      </div>
      <Link href={`/tickets/${ticket.ticketId}`} className="mt-4 flex min-h-11 items-center justify-center rounded bg-ticket-green px-4 text-sm font-black uppercase tracking-wide text-white">
        Xem e-ticket
      </Link>
    </article>
  );
}

export function EmptyState({ text, href, action }: { text: string; href: string; action: string }): React.ReactElement {
  return (
    <div className="rounded-lg border border-dashed border-black/20 bg-ticket-alabaster p-6 text-center">
      <p className="text-sm font-bold text-slate-600">{text}</p>
      <Link href={href} className="mt-4 inline-flex min-h-11 items-center justify-center rounded bg-ticket-green px-4 text-sm font-black uppercase tracking-wide text-white">
        {action}
      </Link>
    </div>
  );
}
