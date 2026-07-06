import { notFound } from "next/navigation";
import { TicketTypesManager } from "@/components/ticket-types-manager";
import { AdminBackLink, AdminHero } from "@/components/admin-ui";
import { Concert } from "@/lib/api";
import { serverApiFetch } from "@/lib/server-api";

type TicketTypesPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TicketTypesPage({
  params,
}: TicketTypesPageProps) {
  const { id } = await params;
  const concert = await serverApiFetch<Concert>(`/admin/concerts/${id}`).catch(
    () => null,
  );

  if (!concert) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <AdminBackLink href="/admin/concerts">Back to concerts</AdminBackLink>
        <AdminHero
          eyebrow="Inventory design"
          title="Ticket types"
          description={`Configure zones, sale windows, pricing, and limits for ${concert.title}.`}
        />
      </div>

      <TicketTypesManager concert={concert} />
    </div>
  );
}
