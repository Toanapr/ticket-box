"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cancelConcert, ConcertOperations } from "@/lib/api";
import {
  AdminButton,
  AdminNotice,
  AdminPanel,
  AdminPanelTitle,
  inputClassName,
} from "./admin-ui";

export function ConcertCancellationManager({
  operations,
}: {
  operations: ConcertOperations;
}): React.ReactElement {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const preview = operations.cancellationPreview;
  const isCanceled = operations.concert.status === "canceled";

  async function handleCancel() {
    const confirmed = window.confirm(
      `Hủy sự kiện "${operations.concert.title}" và đưa các đơn hàng bị ảnh hưởng vào quy trình hoàn tiền?`,
    );

    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await cancelConcert(operations.concert.id, reason);
      setSuccess(
        result.cancellation.alreadyCanceled
          ? "Sự kiện đã được hủy trước đó."
          : "Đã hủy sự kiện. Hàng đợi hoàn tiền và trạng thái thu hồi vé đã được cập nhật.",
      );
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Không thể thực hiện hủy sự kiện lúc này.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminPanel className="space-y-5">
      <AdminPanelTitle
        title="Hủy sự kiện & Kích hoạt quy trình hoàn tiền"
        description="Quy trình này sẽ dừng việc bán vé công khai, hủy các lượt giữ chỗ chưa thanh toán, chuyển các đơn hàng đã thanh toán sang hàng đợi hoàn tiền và thu hồi toàn bộ vé đã phát hành."
      />

      {isCanceled ? (
        <AdminNotice tone="neutral">
          Sự kiện này đã bị hủy. Hàng đợi hoàn tiền bên dưới thể hiện trạng thái vận hành hiện tại.
        </AdminNotice>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <AdminNotice tone="neutral">
          Giữ chỗ đang hoạt động sẽ hết hạn:{" "}
          <strong>{preview.activeReservationsToExpire}</strong>
        </AdminNotice>
        <AdminNotice tone="neutral">
          Đơn hàng chuyển sang hàng đợi hoàn tiền:{" "}
          <strong>{preview.ordersToMarkRefundRequired}</strong>
        </AdminNotice>
        <AdminNotice tone="neutral">
          Đơn hàng chờ thanh toán sẽ hết hạn:{" "}
          <strong>{preview.pendingOrdersToExpire}</strong>
        </AdminNotice>
        <AdminNotice tone="neutral">
          Vé đã phát hành sẽ bị thu hồi:{" "}
          <strong>{preview.issuedTicketsToRevoke}</strong>
        </AdminNotice>
      </div>

      <label className="block text-sm font-black text-ticket-obsidian">
        Lý do hủy sự kiện (Nội bộ)
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className={`${inputClassName} min-h-28 py-3`}
          placeholder="Lý do hủy sự kiện (không bắt buộc, ví dụ: rút nhà tài trợ hoặc sự cố địa điểm)."
          disabled={isCanceled || isSubmitting}
        />
      </label>

      {success ? <AdminNotice tone="success">{success}</AdminNotice> : null}
      {error ? <AdminNotice tone="error">{error}</AdminNotice> : null}

      <AdminButton
        type="button"
        variant="danger"
        onClick={handleCancel}
        disabled={isCanceled || isSubmitting}
      >
        {isSubmitting ? "Đang xử lý..." : "Hủy sự kiện"}
      </AdminButton>
    </AdminPanel>
  );
}
