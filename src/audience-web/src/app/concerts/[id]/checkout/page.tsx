import { notFound, permanentRedirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CheckoutClient } from "@/components/checkout-client";
import { PageShell } from "@/components/site-shell";
import { getConcertByIdentifier } from "@/lib/server-api";
import { requireAuthUser } from "@/lib/require-auth-user";
import { resolveTicketTypeSelection } from "@/lib/ticket-type-selection";

interface CheckoutPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ ticketType?: string }>;
}

export default async function CheckoutPage({ params, searchParams }: CheckoutPageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const query = await searchParams;
  const concert = await getConcertByIdentifier(id);
  if (!concert) notFound();
  const selection = resolveTicketTypeSelection(concert, query?.ticketType);
  const ticketTypeQuery = selection.canonicalIdentifier
    ? `?ticketType=${encodeURIComponent(selection.canonicalIdentifier)}`
    : "";
  if (id !== concert.slug || query?.ticketType !== selection.canonicalIdentifier) {
    permanentRedirect(`/concerts/${concert.slug}/checkout${ticketTypeQuery}`);
  }
  await requireAuthUser(`/concerts/${concert.slug}/checkout${ticketTypeQuery}`);

  const ticketType = selection.ticketType;
  if (!ticketType) notFound();

  return (
    <PageShell>
      <Breadcrumbs
        items={[
          { label: "Concerts", href: "/concerts" },
          { label: concert.title, href: `/concerts/${concert.slug}?ticketType=${ticketType.slug}` },
          { label: "Checkout" },
        ]}
      />
      <CheckoutClient concert={concert} ticketTypeId={ticketType.id} />
    </PageShell>
  );
}
