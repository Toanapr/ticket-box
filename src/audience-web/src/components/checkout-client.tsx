"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CheckoutField, PaymentMethodSelector, SummaryRow } from "./checkout-parts";
import { useAuth } from "./auth-provider";
import { AlertIcon, CreditCardIcon } from "./icons";
import { shouldRenderWaitingRoomBanner, WaitingRoomBanner, type WaitingRoomState } from "./waiting-room-banner";
import { createOrder, createPaymentIntent, createReservation, ReservationApiError } from "@/lib/client-api";
import { clearCheckoutIntent, getCheckoutIntent } from "@/lib/checkout-intent";
import { formatCurrency, formatDateTime, serviceFee, shortVenue } from "@/lib/format";
import { formatHoldCountdown, getHoldRemainingMs } from "@/lib/reservation-hold";
import { clearSaleAccessToken, getSaleAccessToken, setSaleAccessToken } from "@/lib/sale-access-token-storage";
import { clearActiveReservation, findActiveReservation, upsertActiveReservation, upsertOrderRecord } from "@/lib/user-account-data";
import type { PaymentIntentResponse } from "@/lib/types";
import type { ActiveReservationRecord } from "@/lib/types";
import type { BuyerInfo, ConcertDetail, PaymentMethod, ReservationErrorCode } from "@/lib/types";
import { ConcertPoster } from "./concert-poster";

type MockFailure = ReservationErrorCode | "NORMAL";

const errorTitles: Record<ReservationErrorCode, string> = {
  SOLD_OUT: "Vé đã bán hết",
  QUOTA_EXCEEDED: "Vượt hạn mức mua vé",
  SALE_NOT_OPEN: "Cổng bán vé chưa mở",
  RESERVATION_EXPIRED: "Phiên giữ vé hết hạn",
  RATE_LIMITED: "Thử lại sau",
  OVERLOADED: "Hệ thống quá tải",
  SALE_ACCESS_REQUIRED: "Cần vào hàng chờ",
  SALE_TOKEN_EXPIRED: "Token vào sale hết hạn",
  PAYMENT_DEGRADED: "Thanh toán gián đoạn",
  PAYMENT_PENDING_RECONCILIATION: "Thanh toán chờ đối soát",
  IDEMPOTENCY_CONFLICT: "Checkout đã thay đổi",
  UNKNOWN: "Không thể tạo đơn",
};

