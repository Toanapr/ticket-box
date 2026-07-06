"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  ActiveGuestList,
  Concert,
  GuestListImportBatch,
  deleteActiveGuestList,
  listActiveGuestList,
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
  AdminTable,
  AdminTableBody,
  AdminTableHead,
  fileInputClassName,
} from "./admin-ui";

export function GuestListImportManager({
  concert,
  initialImports,
  initialActiveGuestList,
}: {
  concert: Concert;
  initialImports: GuestListImportBatch[];
  initialActiveGuestList: ActiveGuestList;
}) {
  const [imports, setImports] = useState(initialImports);
  const [activeGuestList, setActiveGuestList] = useState(initialActiveGuestList);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const activeVersion = useMemo(
    () => imports.find((item) => item.version?.isActive),
    [imports],
  );

  async function refreshGuestListState() {
    const [nextImports, nextGuestList] = await Promise.all([
      listGuestListImports(concert.id),
      listActiveGuestList(concert.id),
    ]);
    setImports(nextImports);
    setActiveGuestList(nextGuestList);
  }

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
      await refreshGuestListState();
      setFile(null);
      setMessage(
        result.idempotent
          ? "This CSV was already imported; existing batch returned."
          : result.status === "published"
            ? "Guest list version published to the private guest area."
            : "CSV staged with validation errors.",
      );
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteGuestList() {
    const confirmed = window.confirm(
      `Delete the active guest list for "${concert.title}"? This will remove every published guest entry from the private guest area.`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    setMessage(null);

    try {
      const result = await deleteActiveGuestList(concert.id);
      await refreshGuestListState();
      setMessage(
        result.deleted
          ? "Active guest list deleted."
          : "There is no active guest list to delete.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to delete guest list.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPanel>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <AdminPanelTitle
            title="CSV import"
            description={`Active version: ${activeVersion?.version?.versionNo ?? "none"}. Guest imports no longer require seat positions or public ticket types. Every guest is assigned to one private guest area automatically.`}
          />
          <form
            onSubmit={handleSubmit}
            className="flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:items-start"
          >
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
        <div className="mt-4">
          <AdminNotice tone="neutral">
            Required columns: <strong>full_name</strong> and at least one of <strong>email</strong>, <strong>phone</strong>, or <strong>sponsor_id</strong>. Any legacy seating columns in older files are ignored.
          </AdminNotice>
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

      <AdminPanel>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <AdminPanelTitle
            title="Published guest list"
            description={
              activeGuestList.version
                ? `Version v${activeGuestList.version.versionNo} published ${formatDateTime(activeGuestList.version.publishedAt)}`
                : "No guest list version has been published yet."
            }
          />
          <div className="flex flex-col gap-3 sm:items-end">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <GuestListStat label="Guests" value={String(activeGuestList.entries.length)} />
              <GuestListStat label="Area" value="Private guest" />
              <GuestListStat
                label="Version"
                value={activeGuestList.version ? `v${activeGuestList.version.versionNo}` : "-"}
              />
            </div>
            <AdminButton
              type="button"
              variant="danger"
              className="min-h-11 px-4"
              onClick={handleDeleteGuestList}
              disabled={isDeleting || !activeGuestList.version}
            >
              {isDeleting ? "Deleting..." : "Delete guest list"}
            </AdminButton>
          </div>
        </div>

        {activeGuestList.entries.length === 0 ? (
          <div className="mt-4">
            <AdminNotice tone="neutral">
              Published guests will appear here after a successful import.
            </AdminNotice>
          </div>
        ) : null}
      </AdminPanel>

      <AdminDataTable>
        <AdminTable minWidthClassName="min-w-[840px]">
          <AdminTableHead>
            <tr>
              <th className="px-6 py-4">Guest</th>
              <th className="px-6 py-4">Access</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Phone</th>
              <th className="px-6 py-4">Sponsor</th>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {activeGuestList.entries.map((entry) => (
              <tr key={entry.id} className="align-top">
                <td className="px-6 py-5">
                  <p className="font-display text-lg font-black tracking-tight text-ticket-obsidian">
                    {entry.fullName}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {entry.identityKey}
                  </p>
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  Private guest area
                </td>
                <td className="px-6 py-5 text-sm text-slate-600">{entry.email ?? "-"}</td>
                <td className="px-6 py-5 text-sm text-slate-600">{entry.phone ?? "-"}</td>
                <td className="px-6 py-5 text-sm text-slate-600">{entry.sponsorId ?? "-"}</td>
              </tr>
            ))}
          </AdminTableBody>
        </AdminTable>

        {activeGuestList.entries.length === 0 ? (
          <AdminEmptyState>No published guest entries yet.</AdminEmptyState>
        ) : null}
      </AdminDataTable>

      <AdminDataTable>
        <AdminTable minWidthClassName="min-w-[1080px]">
          <AdminTableHead>
            <tr>
              <th className="px-6 py-4">Created</th>
              <th className="px-6 py-4">File</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Rows</th>
              <th className="px-6 py-4">Duplicates</th>
              <th className="px-6 py-4">Version</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
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
          </AdminTableBody>
        </AdminTable>

        {imports.length === 0 ? (
          <AdminEmptyState>No guest list imports yet.</AdminEmptyState>
        ) : null}
      </AdminDataTable>
    </div>
  );
}

function GuestListStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-ticket-stone px-4 py-3">
      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-black tracking-tight text-ticket-obsidian">
        {value}
      </p>
    </div>
  );
}
