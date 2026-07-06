"use client";

import { useState } from "react";
import { Concert, TicketType } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { TicketTypeForm } from "./ticket-type-form";
import {
  AdminDataTable,
  AdminEmptyState,
  AdminPanel,
  AdminPanelTitle,
} from "./admin-ui";

type TicketTypesManagerProps = {
  concert: Concert;
};

export function TicketTypesManager({ concert }: TicketTypesManagerProps) {
  const [editingTicketType, setEditingTicketType] = useState<TicketType | null>(
    null,
  );

  return (
    <div className="space-y-6">
      <AdminPanel>
        <AdminPanelTitle
          title={editingTicketType ? "Edit ticket type" : "Create ticket type"}
          description="Ticket rules, limits, and sale windows continue to use the current business logic."
        />
        <TicketTypeForm
          key={editingTicketType?.id ?? "create"}
          concertId={concert.id}
          ticketType={editingTicketType ?? undefined}
          onCancel={() => setEditingTicketType(null)}
        />
      </AdminPanel>

      <AdminDataTable>
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="bg-ticket-stone text-[11px] uppercase tracking-[0.24em] text-slate-500">
            <tr>
              <th className="px-6 py-4">Zone</th>
              <th className="px-6 py-4">Price</th>
              <th className="px-6 py-4">Capacity</th>
              <th className="px-6 py-4">Sale start</th>
              <th className="px-6 py-4">Sale end</th>
              <th className="px-6 py-4">Per-user limit</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {concert.ticketTypes.map((ticketType) => (
              <tr key={ticketType.id} className="align-top">
                <td className="px-6 py-5 font-display text-lg font-black tracking-tight text-ticket-obsidian">
                  {ticketType.zoneCode}
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {formatCurrency(ticketType.price)} VND
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {ticketType.capacity}
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {formatDateTime(ticketType.saleStartAt)}
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {formatDateTime(ticketType.saleEndAt)}
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {ticketType.perUserLimit}
                </td>
                <td className="px-6 py-5">
                  <button
                    type="button"
                    onClick={() => setEditingTicketType(ticketType)}
                    className="inline-flex min-h-11 items-center justify-center rounded border border-black/10 bg-ticket-alabaster px-4 text-sm font-black uppercase tracking-wide text-ticket-obsidian transition hover:bg-white"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {concert.ticketTypes.length === 0 ? (
          <AdminEmptyState>No ticket types configured yet.</AdminEmptyState>
        ) : null}
      </AdminDataTable>
    </div>
  );
}
