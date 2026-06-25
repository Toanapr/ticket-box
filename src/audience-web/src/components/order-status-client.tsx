"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CreditCardIcon, QrIcon } from "./icons";
import { PaymentStatusView } from "./payment-status-view";
import { getOrder } from "@/lib/client-api";
import { formatCurrency, shortVenue } from "@/lib/format";
import { getPaymentStatusDisplay, type PaymentPollMode, type PaymentStatusHint } from "@/lib/payment-status-display";
import { formatHoldCountdown, shouldShowOrderHoldCountdown } from "@/lib/reservation-hold";
import { upsertOrderRecord } from "@/lib/user-account-data";
import type { OrderRecord } from "@/lib/types";

export function OrderStatusClient({ orderId }: { orderId: string }): React.ReactElement {
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setClockTick] = useState(0);
  const statusHint = useMemo<PaymentStatusHint>(
    () => ({
      paymentDegraded: searchParams.get("paymentDegraded") === "1",
      paymentStatus: searchParams.get("paymentStatus") === "pending_reconciliation" ? "pending_reconciliation" : undefined,
      paymentRetryAfterSeconds: parsePositiveInteger(searchParams.get("paymentRetryAfter")),
      paymentReturn: searchParams.get("paymentReturn") === "1",
    }),
    [searchParams],
  );
  const display = order ? getPaymentStatusDisplay(order, statusHint) : null;
  const showReservationHold = order ? shouldShowOrderHoldCountdown(order.status, order.reservationExpiresAt) : false;
  const holdCountdown = order?.reservationExpiresAt ? formatHoldCountdown(order.reservationExpiresAt) : null;

  useEffect(() => {
    let active = true;

    async function load(): Promise<void> {
      const nextOrder = await getOrder(orderId);
      if (active) {
        if (nextOrder) upsertOrderRecord(nextOrder);
        setOrder(nextOrder);
        setLoading(false);
      }
    }

    void load();
    const intervalMs = pollIntervalMs(display?.pollMode ?? "fast");
    if (intervalMs === null) {
      return () => {
        active = false;
      };
    }

    const timer = window.setInterval(load, intervalMs);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [display?.pollMode, orderId, statusHint.paymentDegraded, statusHint.paymentRetryAfterSeconds, statusHint.paymentReturn, statusHint.paymentStatus]);

  useEffect(() => {
    if (!showReservationHold) return;
    const timer = window.setInterval(() => {
      setClockTick((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [showReservationHold]);

  if (loading) {
    return <div className="rounded-lg border border-black/10 bg-white p-8 font-bold text-slate-600">Đang tải order...</div>;
  }

  if (!order) {
    return (
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-8">
        <h1 className="font-display text-2xl font-black text-red-900">Không tìm thấy order</h1>
        <p className="mt-2 text-sm text-red-800">Order không có trên backend hoặc bạn không còn quyền truy cập.</p>
      </div>
    );
  }

  const providerName = order.paymentIntent?.providerName ?? (order.paymentIntent?.provider === "mock-bank" ? "Mock bank" : "VNPAY");

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:items-start">
      <section className="rounded-lg border border-black/10 bg-white p-6 md:p-8">
        <h1 className="flex items-center gap-3 font-display text-2xl font-black">
          <QrIcon className="h-7 w-7 text-ticket-green" />
          Thanh toán qua {providerName}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Trang đơn hàng này chỉ hiển thị nguồn sự thật từ backend. Browser redirect hoặc thao tác ở cổng thanh toán không tự đánh dấu thành công trên client.
        </p>
        {showReservationHold && holdCountdown ? (
          <div className="mt-6 flex items-center gap-4 rounded bg-ticket-obsidian p-4 text-white">
            <div className="grid h-11 w-11 place-items-center rounded bg-ticket-green/20 text-ticket-green">
              <CreditCardIcon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-xl font-black">Lượt giữ vé đang áp dụng cho thanh toán này</h2>
              <p className="text-sm text-slate-300">Nếu hết thời gian này trước khi backend xác nhận thanh toán, lượt giữ vé có thể bị giải phóng.</p>
            </div>
            <span className="font-mono text-xl font-black text-ticket-green">{holdCountdown}</span>
          </div>
        ) : null}
        <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,1fr)_280px]">
          <div className="grid gap-4">
            <div className="rounded-lg border border-black/10 bg-ticket-stone p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded bg-ticket-green/10 text-ticket-green">
                  <CreditCardIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-black">{display?.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{display?.message}</p>
                  {display?.returnNotice ? <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">{display.returnNotice}</p> : null}
                  {display?.retryAfterLabel ? <p className="mt-3 text-xs font-black text-amber-700">Retry-After: {display.retryAfterLabel}</p> : null}
                </div>
              </div>
            </div>
            <TransferRow label="Concert" value={order.concertTitle ?? order.concertId} />
            <TransferRow label="Địa điểm" value={order.venue ? shortVenue(order.venue) : "-"} />
            <TransferRow label="Loại vé" value={order.ticketTypeName ?? order.ticketTypeId} />
            <TransferRow label="Cổng thanh toán" value={providerName} />
            <TransferRow label="Nội dung" value={order.paymentIntent?.memo ?? order.orderId} />
            <TransferRow label="Số tiền" value={formatCurrency(order.totalAmount)} />
          </div>
          <div className="rounded-lg border border-black/10 bg-white p-5">
            <div className="text-xs font-black uppercase tracking-wide text-slate-500">Payment intent</div>
            <div className="mt-2 break-all font-mono text-sm font-black">{order.paymentIntent?.paymentId ?? "Chưa có paymentId"}</div>
            <div className="mt-5 text-xs font-black uppercase tracking-wide text-slate-500">Checkout URL</div>
            <div className="mt-2 break-all text-sm font-bold text-slate-600">{order.paymentIntent?.checkoutUrl ?? "Backend chưa trả checkout URL cho order này."}</div>
            <div className="mt-5 text-xs font-black uppercase tracking-wide text-slate-500">Polling</div>
            <div className="mt-2 font-bold text-slate-700">{pollModeLabel(display?.pollMode ?? "fast")}</div>
          </div>
        </div>
      </section>

      <PaymentStatusView
        order={order}
        concertTitle={order.concertTitle ?? order.concertId}
        ticketTypeName={order.ticketTypeName ?? order.ticketTypeId}
        providerName={providerName}
        statusHint={statusHint}
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

function pollIntervalMs(mode: PaymentPollMode): number | null {
  if (mode === "fast") return 3_000;
  if (mode === "slow") return 10_000;
  return null;
}

function pollModeLabel(mode: PaymentPollMode): string {
  if (mode === "fast") return "Nhanh (3s)";
  if (mode === "slow") return "Chậm (10s)";
  return "Dừng polling";
}

function parsePositiveInteger(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
