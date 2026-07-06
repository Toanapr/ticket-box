import { notFound } from "next/navigation";
import { GuestListImportManager } from "@/components/guest-list-import-manager";
import { AdminBackLink, AdminHero } from "@/components/admin-ui";
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
    <div className="space-y-8">
      <div className="space-y-4">
        <AdminBackLink href="/admin/concerts">Back to concerts</AdminBackLink>
        <AdminHero
          eyebrow="Guest list operations"
          title="Guest list imports"
          description={`Upload and review guest list batches for ${concert.title} without changing the existing import pipeline.`}
        />
      </div>

      <GuestListImportManager concert={concert} initialImports={imports} />
    </div>
  );
}
