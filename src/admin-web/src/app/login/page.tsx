import { Suspense } from "react";
import { AdminAuthForm } from "@/components/admin-auth-form";
import { CheckIcon, TicketIcon, UsersIcon } from "@/components/icons";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-5 py-10 md:px-10">
      <section className="grid w-full gap-8 lg:grid-cols-[1.1fr_420px] lg:items-start">
        <div className="rounded-lg border border-ticket-obsidian bg-white p-6 shadow-[6px_6px_0_#0d1118] md:p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-ticket-green/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-ticket-green">
            <UsersIcon className="h-4 w-4" />
            Cổng Ban tổ chức
          </div>
          <h1 className="mt-5 font-display text-3xl font-black tracking-tight md:text-4xl">
            TicketBox Admin
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
            Đăng nhập bằng tài khoản ban tổ chức để quản lý các sự kiện, loại vé,
            danh sách khách mời và các thông báo vận hành. Các đội ngũ mới có thể đăng ký
            tài khoản quản trị trong vài phút.
          </p>
          <div className="mt-8">
            <Suspense>
              <AdminAuthForm mode="login" />
            </Suspense>
          </div>
        </div>

        <aside className="rounded-lg border border-black/10 bg-ticket-obsidian p-6 text-white md:p-8">
          <TicketIcon className="h-10 w-10 text-ticket-green" />
          <h2 className="mt-5 font-display text-2xl font-black">
            Cùng hệ sinh thái, tối ưu cho quy trình quản trị.
          </h2>
          <div className="mt-6 grid gap-4 text-sm leading-6 text-slate-200">
            <LoginBenefit text="Rà soát sự chuẩn bị của sự kiện, xuất bản số lượng vé và hiển thị tiến trình rõ ràng." />
            <LoginBenefit text="Quản lý các loại vé và nhập danh sách khách mời trực tiếp trong không gian làm việc." />
            <LoginBenefit text="Theo dõi việc gửi thông báo và duy trì phong cách tương tác đồng nhất của TicketBox." />
          </div>
        </aside>
      </section>
    </main>
  );
}

function LoginBenefit({ text }: { text: string }): React.ReactElement {
  return (
    <div className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ticket-green/15 text-ticket-green">
        <CheckIcon className="h-4 w-4" />
      </span>
      <span>{text}</span>
    </div>
  );
}
