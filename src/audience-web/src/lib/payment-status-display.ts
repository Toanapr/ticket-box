import type { OrderRecord, OrderStatus } from "./types";

export type PaymentPollMode = "fast" | "slow" | "stopped";

export type PaymentAction =
  | { kind: "open-checkout"; url: string; label: string; description: string }
  | { kind: "wait"; label: string; description: string }
  | { kind: "none"; description: string };

export interface PaymentStatusHint {
  paymentDegraded?: boolean;
  paymentStatus?: "pending_reconciliation";
  paymentRetryAfterSeconds?: number | null;
  paymentReturn?: boolean;
}

export interface PaymentStatusDisplay {
  statusLabel: OrderStatus;
  title: string;
  message: string;
  tone: "green" | "amber" | "red" | "slate";
  canShowTicketLink: boolean;
  pollMode: PaymentPollMode;
  shouldPoll: boolean;
  action: PaymentAction;
  returnNotice?: string;
  retryAfterLabel?: string;
}

export function getPaymentStatusDisplay(
  order: Pick<OrderRecord, "status" | "ticketId" | "paymentIntent">,
  hint?: PaymentStatusHint,
): PaymentStatusDisplay {
  const statusLabel = deriveStatusLabel(order.status, hint);
  const base = displayByStatus[statusLabel] ?? displayByStatus.PENDING_PAYMENT;
  const retryAfterSeconds = hint?.paymentRetryAfterSeconds ?? order.paymentIntent?.retryAfterSeconds ?? null;
  const retryAfterLabel = typeof retryAfterSeconds === "number" && retryAfterSeconds > 0 ? formatRetryAfterLabel(retryAfterSeconds) : undefined;

  return {
    ...base,
    statusLabel,
    canShowTicketLink: order.status === "TICKET_ISSUED" && Boolean(order.ticketId),
    shouldPoll: base.pollMode !== "stopped",
    action: getPaymentAction(statusLabel, order.paymentIntent?.checkoutUrl ?? null, retryAfterLabel),
    returnNotice: hint?.paymentReturn ? "Trình duyệt vừa quay lại từ cổng thanh toán. Trang này đang tải lại trạng thái mới từ backend." : undefined,
    retryAfterLabel,
  };
}

const displayByStatus: Record<
  OrderStatus,
  Omit<PaymentStatusDisplay, "statusLabel" | "canShowTicketLink" | "shouldPoll" | "action" | "returnNotice" | "retryAfterLabel">
> = {
  PENDING_PAYMENT: {
    title: "Đang chờ xác nhận thanh toán",
    message: "Hệ thống đang xác nhận với cổng thanh toán. Chưa phát hành vé cho đến khi backend cập nhật trạng thái.",
    tone: "amber",
    pollMode: "fast",
  },
  PAYMENT_DEGRADED: {
    title: "Cổng thanh toán đang gián đoạn",
    message: "Backend ghi nhận cổng thanh toán không ổn định. Đơn của bạn chưa được xem là thành công; vui lòng chờ trạng thái mới.",
    tone: "amber",
    pollMode: "slow",
  },
  PAYMENT_PENDING_RECONCILIATION: {
    title: "Đang đợi đối soát thanh toán",
    message: "Hệ thống đang đối soát kết quả với nhà cung cấp. Không tạo giao dịch mới nếu backend chưa yêu cầu.",
    tone: "slate",
    pollMode: "slow",
  },
  PAID: {
    title: "Đã ghi nhận thanh toán",
    message: "Thanh toán đã được backend ghi nhận. E-ticket chỉ hiển thị khi backend phát hành vé.",
    tone: "green",
    pollMode: "slow",
  },
  PAYMENT_FAILED: {
    title: "Thanh toán thất bại",
    message: "Backend báo giao dịch thanh toán thất bại. Vui lòng làm theo hướng dẫn retry nếu backend cung cấp.",
    tone: "red",
    pollMode: "stopped",
  },
  PAYMENT_EXPIRED: {
    title: "Thanh toán đã hết hạn",
    message: "Phiên thanh toán hết hạn. Vé chưa được phát hành.",
    tone: "red",
    pollMode: "stopped",
  },
  EXPIRED: {
    title: "Đơn đã hết hạn",
    message: "Phiên giữ vé hoặc thanh toán hết hạn. Vé chưa được phát hành.",
    tone: "red",
    pollMode: "stopped",
  },
  TICKET_ISSUED: {
    title: "Đã xuất e-ticket",
    message: "Backend đã phát hành e-ticket. Bạn có thể mở QR để vào cổng.",
    tone: "green",
    pollMode: "stopped",
  },
};

function deriveStatusLabel(status: OrderStatus, hint: PaymentStatusHint | undefined): OrderStatus {
  if (status !== "PENDING_PAYMENT") return status;
  if (hint?.paymentStatus === "pending_reconciliation") return "PAYMENT_PENDING_RECONCILIATION";
  if (hint?.paymentDegraded) return "PAYMENT_DEGRADED";
  return status;
}

function getPaymentAction(status: OrderStatus, checkoutUrl: string | null, retryAfterLabel: string | undefined): PaymentAction {
  if (status === "TICKET_ISSUED") {
    return { kind: "none", description: "E-ticket đã được phát hành. Không cần mở thêm cổng thanh toán." };
  }
  if (status === "PENDING_PAYMENT" && checkoutUrl) {
    return {
      kind: "open-checkout",
      url: checkoutUrl,
      label: "Mở cổng thanh toán",
      description: "Chỉ mở đường dẫn do backend trả về cho payment intent hiện tại.",
    };
  }
  if (status === "PENDING_PAYMENT") {
    return {
      kind: "wait",
      label: "Đang chờ liên kết thanh toán",
      description: "Trang này sẽ tiếp tục tải lại cho đến khi backend trả về đường dẫn thanh toán hoặc trạng thái mới.",
    };
  }
  if (status === "PAYMENT_DEGRADED") {
    return {
      kind: "wait",
      label: retryAfterLabel ? `Thử lại sau ${retryAfterLabel}` : "Cổng thanh toán tạm thời gián đoạn",
      description: "Không tạo payment intent mới trong lúc backend đang khóa retry. Chờ trạng thái mới hoặc Retry-After hết hạn.",
    };
  }
  if (status === "PAYMENT_PENDING_RECONCILIATION") {
    return {
      kind: "wait",
      label: "Đang đợi đối soát",
      description: "Kết quả từ nhà cung cấp đang mơ hồ. Không tạo giao dịch thanh toán mới cho cùng đơn này.",
    };
  }
  if (status === "PAID") {
    return {
      kind: "wait",
      label: "Đã thanh toán, chờ phát hành vé",
      description: "Backend đã ghi nhận thanh toán. Trang này sẽ tiếp tục kiểm tra cho đến khi e-ticket được phát hành.",
    };
  }
  return {
    kind: "none",
    description: "Trạng thái hiện tại không mở thêm cổng thanh toán mới.",
  };
}

function formatRetryAfterLabel(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}
