import {
  AdminDataTable,
  AdminEmptyState,
  AdminHero,
  AdminLinkButton,
  AdminMetricCard,
  AdminMetricsGrid,
  AdminStatusBadge,
  AdminTable,
  AdminTableBody,
  AdminTableHead,
} from "@/components/admin-ui";
import { AdminDashboard } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { serverApiFetch } from "@/lib/server-api";

async function getDashboard() {
  return serverApiFetch<AdminDashboard>("/admin/dashboard").catch(() => null);
}

export default async function DashboardPage() {
  const dashboard = await getDashboard();

  return (
    <div className="space-y-8">
      <AdminHero
        eyebrow="Revenue and operations"
        title="Admin dashboard"
        description="Track captured sales, refund exposure, ticket movement, and the concerts that need operator attention."
      />

      <AdminMetricsGrid>
        <AdminMetricCard
          label="Gross revenue"
          value={`${formatCurrency(dashboard?.totals.grossRevenue ?? 0)} VND`}
          hint={`${dashboard?.totals.refundRequiredOrders ?? 0} refund-required orders`}
        />
        <AdminMetricCard
          label="Refund exposure"
          value={`${formatCurrency(dashboard?.totals.refundExposure ?? 0)} VND`}
          hint="Orders already flagged for refund handling"
        />
        <AdminMetricCard
          label="Tickets issued"
          value={dashboard?.totals.ticketsIssued ?? 0}
          hint={`${dashboard?.totals.ticketsReserved ?? 0} still reserved, ${dashboard?.totals.ticketsAvailable ?? 0} available`}
        />
        <AdminMetricCard
          label="Active concerts"
          value={dashboard?.totals.publishedConcerts ?? 0}
          hint={`${dashboard?.totals.canceledConcerts ?? 0} canceled`}
        />
      </AdminMetricsGrid>

      <AdminDataTable>
        <AdminTable minWidthClassName="min-w-[1200px]">
          <AdminTableHead>
            <tr>
              <th className="px-6 py-4">Concert</th>
              <th className="px-6 py-4">Start</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Revenue</th>
              <th className="px-6 py-4">Refund exposure</th>
              <th className="px-6 py-4">Sold / Reserved / Available</th>
              <th className="px-6 py-4">Orders</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {(dashboard?.concerts ?? []).map((concert) => (
              <tr key={concert.concertId} className="align-top">
                <td className="px-6 py-5">
                  <div>
                    <p className="font-display text-xl font-black tracking-tight text-ticket-obsidian">
                      {concert.title}
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                      {concert.artistName}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      {concert.venue}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {formatDateTime(concert.startAt)}
                </td>
                <td className="px-6 py-5">
                  <AdminStatusBadge status={concert.status} />
                </td>
                <td className="px-6 py-5 text-sm font-black text-ticket-obsidian">
                  {formatCurrency(concert.revenue.gross)} VND
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-red-700">
                  {formatCurrency(concert.revenue.refundExposure)} VND
                </td>
                <td className="px-6 py-5 text-sm leading-6 text-slate-700">
                  {concert.inventory.sold} sold
                  <br />
                  {concert.inventory.reserved} reserved
                  <br />
                  {concert.inventory.available} available
                </td>
                <td className="px-6 py-5 text-sm leading-6 text-slate-700">
                  {concert.orders.total} total
                  <br />
                  {concert.orders.pendingPayment} pending
                  <br />
                  {concert.orders.refundRequired} refund queue
                </td>
                <td className="px-6 py-5">
                  <div className="flex flex-wrap gap-2">
                    <AdminLinkButton
                      href={`/admin/concerts/${concert.concertId}/operations`}
                      variant="secondary"
                    >
                      Operations
                    </AdminLinkButton>
                    <AdminLinkButton
                      href={`/admin/concerts/${concert.concertId}/edit`}
                      variant="secondary"
                    >
                      Edit
                    </AdminLinkButton>
                  </div>
                </td>
              </tr>
            ))}
          </AdminTableBody>
        </AdminTable>

        {!dashboard || dashboard.concerts.length === 0 ? (
          <AdminEmptyState>
            No dashboard data yet. Start the backend and create at least one
            concert with ticket types.
          </AdminEmptyState>
        ) : null}
      </AdminDataTable>
    </div>
  );
}
