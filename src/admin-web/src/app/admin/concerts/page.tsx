import { DeleteConcertButton } from "@/components/delete-concert-button";
import { Concert } from "@/lib/api";
import { serverApiFetch } from "@/lib/server-api";
import { formatDateTime } from "@/lib/format";
import {
  AdminDataTable,
  AdminEmptyState,
  AdminHero,
  AdminLinkButton,
  AdminStatusBadge,
  AdminTable,
  AdminTableBody,
  AdminTableHead,
} from "@/components/admin-ui";

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
    <div className="space-y-8">
      <AdminHero
        eyebrow="Organizer workspace"
        title="Concert operations"
        description="Manage the event catalog, monitor readiness, and keep ticketing setup aligned with the public TicketBox experience."
        action={<AdminLinkButton href="/admin/concerts/new">New concert</AdminLinkButton>}
      />

      <AdminDataTable>
        <AdminTable minWidthClassName="min-w-[980px]">
          <AdminTableHead>
            <tr>
              <th className="px-6 py-4">Title</th>
              <th className="px-6 py-4">Venue</th>
              <th className="px-6 py-4">Start time</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Ticket types</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {concerts.map((concert) => (
              <tr key={concert.id} className="align-top">
                <td className="px-6 py-5">
                  <div>
                    <p className="font-display text-xl font-black tracking-tight text-ticket-obsidian">
                      {concert.title}
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                      {concert.artistName}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {concert.venue}
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {formatDateTime(concert.startAt)}
                </td>
                <td className="px-6 py-5">
                  <AdminStatusBadge status={concert.status} />
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {concert.ticketTypes.length}
                </td>
                <td className="px-6 py-5">
                  <div className="flex flex-wrap gap-2">
                    <AdminLinkButton href={`/admin/concerts/${concert.id}/edit`} variant="secondary">
                      Edit
                    </AdminLinkButton>
                    <AdminLinkButton href={`/admin/concerts/${concert.id}/ticket-types`} variant="secondary">
                      Ticket types
                    </AdminLinkButton>
                    <AdminLinkButton href={`/admin/concerts/${concert.id}/operations`} variant="secondary">
                      Operations
                    </AdminLinkButton>
                    <AdminLinkButton href={`/admin/concerts/${concert.id}/guest-list`} variant="secondary">
                      Guest list
                    </AdminLinkButton>
                    <DeleteConcertButton
                      concertId={concert.id}
                      concertTitle={concert.title}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </AdminTableBody>
        </AdminTable>

        {concerts.length === 0 ? (
          <AdminEmptyState>
            No concerts found. Start the backend API, then create a concert.
          </AdminEmptyState>
        ) : null}
      </AdminDataTable>
    </div>
  );
}
