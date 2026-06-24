import { notFound, permanentRedirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CheckoutClient } from "@/components/checkout-client";
import { PageShell } from "@/components/site-shell";
import { getConcertByIdentifier } from "@/lib/server-api";
import { requireAuthUser } from "@/lib/require-auth-user";

interface CheckoutPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ ticketType?: string }>;
}

export default async function CheckoutPage({ params, searchParams }: CheckoutPageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const query = await searchParams;
  const ticketTypeQuery = query?.ticketType ? `?ticketType=${encodeURIComponent(query.ticketType)}` : "";
  const concert = await getConcertByIdentifier(id);
  if (!concert) notFound();
  if (id !== concert.slug) {
    permanentRedirect(`/concerts/${concert.slug}/checkout${ticketTypeQuery}`);
  }
  await requireAuthUser(`/concerts/${concert.slug}/checkout${ticketTypeQuery}`);

  const ticketType =
    concert.ticketTypes.find((item) => item.id === query?.ticketType) ??
    concert.ticketTypes.find((item) => item.availableApprox > 0) ??
    concert.ticketTypes[0];
  if (!ticketType) notFound();

  return (
    <PageShell>
      <Breadcrumbs
        items={[
          { label: "Concerts", href: "/concerts" },
          { label: concert.title, href: `/concerts/${concert.slug}?ticketType=${ticketType.id}` },
          { label: "Checkout" },
        ]}
      />
      <CheckoutClient concert={concert} ticketTypeId={ticketType.id} />
    </PageShell>
  );
}
