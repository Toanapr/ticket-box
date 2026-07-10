import { notFound } from "next/navigation";
import { ConcertCancellationManager } from "@/components/concert-cancellation-manager";
import {
  AdminBackLink,
  AdminDataTable,
  AdminEmptyState,
  AdminHero,
  AdminMetricCard,
  AdminMetricsGrid,
  AdminStatusBadge,
  AdminTable,
  AdminTableBody,
  AdminTableHead,
} from "@/components/admin-ui";
import { ConcertOperations } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { serverApiFetch } from "@/lib/server-api";

type OperationsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ConcertOperationsPage({
  params,
}: OperationsPageProps) {
  const { id } = await params;
  const operations = await serverApiFetch<ConcertOperations>(
    `/admin/concerts/${id}/operations`,
  ).catch(() => null);

  if (!operations) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <AdminBackLink href="/admin/dashboard">Back to dashboard</AdminBackLink>
        <AdminHero
          eyebrow="Concert operations"
          title={operations.concert.title}
          description="Review live sales state, refund exposure, and the full cancellation impact before you commit the workflow."
        />
      </div>

      <AdminMetricsGrid>
        <AdminMetricCard
          label="Concert status"
          value={<AdminStatusBadge status={operations.concert.status} />}
          hint={formatDateTime(operations.concert.startAt)}
        />
        <AdminMetricCard
          label="Gross revenue"
          value={`${formatCurrency(operations.summary.revenue.gross)} VND`}
          hint={`${operations.summary.orders.issued} issued orders`}
        />
        <AdminMetricCard
          label="Refund exposure"
          value={`${formatCurrency(operations.summary.revenue.refundExposure)} VND`}
          hint={`${operations.summary.orders.refundRequired} orders already in refund queue`}
        />
        <AdminMetricCard
          label="Ticket movement"
          value={`${operations.summary.inventory.sold} / ${operations.summary.inventory.available}`}
          hint="Sold versus remaining available"
        />
      </AdminMetricsGrid>

      <ConcertCancellationManager operations={operations} />

      <AdminDataTable>
        <AdminTable minWidthClassName="min-w-[1100px]">
          <AdminTableHead>
            <tr>
              <th className="px-6 py-4">Ticket type</th>
              <th className="px-6 py-4">Zone</th>
              <th className="px-6 py-4">Price</th>
              <th className="px-6 py-4">Capacity</th>
              <th className="px-6 py-4">Sold</th>
              <th className="px-6 py-4">Reserved</th>
              <th className="px-6 py-4">Available</th>
              <th className="px-6 py-4">Per-user limit</th>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {operations.ticketTypeBreakdown.map((ticketType) => (
              <tr key={ticketType.ticketTypeId}>
                <td className="px-6 py-5 font-display text-lg font-black tracking-tight text-ticket-obsidian">
                  {ticketType.name}
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {ticketType.zoneCode}
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {formatCurrency(ticketType.price)} VND
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {ticketType.capacity}
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {ticketType.soldCount}
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {ticketType.reservedCount}
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {ticketType.availableCount}
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {ticketType.perUserLimit}
                </td>
              </tr>
            ))}
          </AdminTableBody>
        </AdminTable>
      </AdminDataTable>

      <AdminDataTable>
        <AdminTable minWidthClassName="min-w-[1200px]">
          <AdminTableHead>
            <tr>
              <th className="px-6 py-4">Order</th>
              <th className="px-6 py-4">Buyer</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Payment</th>
              <th className="px-6 py-4">Tickets</th>
              <th className="px-6 py-4">Created</th>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {operations.refundQueue.map((order) => (
              <tr key={order.orderId} className="align-top">
                <td className="px-6 py-5">
                  <p className="font-mono text-xs font-bold text-slate-600">
                    {order.orderId}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <AdminStatusBadge status={order.orderStatus} />
                    {order.paymentStatus ? (
                      <AdminStatusBadge status={order.paymentStatus} />
                    ) : null}
                  </div>
                </td>
                <td className="px-6 py-5 text-sm leading-6 text-slate-700">
                  {order.buyerFullName ?? "Unknown buyer"}
                  <br />
                  {order.buyerEmail ?? "No email"}
                  <br />
                  {order.buyerPhone ?? "No phone"}
                </td>
                <td className="px-6 py-5 text-sm font-black text-ticket-obsidian">
                  {formatCurrency(order.totalAmount)} VND
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {order.paymentProvider ?? "-"}
                </td>
                <td className="px-6 py-5 text-sm leading-6 text-slate-700">
                  {order.issuedTicketCount} issued
                  <br />
                  {order.revokedTicketCount} revoked
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {formatDateTime(order.createdAt)}
                </td>
              </tr>
            ))}
          </AdminTableBody>
        </AdminTable>

        {operations.refundQueue.length === 0 ? (
          <AdminEmptyState>
            No orders are currently waiting for refund handling.
          </AdminEmptyState>
        ) : null}
      </AdminDataTable>
    </div>
  );
}
