import Link from "next/link";
import { Concert } from "@/lib/api";
import { serverApiFetch } from "@/lib/server-api";
import { formatDateTime } from "@/lib/format";

async function getConcerts() {
  try {
    return await serverApiFetch<Concert[]>("/admin/concerts");
  } catch {
    return [];
  }
}

export default async function ConcertsPage() {
  const concerts = await getConcerts();

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Concerts</h1>
          <p className="mt-1 text-sm text-slate-600">
            Minimal organizer data for Phase 1 ticket sales.
          </p>
        </div>
        <Link
          href="/admin/concerts/new"
          className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
        >
          New concert
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Venue</th>
              <th className="px-4 py-3">Start time</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ticket types</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {concerts.map((concert) => (
              <tr key={concert.id}>
                <td className="px-4 py-3 font-medium text-slate-950">
                  {concert.title}
                </td>
                <td className="px-4 py-3 text-slate-700">{concert.venue}</td>
                <td className="px-4 py-3 text-slate-700">
                  {formatDateTime(concert.startAt)}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold capitalize text-slate-700">
                    {concert.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {concert.ticketTypes.length}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/concerts/${concert.id}/edit`}
                      className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/admin/concerts/${concert.id}/ticket-types`}
                      className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Ticket types
                    </Link>
                    <Link
                      href={`/admin/concerts/${concert.id}/guest-list`}
                      className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Guest list
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {concerts.length === 0 ? (
          <div className="border-t border-slate-200 px-4 py-10 text-center text-sm text-slate-600">
            No concerts found. Start the backend API, then create a concert.
          </div>
        ) : null}
      </div>
    </div>
  );
}
