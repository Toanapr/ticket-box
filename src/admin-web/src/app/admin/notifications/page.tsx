import { NotificationRecord } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { serverApiFetch } from "@/lib/server-api";
import {
  AdminDataTable,
  AdminEmptyState,
  AdminHero,
  AdminStatusBadge,
  AdminTable,
  AdminTableBody,
  AdminTableHead,
} from "@/components/admin-ui";

async function getNotifications() {
  try {
    return await serverApiFetch<NotificationRecord[]>("/admin/notifications");
  } catch {
    return [];
  }
}

export default async function NotificationsPage() {
  const notifications = await getNotifications();

  return (
    <div className="space-y-8">
      <AdminHero
        eyebrow="Delivery tracking"
        title="Notifications"
        description="Review TicketIssued delivery records across in-app and mock email channels with the same visual language used across TicketBox."
      />

      <AdminDataTable>
        <AdminTable minWidthClassName="min-w-[980px]">
          <AdminTableHead>
            <tr>
              <th className="px-6 py-4">Created</th>
              <th className="px-6 py-4">Event</th>
              <th className="px-6 py-4">Channel</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Order</th>
              <th className="px-6 py-4">Tickets</th>
              <th className="px-6 py-4">Message</th>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {notifications.map((notification) => (
              <tr key={notification.id} className="align-top">
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {formatDateTime(notification.createdAt)}
                </td>
                <td className="px-6 py-5 font-display text-lg font-black tracking-tight text-ticket-obsidian">
                  {notification.eventType}
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {notification.channel}
                </td>
                <td className="px-6 py-5">
                  <AdminStatusBadge status={notification.status} />
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {notification.orderId ?? "-"}
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {notification.ticketCount ?? "-"}
                </td>
                <td className="px-6 py-5 text-sm leading-6 text-slate-700">
                  {notification.error ?? notification.message}
                </td>
              </tr>
            ))}
          </AdminTableBody>
        </AdminTable>

        {notifications.length === 0 ? (
          <AdminEmptyState>No notification records yet.</AdminEmptyState>
        ) : null}
      </AdminDataTable>
    </div>
  );
}
