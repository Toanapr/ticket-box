"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckIcon, CreditCardIcon, QrIcon } from "./icons";
import { MockQr } from "./mock-qr";
import { getOrder, markPaymentFailed, mockPaymentSuccess } from "@/lib/client-api";
import { formatCurrency } from "@/lib/format";
import { findConcert } from "@/lib/mock-data";
import type { OrderRecord } from "@/lib/types";

export function OrderStatusClient({ orderId }: { orderId: string }): React.ReactElement {
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let active = true;
    async function load(): Promise<void> {
      const nextOrder = await getOrder(orderId);
      if (active) {
        setOrder(nextOrder);
        setLoading(false);
      }
    }
    void load();
    const timer = window.setInterval(load, 3000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [orderId]);

  async function confirmPayment(): Promise<void> {
    setWorking(true);
    const nextOrder = await mockPaymentSuccess(orderId);
    setOrder(nextOrder);
    setWorking(false);
  }

  async function failPayment(): Promise<void> {
    setWorking(true);
    const nextOrder = await markPaymentFailed(orderId);
    setOrder(nextOrder);
    setWorking(false);
  }

  if (loading) {
    return <div className="rounded-lg border border-black/10 bg-white p-8 font-bold text-slate-600">Dang tai order...</div>;
  }

  if (!order) {
    return (
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-8">
        <h1 className="font-display text-2xl font-black text-red-900">Khong tim thay order</h1>
        <p className="mt-2 text-sm text-red-800">Mock order chi ton tai tren trinh duyet da tao giao dich.</p>
      </div>
    );
  }

  const concert = findConcert(order.concertId);
  const ticketType = concert?.ticketTypes.find((item) => item.id === order.ticketTypeId);
  const qrPayload = `vietqr://payment?bank=vcb&acc=${order.paymentIntent?.accountNo}&amount=${Math.round(order.totalAmount)}&memo=${order.orderId}`;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:items-start">
      <section className="rounded-lg border border-black/10 bg-white p-6 md:p-8">
        <h1 className="flex items-center gap-3 font-display text-2xl font-black">
          <QrIcon className="h-7 w-7 text-ticket-green" />
          Chuyen khoan nhanh qua VietQR
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Mo app ngan hang, quet QR hoac chuyen khoan dung so tien va noi dung. Trang nay poll `GET /orders/:id` theo no-store.
        </p>
        <div className="mt-8 grid gap-8 md:grid-cols-[260px_1fr]">
          <div className="grid justify-items-center rounded-lg border border-black/10 bg-ticket-stone p-5">
            <div className="h-56 w-56 rounded border-2 border-ticket-obsidian bg-white p-4">
              <MockQr payload={qrPayload} className="h-full w-full" />
            </div>
            <p className="mt-3 text-center text-xs font-bold text-slate-500">Mock QR cho local demo</p>
          </div>
          <div className="grid gap-4">
            <TransferRow label="Ngan hang" value={order.paymentIntent?.bankName ?? "Mock bank"} />
            <TransferRow label="So tai khoan" value={order.paymentIntent?.accountNo ?? "9837482937"} />
            <TransferRow label="Ten nguoi thu huong" value={order.paymentIntent?.accountName ?? "CONG TY TICKETBOX VIET NAM"} />
            <TransferRow label="Noi dung" value={order.paymentIntent?.memo ?? order.orderId} />
            <TransferRow label="So tien" value={formatCurrency(order.totalAmount)} />
          </div>
        </div>
      </section>

      <aside className="rounded-lg border border-ticket-obsidian bg-white p-6 text-center shadow-[6px_6px_0_#0d1118]">
        <div className={`mx-auto grid h-20 w-20 place-items-center rounded-full ${order.status === "TICKET_ISSUED" ? "bg-ticket-green/10 text-ticket-green" : "bg-amber-100 text-amber-700"}`}>
          {order.status === "TICKET_ISSUED" ? <CheckIcon className="h-9 w-9" /> : <CreditCardIcon className="h-9 w-9" />}
        </div>
        <div className="mt-5 inline-flex rounded bg-ticket-green/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-ticket-green">
          {order.status}
        </div>
        <h2 className="mt-4 font-display text-2xl font-black">{order.status === "TICKET_ISSUED" ? "Da xuat e-ticket" : "Dang cho thanh toan"}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {concert?.title ?? "Concert"} - {ticketType?.name ?? "Ticket"} x {order.quantity}
        </p>
        <div className="mt-6 border-t border-black/10 pt-5 text-left text-sm">
          <SummaryLine label="Ma don" value={order.orderId} />
          <SummaryLine label="Tong tien" value={formatCurrency(order.totalAmount)} />
        </div>

        {order.status === "TICKET_ISSUED" && order.ticketId ? (
          <Link href={`/tickets/${order.ticketId}`} className="mt-6 flex min-h-12 items-center justify-center rounded bg-ticket-green px-4 text-sm font-black uppercase tracking-wide text-white">
            Xem e-ticket QR
          </Link>
        ) : (
          <div className="mt-6 grid gap-3">
            <button
              type="button"
              onClick={confirmPayment}
              disabled={working}
              className="min-h-12 rounded bg-ticket-green px-4 text-sm font-black uppercase tracking-wide text-white disabled:opacity-60"
            >
              Mock payment success
            </button>
            <button
              type="button"
              onClick={failPayment}
              disabled={working}
              className="min-h-12 rounded border border-black/10 px-4 text-sm font-black uppercase tracking-wide disabled:opacity-60"
            >
              Mock payment failure
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

function TransferRow({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="rounded border border-black/10 bg-ticket-stone p-4">
      <div className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 break-words font-display text-lg font-black">{value}</div>
    </div>
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
