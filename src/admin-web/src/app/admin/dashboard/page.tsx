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
        eyebrow="Doanh thu và vận hành"
        title="Bảng điều khiển quản trị"
        description="Theo dõi doanh thu bán vé, số tiền hoàn tiền, lưu lượng vé và các sự kiện cần chú ý."
      />

      <AdminMetricsGrid>
        <AdminMetricCard
          label="Tổng doanh thu"
          value={`${formatCurrency(dashboard?.totals.grossRevenue ?? 0)} VND`}
          hint={`${dashboard?.totals.refundRequiredOrders ?? 0} đơn chờ hoàn tiền`}
        />
        <AdminMetricCard
          label="Rủi ro hoàn tiền"
          value={`${formatCurrency(dashboard?.totals.refundExposure ?? 0)} VND`}
          hint="Các đơn hàng đã được gắn cờ để xử lý hoàn tiền"
        />
        <AdminMetricCard
          label="Vé đã phát hành"
          value={dashboard?.totals.ticketsIssued ?? 0}
          hint={`${dashboard?.totals.ticketsReserved ?? 0} đang giữ chỗ, ${dashboard?.totals.ticketsAvailable ?? 0} còn trống`}
        />
        <AdminMetricCard
          label="Sự kiện hoạt động"
          value={dashboard?.totals.publishedConcerts ?? 0}
          hint={`${dashboard?.totals.canceledConcerts ?? 0} đã hủy`}
        />
      </AdminMetricsGrid>

      <AdminDataTable>
        <AdminTable minWidthClassName="min-w-[1200px]">
          <AdminTableHead>
            <tr>
              <th className="px-6 py-4">Sự kiện</th>
              <th className="px-6 py-4">Bắt đầu</th>
              <th className="px-6 py-4">Trạng thái</th>
              <th className="px-6 py-4">Doanh thu</th>
              <th className="px-6 py-4">Rủi ro hoàn tiền</th>
              <th className="px-6 py-4">Đã bán / Giữ / Trống</th>
              <th className="px-6 py-4">Đơn hàng</th>
              <th className="px-6 py-4">Thao tác</th>
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
                  {concert.inventory.sold} đã bán
                  <br />
                  {concert.inventory.reserved} đang giữ
                  <br />
                  {concert.inventory.available} còn trống
                </td>
                <td className="px-6 py-5 text-sm leading-6 text-slate-700">
                  {concert.orders.total} tổng cộng
                  <br />
                  {concert.orders.pendingPayment} chờ thanh toán
                  <br />
                  {concert.orders.refundRequired} hàng đợi hoàn tiền
                </td>
                <td className="px-6 py-5">
                  <div className="flex flex-wrap gap-2">
                    <AdminLinkButton
                      href={`/admin/concerts/${concert.concertId}/operations`}
                      variant="secondary"
                    >
                      Vận hành
                    </AdminLinkButton>
                    <AdminLinkButton
                      href={`/admin/concerts/${concert.concertId}/edit`}
                      variant="secondary"
                    >
                      Sửa
                    </AdminLinkButton>
                  </div>
                </td>
              </tr>
            ))}
          </AdminTableBody>
        </AdminTable>

        {!dashboard || dashboard.concerts.length === 0 ? (
          <AdminEmptyState>
            Chưa có dữ liệu bảng điều khiển. Vui lòng khởi chạy backend và tạo ít nhất một sự kiện có loại vé.
          </AdminEmptyState>
        ) : null}
      </AdminDataTable>
    </div>
  );
}
