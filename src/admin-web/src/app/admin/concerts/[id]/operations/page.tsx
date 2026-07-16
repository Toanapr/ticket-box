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
        <AdminBackLink href="/admin/dashboard">Quay lại bảng điều khiển</AdminBackLink>
        <AdminHero
          eyebrow="Vận hành sự kiện"
          title={operations.concert.title}
          description="Xem xét tình trạng bán vé trực tiếp, rủi ro hoàn tiền và tác động hủy trước khi xác nhận quy trình."
        />
      </div>

      <AdminMetricsGrid>
        <AdminMetricCard
          label="Trạng thái sự kiện"
          value={<AdminStatusBadge status={operations.concert.status} />}
          hint={formatDateTime(operations.concert.startAt)}
        />
        <AdminMetricCard
          label="Tổng doanh thu"
          value={`${formatCurrency(operations.summary.revenue.gross)} VND`}
          hint={`${operations.summary.orders.issued} đơn hàng đã xuất vé`}
        />
        <AdminMetricCard
          label="Rủi ro hoàn tiền"
          value={`${formatCurrency(operations.summary.revenue.refundExposure)} VND`}
          hint={`${operations.summary.orders.refundRequired} đơn hàng trong hàng đợi hoàn tiền`}
        />
        <AdminMetricCard
          label="Lưu lượng vé"
          value={`${operations.summary.inventory.sold} / ${operations.summary.inventory.available}`}
          hint="Đã bán so với còn trống"
        />
      </AdminMetricsGrid>

      <ConcertCancellationManager operations={operations} />

      <AdminDataTable>
        <AdminTable minWidthClassName="min-w-[1100px]">
          <AdminTableHead>
            <tr>
              <th className="px-6 py-4">Hạng vé</th>
              <th className="px-6 py-4">Mã khu vực</th>
              <th className="px-6 py-4">Giá vé</th>
              <th className="px-6 py-4">Tổng vé (Sức chứa)</th>
              <th className="px-6 py-4">Đã bán</th>
              <th className="px-6 py-4">Giữ chỗ</th>
              <th className="px-6 py-4">Còn trống</th>
              <th className="px-6 py-4">Giới hạn mỗi user</th>
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
              <th className="px-6 py-4">Đơn hàng</th>
              <th className="px-6 py-4">Khách mua</th>
              <th className="px-6 py-4">Tổng tiền</th>
              <th className="px-6 py-4">Cổng thanh toán</th>
              <th className="px-6 py-4">Số vé</th>
              <th className="px-6 py-4">Ngày tạo</th>
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
                  {order.buyerFullName ?? "Khách hàng không rõ"}
                  <br />
                  {order.buyerEmail ?? "Không có email"}
                  <br />
                  {order.buyerPhone ?? "Không có SĐT"}
                </td>
                <td className="px-6 py-5 text-sm font-black text-ticket-obsidian">
                  {formatCurrency(order.totalAmount)} VND
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {order.paymentProvider ?? "-"}
                </td>
                <td className="px-6 py-5 text-sm leading-6 text-slate-700">
                  {order.issuedTicketCount} đã phát hành
                  <br />
                  {order.revokedTicketCount} đã thu hồi
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
            Hiện không có đơn hàng nào chờ xử lý hoàn tiền.
          </AdminEmptyState>
        ) : null}
      </AdminDataTable>
    </div>
  );
}
