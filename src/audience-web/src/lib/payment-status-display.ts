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
  displayLabel: string;
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
  const retryAfterSeconds =
    hint?.paymentRetryAfterSeconds ??
    order.paymentIntent?.retryAfterSeconds ??
    null;
  const retryAfterLabel =
    typeof retryAfterSeconds === "number" && retryAfterSeconds > 0
      ? formatRetryAfterLabel(retryAfterSeconds)
      : undefined;

  return {
    ...base,
    statusLabel,
    displayLabel: base.label,
    canShowTicketLink:
      order.status === "TICKET_ISSUED" && Boolean(order.ticketId),
    shouldPoll: base.pollMode !== "stopped",
    action: getPaymentAction(
      statusLabel,
      order.paymentIntent?.checkoutUrl ?? null,
      retryAfterLabel,
    ),
    returnNotice: hint?.paymentReturn
      ? "Bạn vừa quay lại từ cổng thanh toán. Trạng thái đơn hàng đang được cập nhật."
      : undefined,
    retryAfterLabel,
  };
}

type PaymentStatusDisplayBase = Omit<
  PaymentStatusDisplay,
  | "statusLabel"
  | "displayLabel"
  | "canShowTicketLink"
  | "shouldPoll"
  | "action"
  | "returnNotice"
  | "retryAfterLabel"
> & { label: string };

const displayByStatus: Record<OrderStatus, PaymentStatusDisplayBase> = {
  PENDING_PAYMENT: {
    label: "Chờ thanh toán",
    title: "Đang chờ xác nhận thanh toán",
    message:
      "Đơn hàng chưa hoàn tất. Bạn có thể tiếp tục thanh toán bằng nút bên dưới.",
    tone: "amber",
    pollMode: "fast",
  },
  PAYMENT_DEGRADED: {
    label: "Tạm gián đoạn",
    title: "Cổng thanh toán đang gián đoạn",
    message:
      "Cổng thanh toán đang không ổn định. Đơn của bạn chưa được xem là thành công; vui lòng chờ trạng thái mới.",
    tone: "amber",
    pollMode: "slow",
  },
  PAYMENT_PENDING_RECONCILIATION: {
    label: "Đang kiểm tra",
    title: "Đang kiểm tra kết quả thanh toán",
    message:
      "Chúng tôi chưa nhận được kết quả cuối cùng từ cổng thanh toán. Nếu bạn chưa hoàn tất thanh toán, hãy mở lại đúng giao dịch này.",
    tone: "slate",
    pollMode: "slow",
  },
  PAID: {
    label: "Đã thanh toán",
    title: "Đã ghi nhận thanh toán",
    message:
      "Thanh toán đã được ghi nhận. E-ticket sẽ hiển thị khi hệ thống phát hành vé.",
    tone: "green",
    pollMode: "slow",
  },
  PAYMENT_FAILED: {
    label: "Thanh toán thất bại",
    title: "Thanh toán thất bại",
    message:
      "Giao dịch thanh toán thất bại. Vui lòng kiểm tra lại đơn hàng hoặc thử lại nếu còn thời gian giữ vé.",
    tone: "red",
    pollMode: "stopped",
  },
  PAYMENT_EXPIRED: {
    label: "Hết hạn",
    title: "Thanh toán đã hết hạn",
    message: "Phiên thanh toán hết hạn. Vé chưa được phát hành.",
    tone: "red",
    pollMode: "stopped",
  },
  EXPIRED: {
    label: "Hết hạn",
    title: "Đơn đã hết hạn",
    message: "Phiên giữ vé hoặc thanh toán hết hạn. Vé chưa được phát hành.",
    tone: "red",
    pollMode: "stopped",
  },
  TICKET_ISSUED: {
    label: "Đã có vé",
    title: "Đã xuất e-ticket",
    message: "E-ticket đã được phát hành. Bạn có thể mở QR để vào cổng.",
    tone: "green",
    pollMode: "stopped",
  },
};

function deriveStatusLabel(
  status: OrderStatus,
  hint: PaymentStatusHint | undefined,
): OrderStatus {
  if (status !== "PENDING_PAYMENT") return status;
  if (hint?.paymentStatus === "pending_reconciliation")
    return "PAYMENT_PENDING_RECONCILIATION";
  if (hint?.paymentDegraded) return "PAYMENT_DEGRADED";
  return status;
}

function getPaymentAction(
  status: OrderStatus,
  checkoutUrl: string | null,
  retryAfterLabel: string | undefined,
): PaymentAction {
  if (status === "TICKET_ISSUED") {
    return {
      kind: "none",
      description:
        "E-ticket đã được phát hành. Không cần mở thêm cổng thanh toán.",
    };
  }
  if (status === "PENDING_PAYMENT" && checkoutUrl) {
    return {
      kind: "open-checkout",
      url: checkoutUrl,
      label: "Tiếp tục thanh toán",
      description: "Mở lại cổng thanh toán cho đơn hàng này.",
    };
  }
  if (status === "PENDING_PAYMENT") {
    return {
      kind: "wait",
      label: "Đang chờ liên kết thanh toán",
      description:
        "Trang này sẽ tự cập nhật cho đến khi có liên kết thanh toán hoặc trạng thái mới.",
    };
  }
  if (status === "PAYMENT_DEGRADED") {
    return {
      kind: "wait",
      label: retryAfterLabel
        ? `Thử lại sau ${retryAfterLabel}`
        : "Cổng thanh toán tạm thời gián đoạn",
      description:
        "Cổng thanh toán đang bận. Vui lòng chờ hệ thống mở lại thao tác thanh toán.",
    };
  }
  if (status === "PAYMENT_PENDING_RECONCILIATION") {
    if (checkoutUrl) {
      return {
        kind: "open-checkout",
        url: checkoutUrl,
        label: "Mở lại trang thanh toán",
        description:
          "Mở lại giao dịch thanh toán hiện tại, không tạo giao dịch mới.",
      };
    }
    return {
      kind: "wait",
      label: "Đang kiểm tra thanh toán",
      description:
        "Cổng thanh toán chưa trả kết quả cuối cùng. Nếu bạn đã thanh toán, vui lòng chờ hệ thống cập nhật; nếu chưa thanh toán, hãy quay lại sau ít phút.",
    };
  }
  if (status === "PAID") {
    return {
      kind: "wait",
      label: "Đã thanh toán, chờ phát hành vé",
      description:
        "Thanh toán đã được ghi nhận. Trang này sẽ tiếp tục kiểm tra cho đến khi e-ticket được phát hành.",
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
  return remainingSeconds > 0
    ? `${minutes}m ${remainingSeconds}s`
    : `${minutes}m`;
}
