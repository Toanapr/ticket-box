import type { ConcertStatus } from "@/lib/types";

const labelByStatus: Record<ConcertStatus, string> = {
  selling: "Đang bán vé",
  upcoming: "Sắp mở bán",
  soldout: "Hết vé",
};

const classByStatus: Record<ConcertStatus, string> = {
  selling: "bg-ticket-green text-white",
  upcoming: "bg-ticket-obsidian text-white",
  soldout: "bg-slate-200 text-slate-600",
};

export function StatusBadge({ status }: { status: ConcertStatus }): React.ReactElement {
  return (
    <span className={`inline-flex rounded px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${classByStatus[status]}`}>
      {labelByStatus[status]}
    </span>
  );
}
