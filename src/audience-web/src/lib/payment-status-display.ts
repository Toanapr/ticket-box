import type { OrderRecord, OrderStatus } from "./types";

export interface PaymentStatusDisplay {
  title: string;
  message: string;
  tone: "green" | "amber" | "red" | "slate";
  canShowTicketLink: boolean;
  shouldPoll: boolean;
}

export function getPaymentStatusDisplay(order: Pick<OrderRecord, "status" | "ticketId">): PaymentStatusDisplay {
  const base = displayByStatus[order.status] ?? displayByStatus.PENDING_PAYMENT;
  return {
    ...base,
    canShowTicketLink: order.status === "TICKET_ISSUED" && Boolean(order.ticketId),
  };
}

const displayByStatus: Record<OrderStatus, Omit<PaymentStatusDisplay, "canShowTicketLink">> = {
  PENDING_PAYMENT: {
    title: "Dang cho xac nhan thanh toan",
    message: "He thong dang xac nhan voi cong thanh toan. Chua phat hanh ve cho den khi backend cap nhat trang thai.",
    tone: "amber",
    shouldPoll: true,
  },
  PAYMENT_DEGRADED: {
    title: "Cong thanh toan dang gian doan",
    message: "Backend ghi nhan cong thanh toan khong on dinh. Don cua ban chua duoc xem la thanh cong; vui long cho trang thai moi.",
    tone: "amber",
    shouldPoll: true,
  },
  PAYMENT_PENDING_RECONCILIATION: {
    title: "Dang doi doi soat thanh toan",
    message: "He thong dang doi soat ket qua voi nha cung cap. Khong tao giao dich moi neu backend chua yeu cau.",
    tone: "slate",
    shouldPoll: true,
  },
  PAID: {
    title: "Da ghi nhan thanh toan",
    message: "Thanh toan da duoc backend ghi nhan. E-ticket chi hien thi khi backend phat hanh ve.",
    tone: "green",
    shouldPoll: true,
  },
  PAYMENT_FAILED: {
    title: "Thanh toan that bai",
    message: "Backend bao giao dich thanh toan that bai. Vui long lam theo huong dan retry neu backend cung cap.",
    tone: "red",
    shouldPoll: false,
  },
  PAYMENT_EXPIRED: {
    title: "Thanh toan da het han",
    message: "Phien thanh toan het han. Ve chua duoc phat hanh.",
    tone: "red",
    shouldPoll: false,
  },
  EXPIRED: {
    title: "Don da het han",
    message: "Phien giu ve hoac thanh toan het han. Ve chua duoc phat hanh.",
    tone: "red",
    shouldPoll: false,
  },
  TICKET_ISSUED: {
    title: "Da xuat e-ticket",
    message: "Backend da phat hanh e-ticket. Ban co the mo QR de vao cong.",
    tone: "green",
    shouldPoll: false,
  },
};
