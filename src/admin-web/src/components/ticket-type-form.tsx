"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, TicketType, TicketTypePayload } from "@/lib/api";

type TicketTypeFormProps = {
  concertId: string;
  ticketType?: TicketType;
  onCancel?: () => void;
};

export function TicketTypeForm({ concertId, ticketType, onCancel }: TicketTypeFormProps) {
  const router = useRouter();
  const isEditing = Boolean(ticketType);
  const [zoneCode, setZoneCode] = useState(ticketType?.zoneCode ?? "");
  const [price, setPrice] = useState(ticketType ? String(ticketType.price) : "");
  const [capacity, setCapacity] = useState(ticketType ? String(ticketType.capacity) : "");
  const [saleStartsAt, setSaleStartsAt] = useState(
    toDateTimeLocalValue(ticketType?.saleStartsAt),
  );
  const [saleEndsAt, setSaleEndsAt] = useState(toDateTimeLocalValue(ticketType?.saleEndsAt));
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

    if (!zoneCode.trim() || !saleStartsAt || !saleEndsAt) {
      setError("Zone code and sale window are required.");
      return;
    }

    if (numericPrice <= 0 || numericCapacity <= 0 || numericPerUserLimit <= 0) {
      setError("Price, capacity, and per-user limit must be greater than zero.");
      return;
    }

    if (saleEndsAt <= saleStartsAt) {
      setError("Sale end must be after sale start.");
      return;
    }

    setIsSaving(true);

    try {
      const payload: TicketTypePayload = {
        zoneCode,
        price: numericPrice,
        capacity: numericCapacity,
        saleStartsAt,
        saleEndsAt,
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
        setSaleStartsAt("");
        setSaleEndsAt("");
        setPerUserLimit("");
      }

      onCancel?.();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save ticket type.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Zone code</span>
        <input
          value={zoneCode}
          onChange={(event) => setZoneCode(event.target.value)}
          className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-950 shadow-sm outline-none focus:border-emerald-600"
          required
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Price</span>
        <input
          type="number"
          min="1"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-950 shadow-sm outline-none focus:border-emerald-600"
          required
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Capacity</span>
        <input
          type="number"
          min="1"
          value={capacity}
          onChange={(event) => setCapacity(event.target.value)}
          className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-950 shadow-sm outline-none focus:border-emerald-600"
          required
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Per-user limit</span>
        <input
          type="number"
          min="1"
          value={perUserLimit}
          onChange={(event) => setPerUserLimit(event.target.value)}
          className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-950 shadow-sm outline-none focus:border-emerald-600"
          required
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Sale start</span>
        <input
          type="datetime-local"
          value={saleStartsAt}
          onChange={(event) => setSaleStartsAt(event.target.value)}
          className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-950 shadow-sm outline-none focus:border-emerald-600"
          required
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Sale end</span>
        <input
          type="datetime-local"
          value={saleEndsAt}
          onChange={(event) => setSaleEndsAt(event.target.value)}
          className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-950 shadow-sm outline-none focus:border-emerald-600"
          required
        />
      </label>

      {error ? (
        <p className="text-sm font-medium text-red-700 md:col-span-2">{error}</p>
      ) : null}

      <div className="flex flex-wrap gap-2 md:col-span-2">
        <button
          type="submit"
          disabled={isSaving}
          className="h-11 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSaving ? "Saving..." : isEditing ? "Save ticket type" : "Create ticket type"}
        </button>
        {isEditing ? (
          <button
            type="button"
            onClick={onCancel}
            className="h-11 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
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
