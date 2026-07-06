import Link from "next/link";
import { notFound } from "next/navigation";
import { GuestListImportManager } from "@/components/guest-list-import-manager";
import { Concert, GuestListImportBatch } from "@/lib/api";
import { serverApiFetch } from "@/lib/server-api";

type GuestListPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function GuestListPage({ params }: GuestListPageProps) {
  const { id } = await params;
  const concert = await serverApiFetch<Concert>(`/admin/concerts/${id}`).catch(
    () => null,
  );

  if (!concert) {
    notFound();
  }

  const imports = await serverApiFetch<GuestListImportBatch[]>(
    `/admin/concerts/${id}/guest-list/imports`,
  ).catch(() => []);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/concerts"
          className="text-sm font-medium text-emerald-700"
        >
          Back to concerts
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-slate-950">Guest list</h1>
        <p className="mt-1 text-sm text-slate-600">{concert.title}</p>
      </div>

      <GuestListImportManager concert={concert} initialImports={imports} />
    </div>
  );
}
