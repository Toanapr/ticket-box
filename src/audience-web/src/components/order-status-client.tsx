"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CreditCardIcon, QrIcon } from "./icons";
import { PaymentStatusView } from "./payment-status-view";
import { getOrder } from "@/lib/client-api";
import { formatCurrency, shortVenue } from "@/lib/format";
import {
  getPaymentStatusDisplay,
  type PaymentPollMode,
  type PaymentStatusHint,
} from "@/lib/payment-status-display";
import {
  formatHoldCountdown,
  shouldShowOrderHoldCountdown,
} from "@/lib/reservation-hold";
import { upsertOrderRecord } from "@/lib/user-account-data";
import type { OrderRecord } from "@/lib/types";

export function OrderStatusClient({
  orderId,
}: {
  orderId: string;
}): React.ReactElement {
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setClockTick] = useState(0);
  const statusHint = useMemo<PaymentStatusHint>(
    () => ({
      paymentDegraded: searchParams.get("paymentDegraded") === "1",
      paymentStatus:
        searchParams.get("paymentStatus") === "pending_reconciliation"
          ? "pending_reconciliation"
          : undefined,
      paymentRetryAfterSeconds: parsePositiveInteger(
        searchParams.get("paymentRetryAfter"),
      ),
      paymentReturn: searchParams.get("paymentReturn") === "1",
    }),
    [searchParams],
  );
  const display = order ? getPaymentStatusDisplay(order, statusHint) : null;
  const showReservationHold = order
    ? shouldShowOrderHoldCountdown(order.status, order.reservationExpiresAt)
    : false;
  const holdCountdown = order?.reservationExpiresAt
    ? formatHoldCountdown(order.reservationExpiresAt)
    : null;

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
  }, [
    display?.pollMode,
    orderId,
    statusHint.paymentDegraded,
    statusHint.paymentRetryAfterSeconds,
    statusHint.paymentReturn,
    statusHint.paymentStatus,
  ]);

  useEffect(() => {
    if (!showReservationHold) return;
    const timer = window.setInterval(() => {
      setClockTick((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [showReservationHold]);

  if (loading) {
    return (
      <div className="rounded-lg border border-black/10 bg-white p-8 font-bold text-slate-600">
        Đang tải đơn hàng...
      </div>
    );
  }

  if (!order) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 p-8"
      >
        <h1 className="font-display text-2xl font-black text-red-900">
          Không tìm thấy order
        </h1>
        <p className="mt-2 text-sm text-red-800">
          Không tìm thấy đơn hàng hoặc bạn không còn quyền truy cập.
        </p>
      </div>
    );
  }

  const providerName =
    order.paymentIntent?.providerName ??
    (order.paymentIntent?.provider === "mock-bank" ? "Mock bank" : "VNPAY");
  const displayOrderId = shortenOrderId(order.orderId);

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-black/10 bg-white p-6 md:p-8">
        <h1 className="flex items-center gap-3 font-display text-2xl font-black">
          <QrIcon className="h-7 w-7 text-ticket-green" />
          Thanh toán qua {providerName}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Theo dõi trạng thái đơn hàng và tiếp tục thanh toán nếu giao dịch chưa
          hoàn tất.
        </p>
        {showReservationHold && holdCountdown ? (
          <div className="mt-6 flex items-center gap-4 rounded bg-ticket-obsidian p-4 text-white">
            <div className="grid h-11 w-11 place-items-center rounded bg-ticket-green/20 text-ticket-green">
              <CreditCardIcon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-lg font-black">Đang giữ vé</h2>
              <p className="text-sm text-slate-300">
                Hoàn tất thanh toán trước khi bộ đếm kết thúc.
              </p>
            </div>
            <span className="font-mono text-xl font-black text-ticket-green">
              {holdCountdown}
            </span>
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <section className="rounded-lg border border-black/10 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/10 pb-5">
            <div>
              <h2 className="font-display text-xl font-black">
                Chi tiết đơn hàng
              </h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                Mã đơn {displayOrderId}
              </p>
            </div>
            <div className="rounded bg-ticket-green/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-ticket-green">
              {display?.displayLabel}
            </div>
          </div>
          <div className="divide-y divide-black/10">
            <DetailRow
              label="Concert"
              value={order.concertTitle ?? order.concertId}
            />
            <DetailRow
              label="Địa điểm"
              value={order.venue ? shortVenue(order.venue) : "-"}
            />
            <DetailRow
              label="Loại vé"
              value={`${order.ticketTypeName ?? order.ticketTypeId} x ${order.quantity}`}
            />
            <DetailRow label="Thanh toán" value={providerName} />
            <DetailRow
              label="Tổng tiền"
              value={formatCurrency(order.totalAmount)}
              strong
            />
          </div>
        </section>

        <PaymentStatusView order={order} statusHint={statusHint} />
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}): React.ReactElement {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-4">
      <div className="text-xs font-black uppercase tracking-wide text-slate-500 sm:pt-1">
        {label}
      </div>
      <div
        className={`break-words text-base ${strong ? "font-display text-xl font-black text-ticket-green" : "font-black text-ticket-obsidian"}`}
      >
        {value}
      </div>
    </div>
  );
}

function shortenOrderId(orderId: string): string {
  return orderId.length > 8 ? `...${orderId.slice(-8)}` : orderId;
}

function pollIntervalMs(mode: PaymentPollMode): number | null {
  if (mode === "fast") return 3_000;
  if (mode === "slow") return 10_000;
  return null;
}

function parsePositiveInteger(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
