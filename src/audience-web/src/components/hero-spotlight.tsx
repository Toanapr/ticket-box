"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRightIcon, CalendarIcon, MapPinIcon } from "./icons";
import { ConcertPoster } from "./concert-poster";
import { formatDateTime } from "@/lib/format";
import type { ConcertSummary } from "@/lib/types";

const autoRotateMs = 5000;

export function HeroSpotlight({ concerts }: { concerts: ConcertSummary[] }): React.ReactElement | null {
  const spotlightConcerts = useMemo(
    () => concerts.filter((concert) => concert.status !== "soldout"),
    [concerts],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const concert = spotlightConcerts[activeIndex];

  useEffect(() => {
    if (spotlightConcerts.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % spotlightConcerts.length);
    }, autoRotateMs);

    return () => window.clearInterval(timer);
  }, [spotlightConcerts.length]);

  if (!concert) return null;

  return (
    <section className="mb-12 grid gap-8 border-b-2 border-ticket-obsidian pb-12 lg:grid-cols-[1fr_340px] lg:items-center">
      <div key={concert.id} className="motion-safe:[animation:spotlight-in_450ms_ease-out]">
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

        {spotlightConcerts.length > 1 ? (
          <div className="mt-8 flex flex-wrap items-center gap-3" aria-label="Điều khiển concert nổi bật">
            <div className="flex items-center gap-2">
              {spotlightConcerts.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`h-2.5 rounded-full transition-all ${
                    index === activeIndex ? "w-8 bg-ticket-green" : "w-2.5 bg-slate-300 hover:bg-slate-400"
                  }`}
                  aria-label={`Chọn ${item.title}`}
                  aria-current={index === activeIndex ? "true" : undefined}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div key={`${concert.id}-poster`} className="relative aspect-square overflow-hidden rounded-lg border border-black/10 bg-slate-100 shadow-sm motion-safe:[animation:spotlight-poster_500ms_ease-out]">
        <ConcertPoster src={concert.posterPath} title={concert.title} priority sizes="340px" />
      </div>
    </section>
  );
}
