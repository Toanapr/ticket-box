import Link from "next/link";
import { CheckIcon, CreditCardIcon } from "./icons";
import { getPaymentStatusDisplay, type PaymentStatusHint } from "@/lib/payment-status-display";
import { formatCurrency } from "@/lib/format";
import type { OrderRecord } from "@/lib/types";

const toneClass = {
  green: "bg-ticket-green/10 text-ticket-green",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
  slate: "bg-slate-100 text-slate-700",
};

export function PaymentStatusView({
  order,
  concertTitle,
  ticketTypeName,
  providerName,
  statusHint,
}: {
  order: OrderRecord;
  concertTitle: string;
  ticketTypeName: string;
  providerName: string;
  statusHint?: PaymentStatusHint;
}): React.ReactElement {
  const display = getPaymentStatusDisplay(order, statusHint);
  return (
    <aside className="rounded-lg border border-ticket-obsidian bg-white p-6 text-center shadow-[6px_6px_0_#0d1118]">
      <div className={`mx-auto grid h-20 w-20 place-items-center rounded-full ${toneClass[display.tone]}`}>
        {display.canShowTicketLink ? <CheckIcon className="h-9 w-9" /> : <CreditCardIcon className="h-9 w-9" />}
      </div>
      <div className={`mt-5 inline-flex rounded px-3 py-1 text-xs font-black uppercase tracking-wide ${toneClass[display.tone]}`}>
        {display.statusLabel}
      </div>
      <h2 className="mt-4 font-display text-2xl font-black">{display.title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{display.message}</p>
      {display.returnNotice ? <p className="mt-3 rounded bg-ticket-stone px-3 py-2 text-left text-xs font-bold leading-5 text-slate-600">{display.returnNotice}</p> : null}
      <p className="mt-3 text-sm leading-6 text-slate-600">
        {concertTitle} - {ticketTypeName} x {order.quantity}
      </p>
      <div className="mt-6 border-t border-black/10 pt-5 text-left text-sm">
        <SummaryLine label="Mã đơn" value={order.orderId} />
        <SummaryLine label="Thanh toán" value={providerName} />
        <SummaryLine label="Tổng tiền" value={formatCurrency(order.totalAmount)} />
      </div>

      {display.canShowTicketLink && order.ticketId ? (
        <Link href={`/tickets/${order.ticketId}`} className="mt-6 flex min-h-12 items-center justify-center rounded bg-ticket-green px-4 text-sm font-black uppercase tracking-wide text-white">
          Xem e-ticket QR
        </Link>
      ) : display.action.kind === "open-checkout" ? (
        <a
          href={display.action.url}
          target="_blank"
          rel="noreferrer"
          className="mt-6 flex min-h-12 items-center justify-center rounded bg-ticket-green px-4 text-sm font-black uppercase tracking-wide text-white"
        >
          {display.action.label}
        </a>
      ) : (
        <div className="mt-6 rounded border border-dashed border-black/20 bg-ticket-stone p-4 text-left text-xs font-bold leading-5 text-slate-600">
          <p>{display.action.description}</p>
          <p className="mt-2">Browser redirect hoặc trang provider không tự xác nhận thanh toán. Trang này chỉ đổi trạng thái khi `GET /orders/:id` trả về backend state mới.</p>
        </div>
      )}
    </aside>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="mb-2 flex justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="font-black">{value}</span>
    </div>
  );
}
