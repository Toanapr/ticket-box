import Link from "next/link";
import { notFound } from "next/navigation";
import { TicketTypesManager } from "@/components/ticket-types-manager";
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
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/concerts"
          className="text-sm font-medium text-emerald-700"
        >
          Back to concerts
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-slate-950">Ticket types</h1>
        <p className="mt-1 text-sm text-slate-600">{concert.title}</p>
      </div>

      <TicketTypesManager concert={concert} />
    </div>
  );
}
