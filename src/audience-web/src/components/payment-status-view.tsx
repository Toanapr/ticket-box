import Link from "next/link";
import { CheckIcon, CreditCardIcon } from "./icons";
import {
  getPaymentStatusDisplay,
  type PaymentStatusHint,
} from "@/lib/payment-status-display";
import type { OrderRecord } from "@/lib/types";

const toneClass = {
  green: "bg-ticket-green/10 text-ticket-green",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
  slate: "bg-slate-100 text-slate-700",
};

export function PaymentStatusView({
  order,
  statusHint,
}: {
  order: OrderRecord;
  statusHint?: PaymentStatusHint;
}): React.ReactElement {
  const display = getPaymentStatusDisplay(order, statusHint);
  return (
    <aside className="rounded-lg border border-ticket-obsidian bg-white p-6 shadow-[6px_6px_0_#0d1118]">
      <div className="flex items-start gap-4">
        <div
          className={`grid h-14 w-14 shrink-0 place-items-center rounded ${toneClass[display.tone]}`}
        >
          {display.canShowTicketLink ? (
            <CheckIcon className="h-7 w-7" />
          ) : (
            <CreditCardIcon className="h-7 w-7" />
          )}
        </div>
        <div className="min-w-0">
          <div
            className={`inline-flex rounded px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${toneClass[display.tone]}`}
          >
            {display.displayLabel}
          </div>
          <h2 className="mt-3 font-display text-xl font-black leading-tight">
            {display.title}
          </h2>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{display.message}</p>
      {display.returnNotice ? (
        <p className="mt-3 rounded bg-ticket-stone px-3 py-2 text-left text-xs font-bold leading-5 text-slate-600">
          {display.returnNotice}
        </p>
      ) : null}

      {display.canShowTicketLink && order.ticketId ? (
        <Link
          href={`/tickets/${order.ticketId}`}
          className="mt-6 flex min-h-12 items-center justify-center rounded bg-ticket-green px-4 text-sm font-black uppercase tracking-wide text-white"
        >
          Xem e-ticket QR
        </Link>
      ) : display.action.kind === "open-checkout" ? (
        <a
          href={display.action.url}
          className="mt-6 flex min-h-12 items-center justify-center rounded bg-ticket-green px-4 text-sm font-black uppercase tracking-wide text-white"
        >
          {display.action.label}
        </a>
      ) : (
        <div className="mt-6 rounded border border-dashed border-black/20 bg-ticket-stone p-4 text-left text-xs font-bold leading-5 text-slate-600">
          <p>{display.action.description}</p>
        </div>
      )}
      {display.shouldPoll ? (
        <div className="mt-4 border-t border-black/10 pt-4 text-xs font-bold leading-5 text-slate-500">
          Trạng thái sẽ tự cập nhật sau vài giây.
        </div>
      ) : null}
    </aside>
  );
}
