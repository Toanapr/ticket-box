import { DeleteConcertButton } from "@/components/delete-concert-button";
import { Concert } from "@/lib/api";
import { serverApiFetch } from "@/lib/server-api";
import { formatDateTime } from "@/lib/format";
import {
  AdminDataTable,
  AdminEmptyState,
  AdminHero,
  AdminLinkButton,
  AdminStatusBadge,
  AdminTable,
  AdminTableBody,
  AdminTableHead,
} from "@/components/admin-ui";

async function getConcerts() {
  try {
    return await serverApiFetch<Concert[]>("/admin/concerts");
  } catch {
    return [];
  }
}

export default async function ConcertsPage() {
  const concerts = await getConcerts();

  return (
    <div className="space-y-8">
      <AdminHero
        eyebrow="Không gian Ban tổ chức"
        title="Quản lý sự kiện"
        description="Quản lý danh mục sự kiện, theo dõi mức độ chuẩn bị và cấu hình hệ thống bán vé đồng nhất với trải nghiệm TicketBox công cộng."
        action={<AdminLinkButton href="/admin/concerts/new">Thêm sự kiện</AdminLinkButton>}
      />

      <AdminDataTable>
        <AdminTable minWidthClassName="min-w-[980px]">
          <AdminTableHead>
            <tr>
              <th className="px-6 py-4">Tên sự kiện</th>
              <th className="px-6 py-4">Địa điểm</th>
              <th className="px-6 py-4">Thời gian bắt đầu</th>
              <th className="px-6 py-4">Trạng thái</th>
              <th className="px-6 py-4">Loại vé</th>
              <th className="px-6 py-4">Thao tác</th>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {concerts.map((concert) => (
              <tr key={concert.id} className="align-top">
                <td className="px-6 py-5">
                  <div>
                    <p className="font-display text-xl font-black tracking-tight text-ticket-obsidian">
                      {concert.title}
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                      {concert.artistName}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {concert.venue}
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {formatDateTime(concert.startAt)}
                </td>
                <td className="px-6 py-5">
                  <AdminStatusBadge status={concert.status} />
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {concert.ticketTypes.length}
                </td>
                <td className="px-6 py-5">
                  <div className="flex flex-wrap gap-2">
                    <AdminLinkButton href={`/admin/concerts/${concert.id}/edit`} variant="secondary">
                      Chỉnh sửa
                    </AdminLinkButton>
                    <AdminLinkButton href={`/admin/concerts/${concert.id}/ticket-types`} variant="secondary">
                      Loại vé
                    </AdminLinkButton>
                    <AdminLinkButton href={`/admin/concerts/${concert.id}/operations`} variant="secondary">
                      Vận hành
                    </AdminLinkButton>
                    <AdminLinkButton href={`/admin/concerts/${concert.id}/guest-list`} variant="secondary">
                      Khách mời
                    </AdminLinkButton>
                    <DeleteConcertButton
                      concertId={concert.id}
                      concertTitle={concert.title}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </AdminTableBody>
        </AdminTable>

        {concerts.length === 0 ? (
          <AdminEmptyState>
            Không tìm thấy sự kiện nào. Hãy tạo một sự kiện mới để bắt đầu.
          </AdminEmptyState>
        ) : null}
      </AdminDataTable>
    </div>
  );
}
