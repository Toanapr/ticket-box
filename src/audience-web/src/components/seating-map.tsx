import Link from "next/link";
import { ticketZoneColors } from "@/lib/ticket-zone-styles";
import type { ConcertDetail, TicketType } from "@/lib/types";

export function SeatingMap({
  concert,
  selectedTicketTypeId,
}: {
  concert: ConcertDetail;
  selectedTicketTypeId: string;
}): React.ReactElement {
  const selected = concert.ticketTypes.find((item) => item.id === selectedTicketTypeId);

  return (
    <div className="grid gap-5">
      <div className="rounded-lg border border-black/10 bg-ticket-stone p-4 md:p-6">
        <svg viewBox="0 0 400 300" className="h-auto w-full" role="img" aria-label="Sơ đồ khu vực khán đài">
          <rect x="100" y="12" width="200" height="30" rx="5" fill="#1e3a8a" />
          <text x="200" y="31" textAnchor="middle" fill="white" fontSize="12" fontWeight="800">
            STAGE / SÂN KHẤU
          </text>
          {concert.ticketTypes.map((type) => (
            <ZoneShape
              key={type.id}
              href={`/concerts/${concert.id}?ticketType=${type.id}`}
              zone={type.zone}
              label={type.zone.toUpperCase()}
              selected={type.id === selected?.id}
              soldOut={type.availableApprox <= 0}
            />
          ))}
        </svg>
      </div>
      <div className="flex flex-wrap justify-center gap-3 rounded border border-black/10 bg-white p-3">
        {concert.ticketTypes.map((type) => (
          <Link
            key={type.id}
            href={`/concerts/${concert.id}?ticketType=${type.id}`}
            scroll={false}
            className={`inline-flex min-h-11 items-center gap-2 rounded border px-3 py-2 text-sm font-bold transition ${
              type.id === selectedTicketTypeId ? "border-ticket-green bg-ticket-green/10" : "border-black/10 hover:border-ticket-obsidian"
            }`}
          >
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: ticketZoneColors[type.zone] }} />
            {type.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

function ZoneShape({
  href,
  zone,
  label,
  selected,
  soldOut,
}: {
  href: string;
  zone: TicketType["zone"];
  label: string;
  selected: boolean;
  soldOut: boolean;
}): React.ReactElement {
  const pathByZone: Record<TicketType["zone"], string> = {
    svip: "M120 60 L280 60 L290 110 L110 110 Z",
    vip: "M105 120 L295 120 L310 180 L90 180 Z",
    cat1: "M20 60 L95 110 L80 230 L10 180 Z",
    cat2: "M305 110 L380 60 L390 180 L320 230 Z",
    ga: "M85 190 L315 190 L330 260 L70 260 Z",
  };
  const textByZone: Record<TicketType["zone"], { x: number; y: number }> = {
    svip: { x: 200, y: 90 },
    vip: { x: 200, y: 155 },
    cat1: { x: 50, y: 140 },
    cat2: { x: 350, y: 140 },
    ga: { x: 200, y: 230 },
  };

  return (
    <Link href={href} scroll={false} aria-label={`Chọn khu ${label}`}>
      <path
        d={pathByZone[zone]}
        fill={ticketZoneColors[zone]}
        opacity={soldOut ? 0.22 : selected ? 0.95 : 0.62}
        stroke={selected ? "#0d1118" : "transparent"}
        strokeWidth={selected ? 4 : 0}
        className="cursor-pointer transition hover:opacity-90"
      />
      <text
        x={textByZone[zone].x}
        y={textByZone[zone].y}
        textAnchor="middle"
        fill="white"
        fontSize="11"
        fontWeight="800"
        pointerEvents="none"
      >
        {label}
      </text>
    </Link>
  );
}
