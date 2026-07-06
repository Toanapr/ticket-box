import { describe, expect, it } from "vitest";
import { getPaymentStatusDisplay } from "./payment-status-display";

describe("payment status display", () => {
  it("keeps pending payment from implying ticket issuance", () => {
    const display = getPaymentStatusDisplay({
      status: "PENDING_PAYMENT",
      ticketId: undefined,
      paymentIntent: {},
    });

    expect(display.canShowTicketLink).toBe(false);
    expect(display.message).toContain("chưa hoàn tất");
    expect(display.pollMode).toBe("fast");
    expect(display.shouldPoll).toBe(true);
    expect(display.action.kind).toBe("wait");
  });

  it("shows checkout action when checkoutUrl exists", () => {
    const display = getPaymentStatusDisplay({
      status: "PENDING_PAYMENT",
      ticketId: undefined,
      paymentIntent: { checkoutUrl: "https://pay.example/intent-1" },
    });

    expect(display.action).toMatchObject({
      kind: "open-checkout",
      url: "https://pay.example/intent-1",
    });
  });

  it("uses degraded hint and slows polling while payment retry is locked", () => {
    const display = getPaymentStatusDisplay(
      { status: "PENDING_PAYMENT", ticketId: undefined, paymentIntent: {} },
      { paymentDegraded: true, paymentRetryAfterSeconds: 30 },
    );

    expect(display.statusLabel).toBe("PAYMENT_DEGRADED");
    expect(display.pollMode).toBe("slow");
    expect(display.action.kind).toBe("wait");
    expect(display.action.description).toContain("Vui lòng chờ");
    expect(display.retryAfterLabel).toBe("30s");
  });

  it("does not offer retry-new-payment wording for reconciliation", () => {
    const display = getPaymentStatusDisplay(
      {
        status: "PAYMENT_PENDING_RECONCILIATION",
        ticketId: undefined,
        paymentIntent: {},
      },
      { paymentReturn: true },
    );

    expect(display.canShowTicketLink).toBe(false);
    expect(display.displayLabel).toBe("Đang kiểm tra");
    expect(display.message).toContain("chưa nhận được kết quả cuối cùng");
    expect(display.action.description).toContain("vui lòng chờ");
    expect(display.pollMode).toBe("slow");
    expect(display.shouldPoll).toBe(true);
    expect(display.returnNotice).toContain("quay lại");
  });

  it("lets reconciliation reopen the existing checkout when checkoutUrl exists", () => {
    const display = getPaymentStatusDisplay({
      status: "PAYMENT_PENDING_RECONCILIATION",
      ticketId: undefined,
      paymentIntent: { checkoutUrl: "https://pay.example/current-intent" },
    });

    expect(display.action).toMatchObject({
      kind: "open-checkout",
      url: "https://pay.example/current-intent",
      label: "Mở lại trang thanh toán",
    });
    expect(display.action.description).toContain("không tạo giao dịch mới");
  });

  it("only shows a ticket link when a ticket id exists", () => {
    expect(
      getPaymentStatusDisplay({
        status: "PAID",
        ticketId: "ticket-1",
        paymentIntent: {},
      }).canShowTicketLink,
    ).toBe(false);
    expect(
      getPaymentStatusDisplay({
        status: "TICKET_ISSUED",
        ticketId: undefined,
        paymentIntent: {},
      }).canShowTicketLink,
    ).toBe(false);
    expect(
      getPaymentStatusDisplay({
        status: "TICKET_ISSUED",
        ticketId: "ticket-1",
        paymentIntent: {},
      }).canShowTicketLink,
    ).toBe(true);
  });
});
