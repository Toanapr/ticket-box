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
      `Cancel "${operations.concert.title}" and move impacted orders into the refund workflow?`,
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
          ? "Concert was already canceled."
          : "Concert canceled. Refund queue and ticket revocation have been updated.",
      );
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to cancel concert right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminPanel className="space-y-5">
      <AdminPanelTitle
        title="Cancel Concert And Start Refund Workflow"
        description="This workflow cancels public sales, expires active reservations, marks affected paid orders for refund handling, and revokes issued tickets so gate operations stop using them."
      />

      {isCanceled ? (
        <AdminNotice tone="neutral">
          This concert is already canceled. The refund queue below reflects the
          current operational state.
        </AdminNotice>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <AdminNotice tone="neutral">
          Active reservations to expire:{" "}
          <strong>{preview.activeReservationsToExpire}</strong>
        </AdminNotice>
        <AdminNotice tone="neutral">
          Orders moving to refund queue:{" "}
          <strong>{preview.ordersToMarkRefundRequired}</strong>
        </AdminNotice>
        <AdminNotice tone="neutral">
          Pending orders to expire:{" "}
          <strong>{preview.pendingOrdersToExpire}</strong>
        </AdminNotice>
        <AdminNotice tone="neutral">
          Issued tickets to revoke:{" "}
          <strong>{preview.issuedTicketsToRevoke}</strong>
        </AdminNotice>
      </div>

      <label className="block text-sm font-black text-ticket-obsidian">
        Internal cancellation note
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className={`${inputClassName} min-h-28 py-3`}
          placeholder="Optional note for operators, for example sponsor withdrawal or venue issue."
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
        {isSubmitting ? "Processing..." : "Cancel Concert"}
      </AdminButton>
    </AdminPanel>
  );
}
