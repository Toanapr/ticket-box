import { notFound } from "next/navigation";
import { TicketTypesManager } from "@/components/ticket-types-manager";
import { AdminBackLink, AdminHero } from "@/components/admin-ui";
import { Concert } from "@/lib/api";
import { serverApiFetch } from "@/lib/server-api";

type TicketTypesPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TicketTypesPage({
  params,
}: TicketTypesPageProps) {
  const { id } = await params;
  const concert = await serverApiFetch<Concert>(`/admin/concerts/${id}`).catch(
    () => null,
  );

  if (!concert) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <AdminBackLink href="/admin/concerts">Quay lại danh sách sự kiện</AdminBackLink>
        <AdminHero
          eyebrow="Thiết kế phân hạng vé"
          title="Các loại vé"
          description={`Cấu hình khu vực, thời gian mở bán, giá vé và giới hạn cho ${concert.title}.`}
        />
      </div>

      <TicketTypesManager concert={concert} />
    </div>
  );
}
