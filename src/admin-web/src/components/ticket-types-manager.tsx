"use client";

import { useState } from "react";
import { Concert, TicketType } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { TicketTypeForm } from "./ticket-type-form";

type TicketTypesManagerProps = {
  concert: Concert;
};

export function TicketTypesManager({ concert }: TicketTypesManagerProps) {
  const [editingTicketType, setEditingTicketType] = useState<TicketType | null>(null);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-950">
          {editingTicketType ? "Edit ticket type" : "Create ticket type"}
        </h2>
        <TicketTypeForm
          key={editingTicketType?.id ?? "create"}
          concertId={concert.id}
          ticketType={editingTicketType ?? undefined}
          onCancel={() => setEditingTicketType(null)}
        />
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[840px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Zone</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Capacity</th>
              <th className="px-4 py-3">Sale start</th>
              <th className="px-4 py-3">Sale end</th>
              <th className="px-4 py-3">Per-user limit</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {concert.ticketTypes.map((ticketType) => (
              <tr key={ticketType.id}>
                <td className="px-4 py-3 font-semibold text-slate-950">
                  {ticketType.zoneCode}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {formatCurrency(ticketType.price)} VND
                </td>
                <td className="px-4 py-3 text-slate-700">{ticketType.capacity}</td>
                <td className="px-4 py-3 text-slate-700">
                  {formatDateTime(ticketType.saleStartsAt)}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {formatDateTime(ticketType.saleEndsAt)}
                </td>
                <td className="px-4 py-3 text-slate-700">{ticketType.perUserLimit}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setEditingTicketType(ticketType)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {concert.ticketTypes.length === 0 ? (
          <div className="border-t border-slate-200 px-4 py-10 text-center text-sm text-slate-600">
            No ticket types configured yet.
          </div>
        ) : null}
      </section>
    </div>
  );
}
