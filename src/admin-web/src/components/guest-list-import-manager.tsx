"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  Concert,
  GuestListImportBatch,
  listGuestListImports,
  uploadGuestListCsv,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";

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
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <h2 className="text-base font-semibold text-slate-950">
              CSV import
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Active version: {activeVersion?.version?.versionNo ?? "none"}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="h-10 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-sm file:font-medium file:text-slate-700"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSubmitting ? "Importing" : "Import CSV"}
            </button>
          </form>
        </div>
        {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">File</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Rows</th>
              <th className="px-4 py-3">Duplicates</th>
              <th className="px-4 py-3">Version</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {imports.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-slate-700">
                  {formatDateTime(item.createdAt)}
                </td>
                <td className="px-4 py-3 font-medium text-slate-950">
                  {item.originalName ?? item.rawObjectKey}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold capitalize text-slate-700">
                    {item.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {item.summary.validRows}/{item.summary.totalRows} valid
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {item.summary.duplicateRows}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {item.version ? `v${item.version.versionNo}` : "-"}
                </td>
                <td className="px-4 py-3">
                  {item.summary.invalidRows > 0 ? (
                    <a
                      href={`/admin/guest-list/imports/${item.id}/errors`}
                      className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
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
          <div className="border-t border-slate-200 px-4 py-10 text-center text-sm text-slate-600">
            No guest list imports yet.
          </div>
        ) : null}
      </section>
    </div>
  );
}
