import { describe, expect, it } from "vitest";
import { getPaymentStatusDisplay } from "./payment-status-display";

describe("payment status display", () => {
  it("keeps pending payment from implying ticket issuance", () => {
    const display = getPaymentStatusDisplay({ status: "PENDING_PAYMENT", ticketId: undefined });

    expect(display.canShowTicketLink).toBe(false);
    expect(display.message).toContain("Chua phat hanh ve");
    expect(display.shouldPoll).toBe(true);
  });

  it("does not offer retry-new-payment wording for reconciliation", () => {
    const display = getPaymentStatusDisplay({ status: "PAYMENT_PENDING_RECONCILIATION", ticketId: undefined });

    expect(display.canShowTicketLink).toBe(false);
    expect(display.message).toContain("Khong tao giao dich moi");
    expect(display.shouldPoll).toBe(true);
  });

  it("only shows a ticket link when backend issued a ticket id", () => {
    expect(getPaymentStatusDisplay({ status: "PAID", ticketId: "ticket-1" }).canShowTicketLink).toBe(false);
    expect(getPaymentStatusDisplay({ status: "TICKET_ISSUED", ticketId: undefined }).canShowTicketLink).toBe(false);
    expect(getPaymentStatusDisplay({ status: "TICKET_ISSUED", ticketId: "ticket-1" }).canShowTicketLink).toBe(true);
  });
});
