import { Breadcrumbs } from "@/components/breadcrumbs";
import { ConcertListClient } from "@/components/concert-list-client";
import { HeroSpotlight } from "@/components/hero-spotlight";
import { PageShell } from "@/components/site-shell";
import { getConcerts } from "@/lib/server-api";

export default async function ConcertsPage(): Promise<React.ReactElement> {
  const concerts = await getConcerts();

  return (
    <PageShell>
      <Breadcrumbs items={[{ label: "Kham pha concerts" }]} />
      <HeroSpotlight concerts={concerts} />
      <ConcertListClient concerts={concerts} />
    </PageShell>
  );
}
