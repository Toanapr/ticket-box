"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CheckoutField, SummaryRow } from "./checkout-parts";
import { AlertIcon, CreditCardIcon } from "./icons";
import {
  createOrder,
  createReservation,
  ReservationApiError,
} from "@/lib/client-api";
import { formatCurrency, formatDateTime, makeIdempotencyKey, serviceFee, shortVenue } from "@/lib/format";
import type { BuyerInfo, ConcertDetail, ReservationErrorCode } from "@/lib/types";

type MockFailure = ReservationErrorCode | "NORMAL";

const errorTitles: Record<ReservationErrorCode, string> = {
  SOLD_OUT: "Ve da ban het",
  QUOTA_EXCEEDED: "Vuot han muc mua ve",
  SALE_NOT_OPEN: "Cong ban ve chua mo",
  RESERVATION_EXPIRED: "Phien giu ve het han",
  UNKNOWN: "Khong the tao don",
};

export function CheckoutClient({
  concert,
  ticketTypeId,
}: {
  concert: ConcertDetail;
  ticketTypeId: string;
}): React.ReactElement {
  const router = useRouter();
  const ticketType = concert.ticketTypes.find((item) => item.id === ticketTypeId) ?? concert.ticketTypes[0];
  const [quantity, setQuantity] = useState(1);
  const [buyer, setBuyer] = useState<BuyerInfo>({
    fullName: "Nguyen Van Khan Gia",
    phone: "0912345678",
    email: "audience@ticketbox.vn",
  });
  const [mockFailure, setMockFailure] = useState<MockFailure>("NORMAL");
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const totals = useMemo(() => {
    const ticketTotal = ticketType.price * quantity;
    const fee = serviceFee(ticketTotal);
    return { ticketTotal, fee, total: ticketTotal + fee };
  }, [quantity, ticketType.price]);

  async function submit(): Promise<void> {
    setSubmitting(true);
    setError(null);

    try {
      const reservation = await createReservation(
        {
          concertId: concert.id,
          ticketTypeId: ticketType.id,
          quantity,
          idempotencyKey: makeIdempotencyKey("reservation"),
        },
        mockFailure,
      );
      const order = await createOrder({
        reservation,
        concertId: concert.id,
        buyer,
        idempotencyKey: makeIdempotencyKey("order"),
      });
      router.push(`/orders/${order.orderId}`);
    } catch (caught) {
      if (caught instanceof ReservationApiError) {
        setError({ title: errorTitles[caught.code], message: caught.message });
      } else {
        setError({ title: "Khong the tao don", message: "He thong dang ban. Vui long thu lai sau." });
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:items-start">
      <section className="grid gap-8">
        <div className="flex items-center gap-4 rounded bg-ticket-obsidian p-4 text-white">
          <div className="grid h-11 w-11 place-items-center rounded bg-ticket-green/20 text-ticket-green">
            <CreditCardIcon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h1 className="font-display text-xl font-black">Dang giu ve cua ban</h1>
            <p className="text-sm text-slate-300">Hoan tat thanh toan sau khi tao order. Reservation/order backend la nguon quyet dinh.</p>
          </div>
          <span className="font-mono text-xl font-black text-ticket-green">10:00</span>
        </div>

        {error ? (
          <div role="alert" className="flex gap-3 rounded border border-red-600 bg-red-50 p-4 text-red-900">
            <AlertIcon className="mt-0.5 h-6 w-6 shrink-0" />
            <div>
              <h2 className="font-black">{error.title}</h2>
              <p className="mt-1 text-sm">{error.message}</p>
            </div>
          </div>
        ) : null}

        <section className="border-b border-black/10 pb-8">
          <h2 className="font-display text-2xl font-black">1. Chon so luong ve</h2>
          <div className="mt-5 flex flex-col gap-5 rounded-lg border border-black/10 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-black">{ticketType.name}</div>
              <div className="mt-1 text-sm font-bold text-slate-600">{formatCurrency(ticketType.price)} / ve</div>
              <div className="mt-2 text-xs font-bold text-slate-500">Han muc hien thi: {ticketType.maxPerUser} ve/tai khoan</div>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                disabled={quantity <= 1 || submitting}
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                className="h-11 w-11 rounded border border-black/10 bg-ticket-stone text-xl font-black disabled:opacity-40"
              >
                -
              </button>
              <span className="w-8 text-center font-display text-xl font-black">{quantity}</span>
              <button
                type="button"
                disabled={quantity >= ticketType.maxPerUser || submitting}
                onClick={() => setQuantity((value) => Math.min(ticketType.maxPerUser, value + 1))}
                className="h-11 w-11 rounded border border-black/10 bg-ticket-stone text-xl font-black disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>
        </section>

        <section className="border-b border-black/10 pb-8">
          <h2 className="font-display text-2xl font-black">2. Thong tin nhan e-ticket</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <CheckoutField label="Ho va ten" value={buyer.fullName} onChange={(fullName) => setBuyer((value) => ({ ...value, fullName }))} />
            <CheckoutField label="So dien thoai" value={buyer.phone} type="tel" onChange={(phone) => setBuyer((value) => ({ ...value, phone }))} />
            <CheckoutField
              label="Email nhan ve"
              value={buyer.email}
              type="email"
              className="sm:col-span-2"
              onChange={(email) => setBuyer((value) => ({ ...value, email }))}
            />
          </div>
        </section>

        <section className="rounded-lg border border-dashed border-black/20 bg-ticket-stone p-5">
          <h2 className="text-sm font-black uppercase tracking-wide">Local demo controls</h2>
          <p className="mt-1 text-sm text-slate-600">Dung de test response backend khi Person 2 chua ban giao API.</p>
          <select
            value={mockFailure}
            onChange={(event) => setMockFailure(event.target.value as MockFailure)}
            className="mt-4 min-h-12 w-full rounded border border-black/10 bg-white px-3 text-base font-bold"
          >
            <option value="NORMAL">Dat cho thanh cong</option>
            <option value="SOLD_OUT">Loi: sold out</option>
            <option value="QUOTA_EXCEEDED">Loi: quota exceeded</option>
            <option value="SALE_NOT_OPEN">Loi: sale not open</option>
          </select>
        </section>
      </section>

      <aside className="sticky top-24 rounded-lg border border-ticket-obsidian bg-white p-6 shadow-[6px_6px_0_#0d1118]">
        <h2 className="font-display text-xl font-black">Tom tat don hang</h2>
        <div className="mt-5 flex gap-4 border-b border-black/10 pb-5">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded border border-black/10">
            <Image src={concert.posterPath} alt={`${concert.title} poster`} fill sizes="80px" className="object-cover" />
          </div>
          <div>
            <div className="font-black leading-tight">{concert.title}</div>
            <div className="mt-2 text-xs font-bold text-slate-500">{formatDateTime(concert.startsAt)}</div>
            <div className="text-xs font-bold text-slate-500">{shortVenue(concert.venue)}</div>
          </div>
        </div>
        <SummaryRow label={`${ticketType.name} x ${quantity}`} value={formatCurrency(totals.ticketTotal)} />
        <SummaryRow label="Phi dich vu he thong 2%" value={formatCurrency(totals.fee)} />
        <div className="mt-5 flex justify-between border-t border-dashed border-black/20 pt-5 font-black">
          <span>Tong thanh toan</span>
          <span className="font-display text-xl text-ticket-green">{formatCurrency(totals.total)}</span>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded bg-ticket-green px-4 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-ticket-obsidian disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Dang tao reservation..." : "Xac nhan & thanh toan"}
          <CreditCardIcon className="h-5 w-5" />
        </button>
      </aside>
    </div>
  );
}
