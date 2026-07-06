"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  Concert,
  GuestListImportBatch,
  listGuestListImports,
  uploadGuestListCsv,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import {
  AdminButton,
  AdminDataTable,
  AdminEmptyState,
  AdminNotice,
  AdminPanel,
  AdminPanelTitle,
  AdminStatusBadge,
  fileInputClassName,
} from "./admin-ui";

export function GuestListImportManager({
  concert,
  initialImports,
}: {
  concert: Concert;
  initialImports: GuestListImportBatch[];
}) {
  const [imports, setImports] = useState(initialImports);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeVersion = useMemo(
    () => imports.find((item) => item.version?.isActive),
    [imports],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!file) {
      setError("Choose a CSV file first.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const result = await uploadGuestListCsv(concert.id, file);
      const nextImports = await listGuestListImports(concert.id);
      setImports(nextImports);
      setFile(null);
      setMessage(
        result.idempotent
          ? "This CSV was already imported; existing batch returned."
          : result.status === "published"
            ? "Guest list version published."
            : "CSV staged with validation errors.",
      );
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPanel>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <AdminPanelTitle
            title="CSV import"
            description={`Active version: ${activeVersion?.version?.versionNo ?? "none"}`}
          />
          <form onSubmit={handleSubmit} className="flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:items-start">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className={fileInputClassName}
            />
            <AdminButton type="submit" disabled={isSubmitting} className="sm:shrink-0">
              {isSubmitting ? "Importing" : "Import CSV"}
            </AdminButton>
          </form>
        </div>
        {message ? (
          <div className="mt-4">
            <AdminNotice tone="success">{message}</AdminNotice>
          </div>
        ) : null}
        {error ? (
          <div className="mt-4">
            <AdminNotice tone="error">{error}</AdminNotice>
          </div>
        ) : null}
      </AdminPanel>

      <AdminDataTable>
        <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
          <thead className="bg-ticket-stone text-[11px] uppercase tracking-[0.24em] text-slate-500">
            <tr>
              <th className="px-6 py-4">Created</th>
              <th className="px-6 py-4">File</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Rows</th>
              <th className="px-6 py-4">Duplicates</th>
              <th className="px-6 py-4">Version</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {imports.map((item) => (
              <tr key={item.id} className="align-top">
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {formatDateTime(item.createdAt)}
                </td>
                <td className="px-6 py-5">
                  <p className="font-display text-lg font-black tracking-tight text-ticket-obsidian">
                    {item.originalName ?? item.rawObjectKey}
                  </p>
                </td>
                <td className="px-6 py-5">
                  <AdminStatusBadge status={item.status} />
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {item.summary.validRows}/{item.summary.totalRows} valid
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {item.summary.duplicateRows}
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {item.version ? `v${item.version.versionNo}` : "-"}
                </td>
                <td className="px-6 py-5">
                  {item.summary.invalidRows > 0 ? (
                    <a
                      href={`/admin/guest-list/imports/${item.id}/errors`}
                      className="inline-flex min-h-11 items-center justify-center rounded border border-black/10 bg-ticket-alabaster px-4 text-sm font-black uppercase tracking-wide text-ticket-obsidian transition hover:bg-white"
                    >
                      Errors
                    </a>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {imports.length === 0 ? (
          <AdminEmptyState>No guest list imports yet.</AdminEmptyState>
        ) : null}
      </AdminDataTable>
    </div>
  );
}



