import { notFound } from "next/navigation";
import {
  AdminBackLink,
  AdminDataTable,
  AdminEmptyState,
  AdminHero,
  AdminTable,
  AdminTableBody,
  AdminTableHead,
} from "@/components/admin-ui";
import { GuestListImportErrors } from "@/lib/api";
import { serverApiFetch } from "@/lib/server-api";

type ImportErrorsPageProps = {
  params: Promise<{
    batchId: string;
  }>;
};

export default async function ImportErrorsPage({
  params,
}: ImportErrorsPageProps) {
  const { batchId } = await params;
  const report = await serverApiFetch<GuestListImportErrors>(
    `/admin/guest-list/imports/${batchId}/errors`,
  ).catch(() => null);

  if (!report) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <AdminBackLink href="/admin/concerts">Back to concerts</AdminBackLink>
        <AdminHero
          eyebrow="Validation report"
          title="Import errors"
          description={`${report.summary.invalidRows} invalid rows were recorded for batch ${batchId}.`}
        />
      </div>

      <AdminDataTable>
        <AdminTable minWidthClassName="min-w-[960px]">
          <AdminTableHead>
            <tr>
              <th className="px-6 py-4">Row</th>
              <th className="px-6 py-4">Reason</th>
              <th className="px-6 py-4">Raw row</th>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {report.errors.map((error) => (
              <tr key={error.rowNumber} className="align-top">
                <td className="px-6 py-5 font-black text-ticket-obsidian">
                  {error.rowNumber}
                </td>
                <td className="px-6 py-5 text-sm font-bold text-red-700">
                  {error.errorReason}
                </td>
                <td className="px-6 py-5 font-mono text-xs text-slate-700">
                  {JSON.stringify(error.rawRow)}
                </td>
              </tr>
            ))}
          </AdminTableBody>
        </AdminTable>

        {report.errors.length === 0 ? (
          <AdminEmptyState>
            No row errors recorded for this batch.
          </AdminEmptyState>
        ) : null}
      </AdminDataTable>
    </div>
  );
}
