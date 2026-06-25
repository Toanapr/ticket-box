"use client";

import { useEffect, useState } from "react";
import { QrIcon } from "./icons";
import { MockQr } from "./mock-qr";
import { PaymentStatusView } from "./payment-status-view";
import { getOrder } from "@/lib/client-api";
import { formatCurrency } from "@/lib/format";
import { findConcert } from "@/lib/mock-data";
import type { OrderRecord } from "@/lib/types";

export function OrderStatusClient({ orderId }: { orderId: string }): React.ReactElement {
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <div className="rounded-lg border border-black/10 bg-white p-8 font-bold text-slate-600">Đang tải order...</div>;
  }

  if (!order) {
    return (
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-8">
        <h1 className="font-display text-2xl font-black text-red-900">Không tìm thấy order</h1>
        <p className="mt-2 text-sm text-red-800">Mock order chỉ tồn tại trên trình duyệt đã tạo giao dịch.</p>
      </div>
    );
  }

  const concert = findConcert(order.concertId);
  const ticketType = concert?.ticketTypes.find((item) => item.id === order.ticketTypeId);
  const providerName = order.paymentIntent?.providerName ?? (order.paymentIntent?.provider === "mock-bank" ? "Mock bank" : "VNPAY");
  const qrPayload =
    order.paymentIntent?.qrPayload ??
    `vnpay://payment?orderId=${order.orderId}&amount=${Math.round(order.totalAmount)}`;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:items-start">
      <section className="rounded-lg border border-black/10 bg-white p-6 md:p-8">
        <h1 className="flex items-center gap-3 font-display text-2xl font-black">
          <QrIcon className="h-7 w-7 text-ticket-green" />
          Thanh toán qua {providerName}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Quét QR hoặc mở ứng dụng {providerName} để thanh toán đúng số tiền và mã đơn. Trang này poll `GET /orders/:id` theo no-store.
        </p>
        <div className="mt-8 grid gap-8 md:grid-cols-[260px_1fr]">
          <div className="grid justify-items-center rounded-lg border border-black/10 bg-ticket-stone p-5">
            <div className="h-56 w-56 rounded border-2 border-ticket-obsidian bg-white p-4">
              <MockQr payload={qrPayload} className="h-full w-full" />
            </div>
            <p className="mt-3 text-center text-xs font-bold text-slate-500">Mock QR cho local demo</p>
          </div>
          <div className="grid gap-4">
            <TransferRow label="Cổng thanh toán" value={providerName} />
            <TransferRow label="Nội dung" value={order.paymentIntent?.memo ?? order.orderId} />
            <TransferRow label="Số tiền" value={formatCurrency(order.totalAmount)} />
          </div>
        </div>
      </section>

      <PaymentStatusView
        order={order}
        concertTitle={concert?.title ?? "Concert"}
        ticketTypeName={ticketType?.name ?? "Ticket"}
        providerName={providerName}
      />
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
