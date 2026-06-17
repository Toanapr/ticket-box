import Link from "next/link";
import { notFound } from "next/navigation";
import { TicketTypeForm } from "@/components/ticket-type-form";
import { apiFetch, Concert } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/format";

type TicketTypesPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TicketTypesPage({ params }: TicketTypesPageProps) {
  const { id } = await params;
  const concert = await apiFetch<Concert>(`/concerts/${id}`).catch(() => null);

  if (!concert) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/concerts" className="text-sm font-medium text-emerald-700">
          Back to concerts
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-slate-950">Ticket types</h1>
        <p className="mt-1 text-sm text-slate-600">{concert.title}</p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-950">Create ticket type</h2>
        <TicketTypeForm concertId={concert.id} />
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Zone</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Capacity</th>
              <th className="px-4 py-3">Sale start</th>
              <th className="px-4 py-3">Sale end</th>
              <th className="px-4 py-3">Per-user limit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {concert.ticketTypes.map((ticketType) => (
              <tr key={ticketType.id}>
                <td className="px-4 py-3 font-semibold text-slate-950">
                  {ticketType.zoneCode}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {formatCurrency(ticketType.price)} VND
                </td>
                <td className="px-4 py-3 text-slate-700">{ticketType.capacity}</td>
                <td className="px-4 py-3 text-slate-700">
                  {formatDateTime(ticketType.saleStartsAt)}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {formatDateTime(ticketType.saleEndsAt)}
                </td>
                <td className="px-4 py-3 text-slate-700">{ticketType.perUserLimit}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {concert.ticketTypes.length === 0 ? (
          <div className="border-t border-slate-200 px-4 py-10 text-center text-sm text-slate-600">
            No ticket types configured yet.
          </div>
        ) : null}
      </section>
    </div>
  );
}
