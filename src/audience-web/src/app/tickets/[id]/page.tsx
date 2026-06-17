import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageShell } from "@/components/site-shell";
import { TicketClient } from "@/components/ticket-client";

interface TicketPageProps {
  params: Promise<{ id: string }>;
}

export default async function TicketPage({ params }: TicketPageProps): Promise<React.ReactElement> {
  const { id } = await params;

  return (
    <PageShell>
      <Breadcrumbs items={[{ label: "Concerts", href: "/concerts" }, { label: "E-ticket QR" }]} />
      <TicketClient ticketId={id} />
    </PageShell>
  );
}
