import Image from "next/image";
import Link from "next/link";
import { CalendarIcon, MapPinIcon } from "./icons";
import { StatusBadge } from "./status-badge";
import { formatDateTime, shortVenue } from "@/lib/format";
import type { ConcertSummary } from "@/lib/types";

export function ConcertCard({ concert }: { concert: ConcertSummary }): React.ReactElement {
  return (
    <Link href={`/concerts/${concert.id}`} className="group block border-b border-black/10 pb-6">
      <div className="relative mb-4 aspect-[16/10] overflow-hidden rounded-lg border border-black/10 bg-slate-100">
        <Image
          src={concert.posterPath}
          alt={`${concert.title} poster`}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition duration-300 group-hover:scale-[1.04]"
        />
        <div className="absolute right-3 top-3">
          <StatusBadge status={concert.status} />
        </div>
      </div>
      <div className="mb-2 truncate text-xs font-black uppercase tracking-widest text-ticket-green">
        {concert.artists.slice(0, 3).join(" / ")}
      </div>
      <h2 className="font-display text-2xl font-black leading-tight tracking-tight transition group-hover:text-ticket-green">
        {concert.title}
      </h2>
      <div className="mt-4 grid gap-2 text-sm font-semibold text-slate-600">
        <span className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-slate-400" />
          {formatDateTime(concert.startsAt)}
        </span>
        <span className="flex items-center gap-2">
          <MapPinIcon className="h-4 w-4 text-slate-400" />
          {shortVenue(concert.venue)}
        </span>
      </div>
    </Link>
  );
}
