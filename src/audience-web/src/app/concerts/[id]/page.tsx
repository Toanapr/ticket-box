import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ConcertPoster } from "@/components/concert-poster";
import { ArrowRightIcon, CalendarIcon, InfoIcon, LayersIcon, MapPinIcon, UsersIcon } from "@/components/icons";
import { PageShell } from "@/components/site-shell";
import { SeatingMap } from "@/components/seating-map";
import { TicketTypeSidebar } from "@/components/ticket-type-sidebar";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getConcertById } from "@/lib/server-api";

interface ConcertDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ ticketType?: string }>;
}

export default async function ConcertDetailPage({ params, searchParams }: ConcertDetailPageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const query = await searchParams;
  const concert = await getConcertById(id);
  if (!concert) notFound();

  const selectedTicketType =
    concert.ticketTypes.find((type) => type.id === query?.ticketType) ??
    concert.ticketTypes.find((type) => type.availableApprox > 0) ??
    concert.ticketTypes[0];
  const minPrice = selectedTicketType ? Math.min(...concert.ticketTypes.map((type) => type.price)) : null;
  const [venueMain, ...venueRest] = concert.venue.split(",");
  const venueSub = venueRest.join(",").trim();
  const canBuy = concert.status === "selling" && Boolean(selectedTicketType && selectedTicketType.availableApprox > 0);
  const heroCtaLabel = !selectedTicketType
    ? "Chưa có vé"
    : concert.status === "upcoming"
      ? "Sắp mở bán"
      : concert.status === "soldout"
        ? "Hết vé"
        : "Mua vé ngay";

  return (
    <PageShell>
      <Breadcrumbs items={[{ label: "Concerts", href: "/concerts" }, { label: concert.title }]} />

      <section className="mb-10 overflow-hidden rounded-[24px] bg-[#111315] text-white shadow-[0_20px_40px_rgba(0,0,0,0.15)]">
        <div className="flex flex-col lg:h-[400px] lg:flex-row">
          <div className="order-3 flex flex-col justify-between bg-[#1a1c1e] p-6 md:p-9 lg:order-1 lg:w-[380px] lg:shrink-0">
            <div>
              <h1 className="font-display text-[24px] font-black uppercase leading-[1.25] tracking-tight text-white md:text-[28px] lg:line-clamp-3 lg:text-[24px]">
                {concert.title}
              </h1>
              <div className="mt-7 grid gap-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-5 w-5 shrink-0 place-items-center text-white">
                    <CalendarIcon className="h-[18px] w-[18px]" />
                  </span>
                  <div className="grid gap-1">
                    <span className="text-sm font-black text-ticket-green">{formatDateTime(concert.startsAt)}</span>
                    <span className="w-max rounded border border-[#3d4145] bg-[#27292b] px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-white">
                      + 1 ngày khác
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="grid h-5 w-5 shrink-0 place-items-center text-white">
                    <MapPinIcon className="h-[18px] w-[18px]" />
                  </span>
                  <div className="grid gap-1">
                    <span className="text-sm font-black uppercase tracking-[0.03em] text-ticket-green">{venueMain}</span>
                    {venueSub ? <span className="text-[12.5px] leading-5 text-slate-400">{venueSub}</span> : null}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-8 border-t border-white/10 pt-6">
              {minPrice !== null ? <div className="flex items-center gap-2">
                <span className="text-[15px] font-bold text-white">Giá từ</span>
                <span className="font-display text-[30px] font-black leading-none text-ticket-green md:text-[34px] lg:text-[22px]">
                  {formatCurrency(minPrice)}
                </span>
                <ArrowRightIcon className="h-5 w-5 text-ticket-green" />
              </div> : null}
              {canBuy && selectedTicketType ? (
                <Link
                  href={`/concerts/${concert.id}/checkout?ticketType=${selectedTicketType.id}`}
                  className="mt-4 flex min-h-12 w-full items-center justify-center rounded-lg bg-ticket-green px-5 py-3 text-[15px] font-black uppercase tracking-wide text-white transition hover:bg-[#00964a]"
                >
                  {heroCtaLabel}
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-4 min-h-12 w-full rounded-lg border border-white/5 bg-[#2b2e31] px-5 py-3 text-[15px] font-black uppercase tracking-wide text-slate-500"
                >
                  {heroCtaLabel}
                </button>
              )}
            </div>
          </div>
          <div className="relative order-2 h-8 shrink-0 bg-[#1a1c1e] lg:h-full lg:w-8">
            <div className="absolute inset-y-0 left-1/2 hidden -translate-x-1/2 border-l border-dashed border-white/20 lg:block" />
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t border-dashed border-white/20 lg:hidden" />
            <div className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-ticket-alabaster lg:left-1/2 lg:top-[-12px] lg:-translate-x-1/2 lg:translate-y-0" />
            <div className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-ticket-alabaster lg:bottom-[-12px] lg:left-1/2 lg:right-auto lg:top-auto lg:-translate-x-1/2 lg:translate-y-0" />
          </div>
          <div className="relative order-1 h-[300px] overflow-hidden bg-black lg:order-3 lg:h-full lg:flex-1">
            <ConcertPoster src={concert.posterPath} title={concert.title} priority sizes="(max-width: 1024px) 100vw, 800px" />
          </div>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="grid gap-10">
          <InfoSection title="Dàn nghệ sĩ biểu diễn" icon={<UsersIcon className="h-6 w-6 text-ticket-green" />}>
            <div className="flex flex-wrap gap-3">
              {concert.artists.map((artist) => (
                <span key={artist} className="inline-flex min-h-11 items-center gap-2 rounded border border-black/10 bg-ticket-stone px-4 text-sm font-black">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-ticket-obsidian text-[10px] text-white">{artist[0]}</span>
                  {artist}
                </span>
              ))}
            </div>
          </InfoSection>

          <InfoSection title="Sơ đồ khu vực khán đài" icon={<LayersIcon className="h-6 w-6 text-ticket-green" />}>
            {selectedTicketType ? (
              <SeatingMap concert={concert} selectedTicketTypeId={selectedTicketType.id} />
            ) : (
              <p className="text-sm font-bold text-slate-500">Sự kiện chưa công bố khu vực vé.</p>
            )}
          </InfoSection>

          <InfoSection title="Thông tin chi tiết" icon={<InfoIcon className="h-6 w-6 text-ticket-green" />}>
            <p className="max-w-3xl text-base leading-8 text-slate-600">{concert.description}</p>
          </InfoSection>
        </div>
        {selectedTicketType ? (
          <TicketTypeSidebar concert={concert} selectedTicketTypeId={selectedTicketType.id} />
        ) : (
          <aside className="rounded-lg border border-black/10 bg-white p-6 text-sm font-bold text-slate-500">
            Chưa có hạng vé được mở bán.
          </aside>
        )}
      </div>
    </PageShell>
  );
}

function InfoSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section className="border-b border-black/10 pb-9">
      <h2 className="mb-5 flex items-center gap-3 font-display text-2xl font-black tracking-tight">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}
