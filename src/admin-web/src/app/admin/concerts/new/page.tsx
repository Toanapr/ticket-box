import { ConcertForm } from "@/components/concert-form";
import { AdminBackLink, AdminHero, AdminPanel } from "@/components/admin-ui";

export default function NewConcertPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <AdminBackLink href="/admin/concerts">Quay lại danh sách sự kiện</AdminBackLink>
        <AdminHero
          eyebrow="Cấu hình sự kiện"
          title="Tạo sự kiện mới"
          description="Thiết lập các thông tin cơ bản trước. Các yêu cầu về xuất bản và poster sẽ tuân theo quy trình quản trị hiện tại."
        />
      </div>

      <AdminPanel className="max-w-3xl">
        <ConcertForm mode="create" />
      </AdminPanel>
    </div>
  );
}
