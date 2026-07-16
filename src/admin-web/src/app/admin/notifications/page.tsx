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
        eyebrow="Theo dõi gửi tin"
        title="Thông báo hệ thống"
        description="Xem lịch sử gửi các thông báo (như Vé đã phát hành) qua các kênh trong ứng dụng và email."
      />

      <AdminDataTable>
        <AdminTable minWidthClassName="min-w-[980px]">
          <AdminTableHead>
            <tr>
              <th className="px-6 py-4">Thời gian tạo</th>
              <th className="px-6 py-4">Sự kiện tin</th>
              <th className="px-6 py-4">Kênh</th>
              <th className="px-6 py-4">Trạng thái</th>
              <th className="px-6 py-4">Đơn hàng</th>
              <th className="px-6 py-4">Số vé</th>
              <th className="px-6 py-4">Nội dung / Lỗi</th>
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
          <AdminEmptyState>Chưa có bản ghi thông báo nào.</AdminEmptyState>
        ) : null}
      </AdminDataTable>
    </div>
  );
}
