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
        <AdminBackLink href="/admin/concerts">Quay lại danh sách sự kiện</AdminBackLink>
        <AdminHero
          eyebrow="Vận hành khách mời"
          title="Nhập danh sách khách mời"
          description={`Tải lên, kiểm tra và duyệt danh sách khách mời cho ${concert.title}. Tất cả khách mời sẽ tự động được xếp vào khu vực riêng.`}
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
