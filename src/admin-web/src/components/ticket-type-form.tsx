"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, TicketType, TicketTypePayload } from "@/lib/api";
import {
  AdminButton,
  AdminField,
  AdminNotice,
  inputClassName,
} from "./admin-ui";

type TicketTypeFormProps = {
  concertId: string;
  ticketType?: TicketType;
  onCancel?: () => void;
};

export function TicketTypeForm({
  concertId,
  ticketType,
  onCancel,
}: TicketTypeFormProps) {
  const router = useRouter();
  const isEditing = Boolean(ticketType);
  const [zoneCode, setZoneCode] = useState(ticketType?.zoneCode ?? "");
  const [price, setPrice] = useState(
    ticketType ? String(ticketType.price) : "",
  );
  const [capacity, setCapacity] = useState(
    ticketType ? String(ticketType.capacity) : "",
  );
  const [saleStartAt, setSaleStartAt] = useState(
    toDateTimeLocalValue(ticketType?.saleStartAt),
  );
  const [saleEndAt, setSaleEndAt] = useState(
    toDateTimeLocalValue(ticketType?.saleEndAt),
  );
  const [perUserLimit, setPerUserLimit] = useState(
    ticketType ? String(ticketType.perUserLimit) : "",
  );
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const numericPrice = Number(price);
    const numericCapacity = Number(capacity);
    const numericPerUserLimit = Number(perUserLimit);

    if (!zoneCode.trim() || !saleStartAt || !saleEndAt) {
      setError("Zone code and sale window are required.");
      return;
    }

    if (
      !Number.isFinite(numericPrice) ||
      !Number.isFinite(numericCapacity) ||
      !Number.isFinite(numericPerUserLimit) ||
      numericPrice <= 0 ||
      numericCapacity <= 0 ||
      numericPerUserLimit <= 0
    ) {
      setError(
        "Price, capacity, and per-user limit must be greater than zero.",
      );
      return;
    }

    if (saleEndAt <= saleStartAt) {
      setError("Sale end must be after sale start.");
      return;
    }

    setIsSaving(true);

    try {
      const normalizedZoneCode = zoneCode.trim().toUpperCase();
      const payload: TicketTypePayload = {
        zoneCode: normalizedZoneCode,
        name: ticketType?.name ?? normalizedZoneCode,
        price: numericPrice,
        capacity: numericCapacity,
        saleStartAt,
        saleEndAt,
        perUserLimit: numericPerUserLimit,
      };

      await apiFetch<TicketType>(
        isEditing && ticketType
          ? `/admin/ticket-types/${ticketType.id}`
          : `/admin/concerts/${concertId}/ticket-types`,
        {
          method: isEditing ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );

      if (!isEditing) {
        setZoneCode("");
        setPrice("");
        setCapacity("");
        setSaleStartAt("");
        setSaleEndAt("");
        setPerUserLimit("");
      }

      onCancel?.();
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to save ticket type.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
      <AdminField label="Zone code">
        <input
          value={zoneCode}
          onChange={(event) => setZoneCode(event.target.value)}
          className={inputClassName}
          required
        />
      </AdminField>

      <AdminField label="Price">
        <input
          type="number"
          min="1"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          className={inputClassName}
          required
        />
      </AdminField>

      <AdminField label="Capacity">
        <input
          type="number"
          min="1"
          value={capacity}
          onChange={(event) => setCapacity(event.target.value)}
          className={inputClassName}
          required
        />
      </AdminField>

      <AdminField label="Per-user limit">
        <input
          type="number"
          min="1"
          value={perUserLimit}
          onChange={(event) => setPerUserLimit(event.target.value)}
          className={inputClassName}
          required
        />
      </AdminField>

      <AdminField label="Sale start">
        <input
          type="datetime-local"
          value={saleStartAt}
          onChange={(event) => setSaleStartAt(event.target.value)}
          className={inputClassName}
          required
        />
      </AdminField>

      <AdminField label="Sale end">
        <input
          type="datetime-local"
          value={saleEndAt}
          onChange={(event) => setSaleEndAt(event.target.value)}
          className={inputClassName}
          required
        />
      </AdminField>

      {error ? (
        <div className="md:col-span-2">
          <AdminNotice tone="error">{error}</AdminNotice>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 md:col-span-2">
        <AdminButton type="submit" disabled={isSaving}>
          {isSaving
            ? "Saving..."
            : isEditing
              ? "Save ticket type"
              : "Create ticket type"}
        </AdminButton>
        {isEditing ? (
          <AdminButton type="button" onClick={onCancel} variant="secondary">
            Cancel
          </AdminButton>
        ) : null}
      </div>
    </form>
  );
}

function toDateTimeLocalValue(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().slice(0, 16);
}
