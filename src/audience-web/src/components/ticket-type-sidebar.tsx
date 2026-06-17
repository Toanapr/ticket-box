import Link from "next/link";
import { ArrowRightIcon } from "./icons";
import { StatusBadge } from "./status-badge";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { ConcertDetail } from "@/lib/types";

export function TicketTypeSidebar({
  concert,
  selectedTicketTypeId,
}: {
  concert: ConcertDetail;
  selectedTicketTypeId: string;
}): React.ReactElement {
  const selectedType = concert.ticketTypes.find((item) => item.id === selectedTicketTypeId);
  const canCheckout = concert.status === "selling" && selectedType && selectedType.availableApprox > 0;

  return (
    <aside className="sticky top-24 rounded-lg border border-black/10 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-black">Chọn khu vực vé</h2>
        <StatusBadge status={concert.status} />
      </div>
      <div className="grid gap-3">
        {concert.ticketTypes.map((type) => {
          const soldOut = type.availableApprox <= 0;
          return (
            <Link
              key={type.id}
              href={`/concerts/${concert.id}?ticketType=${type.id}`}
              scroll={false}
              className={`rounded-lg border p-4 transition ${
                type.id === selectedTicketTypeId
                  ? "border-ticket-green bg-ticket-green/5"
                  : soldOut
                    ? "border-black/10 bg-slate-50 opacity-60"
                    : "border-black/10 hover:border-ticket-obsidian"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-black">{type.name}</span>
                <span className="text-right font-display font-black text-ticket-obsidian">{formatCurrency(type.price)}</span>
              </div>
              <div className="mt-2 grid gap-1 text-xs font-bold text-slate-500">
                <span>{soldOut ? "Hết vé" : `~${type.availableApprox} vé gần realtime`}</span>
                <span>Hạn mức: {type.maxPerUser} vé/tài khoản</span>
                <span>Mở bán: {formatDateTime(type.saleStartsAt)}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {canCheckout ? (
        <Link
          href={`/concerts/${concert.id}/checkout?ticketType=${selectedTicketTypeId}`}
          className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded bg-ticket-obsidian px-4 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-ticket-green"
        >
          Tiếp tục checkout
          <ArrowRightIcon className="h-5 w-5" />
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className="mt-6 min-h-12 w-full rounded border border-black/10 bg-ticket-stone px-4 py-3 text-sm font-black uppercase tracking-wide text-slate-400"
        >
          {concert.status === "upcoming" ? "Sự kiện chưa mở bán" : "Không thể checkout"}
        </button>
      )}
      <p className="mt-4 text-center text-xs leading-5 text-slate-500">
        Số vé còn lại chỉ gần realtime. Backend reservation/order mới quyết định còn vé và quota.
      </p>
    </aside>
  );
}
