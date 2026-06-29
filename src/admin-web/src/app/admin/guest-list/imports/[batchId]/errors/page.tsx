import Link from "next/link";
import { notFound } from "next/navigation";
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
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/concerts"
          className="text-sm font-medium text-emerald-700"
        >
          Back to concerts
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-slate-950">
          Import errors
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {report.summary.invalidRows} invalid rows in batch {batchId}
        </p>
      </div>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Row</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Raw row</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {report.errors.map((error) => (
              <tr key={error.rowNumber}>
                <td className="px-4 py-3 font-semibold text-slate-950">
                  {error.rowNumber}
                </td>
                <td className="px-4 py-3 text-red-700">
                  {error.errorReason}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-700">
                  {JSON.stringify(error.rawRow)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {report.errors.length === 0 ? (
          <div className="border-t border-slate-200 px-4 py-10 text-center text-sm text-slate-600">
            No row errors recorded for this batch.
          </div>
        ) : null}
      </section>
    </div>
  );
}
