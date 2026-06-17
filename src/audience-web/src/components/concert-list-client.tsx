"use client";

import { useMemo, useState } from "react";
import { ConcertCard } from "./concert-card";
import { SearchIcon } from "./icons";
import type { ConcertStatus, ConcertSummary } from "@/lib/types";

type Filter = "all" | ConcertStatus;

const filters: Array<{ label: string; value: Filter }> = [
  { label: "Tất cả", value: "all" },
  { label: "Đang bán vé", value: "selling" },
  { label: "Sắp diễn ra", value: "upcoming" },
];

export function ConcertListClient({ concerts }: { concerts: ConcertSummary[] }): React.ReactElement {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const visibleConcerts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return concerts.filter((concert) => {
      const matchesFilter = filter === "all" || concert.status === filter;
      const haystack = `${concert.title} ${concert.artists.join(" ")} ${concert.venue}`.toLowerCase();
      return matchesFilter && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [concerts, filter, query]);

  return (
    <section aria-label="Danh sách concert">
      <div className="mb-10 flex flex-col gap-5 border-b border-black/10 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-wrap gap-6">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`min-h-11 border-b-[3px] px-0 pb-4 pt-2 text-sm font-black uppercase tracking-wide transition ${
                filter === item.value
                  ? "border-ticket-green text-ticket-obsidian"
                  : "border-transparent text-slate-500 hover:text-ticket-obsidian"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="relative mb-4 block w-full md:w-80">
          <span className="sr-only">Tìm concert</span>
          <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm tên concert, nghệ sĩ..."
            className="min-h-12 w-full rounded border border-black/10 bg-white py-3 pl-11 pr-4 text-base font-semibold outline-none transition focus:border-ticket-obsidian focus:ring-2 focus:ring-ticket-green/25"
          />
        </label>
      </div>

      {visibleConcerts.length > 0 ? (
        <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-3">
          {visibleConcerts.map((concert) => (
            <ConcertCard key={concert.id} concert={concert} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-black/10 bg-white p-10 text-center">
          <h2 className="font-display text-2xl font-black">Không tìm thấy concert</h2>
          <p className="mt-2 text-sm text-slate-600">Thử đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
        </div>
      )}
    </section>
  );
}
