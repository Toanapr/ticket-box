import { Breadcrumbs } from "@/components/breadcrumbs";
import { ConcertListClient } from "@/components/concert-list-client";
import { HeroSpotlight } from "@/components/hero-spotlight";
import { PageShell } from "@/components/site-shell";
import { getConcerts } from "@/lib/server-api";

export default async function ConcertsPage(): Promise<React.ReactElement> {
  const concerts = await getConcerts();
  const spotlight = concerts.find((concert) => concert.status === "selling") ?? concerts[0];

  return (
    <PageShell>
      <Breadcrumbs items={[{ label: "Kham pha concerts" }]} />
      {spotlight ? <HeroSpotlight concert={spotlight} /> : null}
      <ConcertListClient concerts={concerts} />
    </PageShell>
  );
}