export function CheckoutClient({
  concert,
  ticketTypeId,
}: {
  concert: ConcertDetail;
  ticketTypeId: string;
}): React.ReactElement {
  const router = useRouter();
  const { user } = useAuth();
  const ticketType = concert.ticketTypes.find((item) => item.id === ticketTypeId) ?? concert.ticketTypes[0];
  const [quantity, setQuantity] = useState(1);
  const [buyer, setBuyer] = useState<BuyerInfo>({
    fullName: user?.fullName?.trim() || "",
    phone: "",
    email: user?.email ?? "",
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("VNPAY");
  const [mockFailure, setMockFailure] = useState<MockFailure>("NORMAL");
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [waitingRoomState, setWaitingRoomState] = useState<WaitingRoomState>("unavailable");
  const [retryLockout, setRetryLockout] = useState<{ retryAt: string; reason: "rate-limit" | "overload"; correlationId?: string } | null>(null);
  const [activeReservationOverride, setActiveReservationOverride] = useState<ActiveReservationRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [, setClockTick] = useState(0);

  const totals = useMemo(() => {
    const ticketTotal = ticketType.price * quantity;
    const fee = serviceFee(ticketTotal);
    return { ticketTotal, fee, total: ticketTotal + fee };
  }, [quantity, ticketType.price]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const token = getSaleAccessToken(concert.id);
      setWaitingRoomState(token ? "admitted" : "unavailable");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [concert.id]);

  const activeReservation =
    activeReservationOverride ??
    findActiveReservation({
      concertId: concert.id,
      ticketTypeId: ticketType.id,
      buyerEmail: user?.email,
    });

  useEffect(() => {
    if (!retryLockout && !activeReservation) return;
    const timer = window.setInterval(() => {
      setClockTick((value) => value + 1);
      if (retryLockout && Date.parse(retryLockout.retryAt) <= new Date().getTime()) setRetryLockout(null);
      if (activeReservation && getHoldRemainingMs(activeReservation.expiresAt) === 0) {
        clearActiveReservation(activeReservation.reservationId);
        setActiveReservationOverride(null);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeReservation, retryLockout]);

  const retryActive = Boolean(retryLockout);
  const userKey = user?.email ?? "anonymous";
  const holdCountdown = activeReservation ? formatHoldCountdown(activeReservation.expiresAt) : "--:--";
  const hasActiveReservation = Boolean(activeReservation);
  const showWaitingRoomBanner = shouldRenderWaitingRoomBanner(waitingRoomState);

  async function submit(): Promise<void> {
    if (submitting || retryActive) return;
    setSubmitting(true);
    setError(null);
    let createdOrderId: string | null = null;

    try {
      const saleAccess = getSaleAccessToken(concert.id);
      const intentInput = {
        concertId: concert.id,
        ticketTypeId: ticketType.id,
        quantity,
        userKey,
      };
      const intent = getCheckoutIntent(intentInput);
      const reservation = await createReservation(
        {
          concertId: concert.id,
          ticketTypeId: ticketType.id,
          quantity,
          idempotencyKey: intent.reservationIdempotencyKey,
          saleAccessToken: saleAccess?.token,
        },
        mockFailure,
      );
      if (reservation.saleAccessToken) {
        setSaleAccessToken(concert.id, {
          token: reservation.saleAccessToken,
          expiresAt: reservation.saleAccessTokenExpiresAt,
          issuedAt: new Date().toISOString(),
        });
        setWaitingRoomState("admitted");
      }
      const nextActiveReservation: ActiveReservationRecord = {
        reservationId: reservation.reservationId,
        concertId: concert.id,
        concertSlug: concert.slug,
        concertTitle: concert.title,
        venue: concert.venue,
        ticketTypeId: ticketType.id,
        ticketTypeSlug: ticketType.slug,
        ticketTypeName: ticketType.name,
        quantity,
        buyer,
        totalAmount: totals.total,
        createdAt: new Date().toISOString(),
        expiresAt: reservation.expiresAt,
      };
      upsertActiveReservation(nextActiveReservation);
      setActiveReservationOverride(nextActiveReservation);
      const order = await createOrder({
        reservation,
        concertId: concert.id,
        buyer,
        paymentMethod,
        idempotencyKey: intent.orderIdempotencyKey,
      });
      createdOrderId = order.orderId;
      clearCheckoutIntent(intentInput);
      upsertOrderRecord(order);
      setActiveReservationOverride(null);

      let paymentIntent: PaymentIntentResponse | undefined;

      if (order.paymentIntent?.paymentId) {
        paymentIntent = await createPaymentIntent({
          paymentId: order.paymentIntent.paymentId,
          idempotencyKey: intent.paymentIntentIdempotencyKey,
        });
      }

      if (paymentIntent?.checkoutUrl) {
        window.location.assign(paymentIntent.checkoutUrl);
        return;
      }

      router.push(buildOrderUrl(order.orderId, paymentIntent));
    } catch (caught) {
      if (createdOrderId) {
        router.push(`/orders/${createdOrderId}`);
        return;
      }
      if (caught instanceof ReservationApiError) {
        if (caught.transient.kind === "sale-token-expired" || caught.transient.kind === "sale-access-required") {
          clearSaleAccessToken(concert.id);
          setWaitingRoomState(caught.transient.kind === "sale-token-expired" ? "expired" : "waiting");
        }
        if (caught.transient.kind === "rate-limit" || caught.transient.kind === "overload") {
          const retryAt = caught.transient.retryAt ?? new Date(new Date().getTime() + 5_000).toISOString();
          setRetryLockout({
            retryAt,
            reason: caught.transient.kind,
            correlationId: caught.transient.correlationId,
          });
        }
        setError({ title: errorTitles[caught.code], message: caught.message });
      } else {
        setError({ title: "Không thể tạo đơn", message: "Hệ thống đang bận. Vui lòng thử lại sau." });
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:items-start">
      <section className="grid gap-8">
        {showWaitingRoomBanner ? <WaitingRoomBanner state={waitingRoomState} retryAt={retryLockout?.retryAt} /> : null}
        <div className="flex items-center gap-4 rounded bg-ticket-obsidian p-4 text-white">
          <div className="grid h-11 w-11 place-items-center rounded bg-ticket-green/20 text-ticket-green">
            <CreditCardIcon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h1 className="font-display text-xl font-black">{hasActiveReservation ? "Đang giữ vé của bạn" : "Sẵn sàng checkout"}</h1>
            <p className="text-sm text-slate-300">
              {activeReservation
                ? "Hoàn tất thanh toán trước khi backend hết hạn giữ chỗ."
                : "Đồng hồ giữ vé chỉ bắt đầu sau khi backend tạo reservation thành công."}
            </p>
          </div>
          {hasActiveReservation ? (
            <span className="font-mono text-xl font-black text-ticket-green">{holdCountdown}</span>
          ) : (
            <span className="text-xs font-black uppercase tracking-wide text-slate-400">Chua bat dau</span>
          )}
        </div>
        {error ? (
          <div role="alert" className="flex gap-3 rounded border border-red-600 bg-red-50 p-4 text-red-900">
            <AlertIcon className="mt-0.5 h-6 w-6 shrink-0" />
            <div>
              <h2 className="font-black">{error.title}</h2>
              <p className="mt-1 text-sm">{error.message}</p>
              {retryLockout ? (
                <p className="mt-2 text-xs font-black">
                  Backend yêu cầu thử lại sau {new Date(retryLockout.retryAt).toLocaleTimeString("vi-VN")}.
                  {retryLockout.correlationId ? ` Mã theo dõi: ${retryLockout.correlationId}.` : ""}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
        <section className="border-b border-black/10 pb-8">
          <h2 className="font-display text-2xl font-black">1. Chọn số lượng vé</h2>
          <div className="mt-5 flex flex-col gap-5 rounded-lg border border-black/10 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-black">{ticketType.name}</div>
              <div className="mt-1 text-sm font-bold text-slate-600">{formatCurrency(ticketType.price)} / vé</div>
              <div className="mt-2 text-xs font-bold text-slate-500">Hạn mức hiển thị: {ticketType.maxPerUser} vé/tài khoản</div>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                disabled={quantity <= 1 || submitting || retryActive}
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                className="h-11 w-11 rounded border border-black/10 bg-ticket-stone text-xl font-black disabled:opacity-40"
              >
                -
              </button>
              <span className="w-8 text-center font-display text-xl font-black">{quantity}</span>
              <button
                type="button"
                disabled={quantity >= ticketType.maxPerUser || submitting || retryActive}
                onClick={() => setQuantity((value) => Math.min(ticketType.maxPerUser, value + 1))}
                className="h-11 w-11 rounded border border-black/10 bg-ticket-stone text-xl font-black disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>
        </section>
        <section className="border-b border-black/10 pb-8">
          <h2 className="font-display text-2xl font-black">2. Thông tin nhận e-ticket</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <CheckoutField label="Họ và tên" value={buyer.fullName} onChange={(fullName) => setBuyer((value) => ({ ...value, fullName }))} />
            <CheckoutField label="Số điện thoại" value={buyer.phone} type="tel" onChange={(phone) => setBuyer((value) => ({ ...value, phone }))} />
            <CheckoutField
              label="Email nhận vé"
              value={buyer.email}
              type="email"
              className="sm:col-span-2"
              onChange={(email) => setBuyer((value) => ({ ...value, email }))}
            />
          </div>
        </section>
        <section className="border-b border-black/10 pb-8">
          <h2 className="font-display text-2xl font-black">3. Phương thức thanh toán</h2>
          <PaymentMethodSelector value={paymentMethod} disabled={submitting || retryActive} onChange={setPaymentMethod} />
        </section>
        <section className="rounded-lg border border-dashed border-black/20 bg-ticket-stone p-5">
          <h2 className="text-sm font-black uppercase tracking-wide">Local demo controls</h2>
          <p className="mt-1 text-sm text-slate-600">Dùng để test response backend khi Person 2 chưa bàn giao API.</p>
          <select
            value={mockFailure}
            onChange={(event) => setMockFailure(event.target.value as MockFailure)}
            className="mt-4 min-h-12 w-full rounded border border-black/10 bg-white px-3 text-base font-bold"
          >
            <option value="NORMAL">Đặt chỗ thành công</option>
            <option value="SOLD_OUT">Lỗi: sold out</option>
            <option value="QUOTA_EXCEEDED">Lỗi: quota exceeded</option>
            <option value="SALE_NOT_OPEN">Lỗi: sale not open</option>
          </select>
        </section>
      </section>

      <aside className="sticky top-24 rounded-lg border border-ticket-obsidian bg-white p-6 shadow-[6px_6px_0_#0d1118]">
        <h2 className="font-display text-xl font-black">Tóm tắt đơn hàng</h2>
        <div className="mt-5 flex gap-4 border-b border-black/10 pb-5">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded border border-black/10">
            <ConcertPoster src={concert.posterPath} title={concert.title} sizes="80px" compact />
          </div>
          <div>
            <div className="font-black leading-tight">{concert.title}</div>
            <div className="mt-2 text-xs font-bold text-slate-500">{formatDateTime(concert.startsAt)}</div>
            <div className="text-xs font-bold text-slate-500">{shortVenue(concert.venue)}</div>
          </div>
        </div>
        <SummaryRow label={`${ticketType.name} x ${quantity}`} value={formatCurrency(totals.ticketTotal)} />
        <SummaryRow label="Phí dịch vụ hệ thống 2%" value={formatCurrency(totals.fee)} />
        <SummaryRow label="Phương thức" value={paymentMethod} />
        <div className="mt-5 flex justify-between border-t border-dashed border-black/20 pt-5 font-black">
          <span>Tổng thanh toán</span>
          <span className="font-display text-xl text-ticket-green">{formatCurrency(totals.total)}</span>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={submitting || retryActive}
          className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded bg-ticket-green px-4 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-ticket-obsidian disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Đang tạo reservation..." : retryActive ? "Đang chờ Retry-After" : "Xác nhận & thanh toán"}
          <CreditCardIcon className="h-5 w-5" />
        </button>
      </aside>
    </div>
  );
}

function buildOrderUrl(orderId: string, paymentIntent: PaymentIntentResponse | undefined): string {
  if (!paymentIntent) return `/orders/${orderId}`;

  const search = new URLSearchParams();
  if (paymentIntent.degraded) search.set("paymentDegraded", "1");
  if (paymentIntent.status === "pending_reconciliation") search.set("paymentStatus", paymentIntent.status);
  if (typeof paymentIntent.retryAfterSeconds === "number") search.set("paymentRetryAfter", String(paymentIntent.retryAfterSeconds));

  const query = search.toString();
  return query ? `/orders/${orderId}?${query}` : `/orders/${orderId}`;
}
