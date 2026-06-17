import Image from "next/image";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CalendarIcon, InfoIcon, LayersIcon, MapPinIcon, UsersIcon } from "@/components/icons";
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
  const minPrice = Math.min(...concert.ticketTypes.map((type) => type.price));

  return (
    <PageShell>
      <Breadcrumbs items={[{ label: "Concerts", href: "/concerts" }, { label: concert.title }]} />

      <section className="mb-10 overflow-hidden rounded-3xl bg-ticket-obsidian text-white shadow-[0_20px_40px_rgba(0,0,0,0.15)]">
        <div className="grid lg:grid-cols-[390px_1fr]">
          <div className="flex flex-col justify-between p-6 md:p-9">
            <div>
              <h1 className="font-display text-3xl font-black uppercase leading-tight tracking-tight">{concert.title}</h1>
              <div className="mt-6 grid gap-4 text-sm font-bold">
                <span className="flex items-start gap-3 text-ticket-green">
                  <CalendarIcon className="mt-0.5 h-5 w-5 text-white" />
                  {formatDateTime(concert.startsAt)}
                </span>
                <span className="flex items-start gap-3 text-ticket-green">
                  <MapPinIcon className="mt-0.5 h-5 w-5 text-white" />
                  {concert.venue}
                </span>
              </div>
            </div>
            <div className="mt-8 border-t border-white/10 pt-6">
              <div className="text-sm font-bold text-white/80">Gia tu</div>
              <div className="font-display text-3xl font-black text-ticket-green">{formatCurrency(minPrice)}</div>
            </div>
          </div>
          <div className="relative min-h-72 lg:min-h-[400px]">
            <Image src={concert.posterPath} alt={`${concert.title} poster`} fill priority sizes="(max-width: 1024px) 100vw, 800px" className="object-cover" />
          </div>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="grid gap-10">
          <InfoSection title="Dan nghe si bieu dien" icon={<UsersIcon className="h-6 w-6 text-ticket-green" />}>
            <div className="flex flex-wrap gap-3">
              {concert.artists.map((artist) => (
                <span key={artist} className="inline-flex min-h-11 items-center gap-2 rounded border border-black/10 bg-ticket-stone px-4 text-sm font-black">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-ticket-obsidian text-[10px] text-white">{artist[0]}</span>
                  {artist}
                </span>
              ))}
            </div>
          </InfoSection>

          <InfoSection title="So do khu vuc khan dai" icon={<LayersIcon className="h-6 w-6 text-ticket-green" />}>
            <SeatingMap concert={concert} selectedTicketTypeId={selectedTicketType.id} />
          </InfoSection>

          <InfoSection title="Thong tin chi tiet" icon={<InfoIcon className="h-6 w-6 text-ticket-green" />}>
            <p className="max-w-3xl text-base leading-8 text-slate-600">{concert.description}</p>
          </InfoSection>
        </div>
        <TicketTypeSidebar concert={concert} selectedTicketTypeId={selectedTicketType.id} />
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
