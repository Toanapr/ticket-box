import { apiFetch, NotificationRecord } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

async function getNotifications() {
  try {
    return await apiFetch<NotificationRecord[]>("/admin/notifications");
  } catch {
    return [];
  }
}

export default async function NotificationsPage() {
  const notifications = await getNotifications();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Notifications</h1>
        <p className="mt-1 text-sm text-slate-600">
          TicketIssued records for in-app and mock email delivery.
        </p>
      </div>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[780px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ticket</th>
              <th className="px-4 py-3">Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {notifications.map((notification) => (
              <tr key={notification.id}>
                <td className="px-4 py-3 text-slate-700">
                  {formatDateTime(notification.createdAt)}
                </td>
                <td className="px-4 py-3 font-medium text-slate-950">
                  {notification.eventType}
                </td>
                <td className="px-4 py-3 text-slate-700">{notification.channel}</td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold capitalize text-slate-700">
                    {notification.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">{notification.ticketId}</td>
                <td className="px-4 py-3 text-slate-700">
                  {notification.error ?? notification.message}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {notifications.length === 0 ? (
          <div className="border-t border-slate-200 px-4 py-10 text-center text-sm text-slate-600">
            No notification records yet.
          </div>
        ) : null}
      </section>
    </div>
  );
}
