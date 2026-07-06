import { notFound } from "next/navigation";
import { GuestListImportManager } from "@/components/guest-list-import-manager";
import { AdminBackLink, AdminHero } from "@/components/admin-ui";
import { ActiveGuestList, Concert, GuestListImportBatch } from "@/lib/api";
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

  const activeGuestList = await serverApiFetch<ActiveGuestList>(
    `/admin/concerts/${id}/guest-list/entries`,
  ).catch(() => ({
    concertId: id,
    version: null,
    entries: [],
  }));

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <AdminBackLink href="/admin/concerts">Back to concerts</AdminBackLink>
        <AdminHero
          eyebrow="Guest list operations"
          title="Guest list imports"
          description={`Upload, validate, and review guest lists for ${concert.title}. Every guest is assigned to one private guest area instead of customer bookable seating zones.`}
        />
      </div>

      <GuestListImportManager
        concert={concert}
        initialImports={imports}
        initialActiveGuestList={activeGuestList}
      />
    </div>
  );
}
