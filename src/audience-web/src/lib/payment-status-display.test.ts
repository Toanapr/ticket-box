import { describe, expect, it } from "vitest";
import { getPaymentStatusDisplay } from "./payment-status-display";

describe("payment status display", () => {
  it("keeps pending payment from implying ticket issuance", () => {
    const display = getPaymentStatusDisplay({ status: "PENDING_PAYMENT", ticketId: undefined, paymentIntent: {} });

    expect(display.canShowTicketLink).toBe(false);
    expect(display.message).toContain("Chưa phát hành vé");
    expect(display.pollMode).toBe("fast");
    expect(display.shouldPoll).toBe(true);
    expect(display.action.kind).toBe("wait");
  });

  it("shows backend checkout action when checkoutUrl exists", () => {
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
    expect(display.action.description).toContain("Retry-After");
    expect(display.retryAfterLabel).toBe("30s");
  });

  it("does not offer retry-new-payment wording for reconciliation", () => {
    const display = getPaymentStatusDisplay(
      { status: "PAYMENT_PENDING_RECONCILIATION", ticketId: undefined, paymentIntent: {} },
      { paymentReturn: true },
    );

    expect(display.canShowTicketLink).toBe(false);
    expect(display.message).toContain("Không tạo giao dịch mới");
    expect(display.pollMode).toBe("slow");
    expect(display.shouldPoll).toBe(true);
    expect(display.returnNotice).toContain("quay lại");
  });

  it("only shows a ticket link when backend issued a ticket id", () => {
    expect(getPaymentStatusDisplay({ status: "PAID", ticketId: "ticket-1", paymentIntent: {} }).canShowTicketLink).toBe(false);
    expect(getPaymentStatusDisplay({ status: "TICKET_ISSUED", ticketId: undefined, paymentIntent: {} }).canShowTicketLink).toBe(false);
    expect(getPaymentStatusDisplay({ status: "TICKET_ISSUED", ticketId: "ticket-1", paymentIntent: {} }).canShowTicketLink).toBe(true);
  });
});
