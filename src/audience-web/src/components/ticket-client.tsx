"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { PrinterIcon, TicketIcon } from "./icons";
import { getTicket } from "@/lib/client-api";
import { formatDateTime, shortVenue } from "@/lib/format";
import type { TicketRecord } from "@/lib/types";

export function TicketClient({
  ticketId,
}: {
  ticketId: string;
}): React.ReactElement {
  const [ticket, setTicket] = useState<TicketRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load(initialLoad = false): Promise<void> {
      try {
        const nextTicket = await getTicket(ticketId);
        if (active) setTicket(nextTicket);
      } finally {
        if (active && initialLoad) setLoading(false);
      }
    }

    void load(true);
    const refreshInterval = window.setInterval(() => void load(), 10_000);
    const refreshWhenVisible = (): void => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      active = false;
      window.clearInterval(refreshInterval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [ticketId]);

  if (loading) {
    return (
      <div className="rounded-lg border border-black/10 bg-white p-8 font-bold text-slate-600">
        Đang tải e-ticket...
      </div>
    );
  }

  if (!ticket) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 p-8"
      >
        <h1 className="font-display text-2xl font-black text-red-900">
          Không tìm thấy ticket
        </h1>
        <p className="mt-2 text-sm text-red-800">
          E-ticket chỉ xuất hiện sau khi thanh toán được xác nhận và vé được
          phát hành.
        </p>
      </div>
    );
  }

  const statusDisplay = {
    issued: {
      label: "Chưa check-in",
      className: "bg-ticket-green/10 text-ticket-green",
    },
    checked_in: {
      label: "Đã check-in",
      className: "bg-sky-100 text-sky-800",
    },
    revoked: {
      label: "Vé đã bị thu hồi",
      className: "bg-red-100 text-red-800",
    },
  }[ticket.status];

  return (
    <section className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded border border-ticket-obsidian bg-white px-4 text-sm font-black uppercase tracking-wide"
        >
          <PrinterIcon className="h-5 w-5" />
          In vé / Lưu PDF
        </button>
        <Link
          href="/concerts"
          className="flex min-h-12 flex-1 items-center justify-center rounded bg-ticket-green px-4 text-sm font-black uppercase tracking-wide text-white"
        >
          Trang chủ
        </Link>
      </div>

      <article className="overflow-hidden rounded border border-dashed border-ticket-obsidian bg-white">
        <div className="grid h-32 place-items-center bg-ticket-obsidian px-6 text-center text-white">
          <div>
            <TicketIcon className="mx-auto mb-2 h-8 w-8 text-ticket-green" />
            <div className="font-display text-2xl font-black uppercase tracking-[0.18em]">
              E-Ticket Pass
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <h1 className="font-display text-3xl font-black tracking-tight">
            {ticket.concertTitle ?? "TicketBox Concert"}
          </h1>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Meta
              label="Thời gian"
              value={ticket.startsAt ? formatDateTime(ticket.startsAt) : "-"}
            />
            <Meta
              label="Địa điểm"
              value={ticket.venue ? shortVenue(ticket.venue) : "-"}
            />
            <Meta
              label="Khu vé"
              value={ticket.ticketTypeName ?? ticket.ticketTypeId}
            />
            <Meta label="Vị trí / ghế" value={ticket.seats.join(", ")} />
            <Meta label="Chủ sở hữu" value={ticket.owner.fullName} />
            <Meta label="Email" value={ticket.owner.email} />
          </div>
        </div>

        <div className="border-t-2 border-dashed border-slate-300 bg-ticket-alabaster p-6 text-center md:p-8">
          <div className="mx-auto h-44 w-44 rounded border border-ticket-obsidian bg-white p-3">
            <QRCodeSVG
              value={ticket.qrPayload}
              size={152}
              level="M"
              marginSize={2}
              className="h-full w-full"
              title="E-ticket QR code"
            />
          </div>
          <div className="mt-4 text-xs font-black uppercase tracking-wide text-slate-500">
            Mã số vé điện tử
          </div>
          <div className="mt-1 font-mono text-lg font-black tracking-wide">
            {ticket.ticketId}
          </div>
          <div
            className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${statusDisplay.className}`}
          >
            {statusDisplay.label}
          </div>
          <div className="mt-5 break-all font-mono text-[11px] uppercase text-slate-500">
            {ticket.signedPayload}
          </div>
        </div>
      </article>
    </section>
  );
}

function Meta({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <div>
      <div className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 font-bold text-ticket-obsidian">{value}</div>
    </div>
  );
}
