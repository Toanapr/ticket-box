import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, CalendarIcon, MapPinIcon } from "./icons";
import { formatDateTime } from "@/lib/format";
import type { ConcertSummary } from "@/lib/types";

export function HeroSpotlight({ concert }: { concert: ConcertSummary }): React.ReactElement {
  return (
    <section className="mb-12 grid gap-8 border-b-2 border-ticket-obsidian pb-12 lg:grid-cols-[1fr_340px] lg:items-center">
      <div>
        <span className="mb-5 inline-flex border border-ticket-obsidian px-3 py-1 text-xs font-black uppercase tracking-widest">
          Nổi bật
        </span>
        <h1 className="max-w-3xl font-display text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
          {concert.title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">{concert.description}</p>
        <div className="mt-7 flex flex-wrap gap-5 text-sm font-bold text-slate-600">
          <span className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-ticket-green" />
            {formatDateTime(concert.startsAt)}
          </span>
          <span className="flex items-center gap-2">
            <MapPinIcon className="h-5 w-5 text-ticket-green" />
            {concert.venue}
          </span>
        </div>
        <Link
          href={`/concerts/${concert.id}`}
          className="mt-8 inline-flex min-h-12 items-center gap-2 rounded bg-ticket-obsidian px-6 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-ticket-green"
        >
          Mua vé ngay
          <ArrowRightIcon className="h-5 w-5" />
        </Link>
      </div>
      <div className="relative aspect-square overflow-hidden rounded-lg border border-black/10 bg-slate-100 shadow-sm">
        <Image src={concert.posterPath} alt={`${concert.title} poster`} fill priority sizes="340px" className="object-cover" />
      </div>
    </section>
  );
}
