import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import {
  CheckIcon,
  CreditCardIcon,
  QrIcon,
  TicketIcon,
  UsersIcon,
} from "@/components/icons";
import { PageShell } from "@/components/site-shell";

const buyingSteps = [
  {
    title: "Đăng nhập hoặc đăng ký",
    body: "Tạo tài khoản để lưu thông tin mua vé, xem vé giữ chỗ và mở lại e-ticket sau khi thanh toán.",
  },
  {
    title: "Chọn sự kiện và khu vé",
    body: "Vào danh sách sự kiện, chọn concert, chọn hạng vé phù hợp và kiểm tra giới hạn số lượng trên mỗi tài khoản.",
  },
  {
    title: "Giữ chỗ trong phiên checkout",
    body: "Sau khi bấm giữ vé, hệ thống tạo reservation tạm thời. Nếu quá thời gian, vé sẽ được trả về kho.",
  },
  {
    title: "Thanh toán qua VNPAY",
    body: "Mở cổng VNPAY, quét QR hoặc chọn ngân hàng hỗ trợ. Cần thanh toán đúng số tiền và mã đơn.",
  },
  {
    title: "Nhận e-ticket QR",
    body: "Khi thanh toán thành công, vé điện tử được phát hành trong tài khoản và có thể mở lại ở trang Tài khoản.",
  },
];

const notes = [
  "Vé đang giữ chỗ nhưng chưa thanh toán nằm trong mục Tài khoản > Vé đang giữ chỗ.",
  "Nếu thanh toán thất bại, quay lại trang đơn hàng để thử lại khi lượt giữ vé còn hạn.",
  "Khi đến sự kiện, mở e-ticket QR trên điện thoại để nhân viên quét mã check-in.",
];

export default function GuidePage(): React.ReactElement {
  return (
    <PageShell>
      <Breadcrumbs
        items={[
          { label: "Concerts", href: "/concerts" },
          { label: "Hướng dẫn" },
        ]}
      />

      <section className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="rounded-lg border border-ticket-obsidian bg-white p-6 shadow-[6px_6px_0_#0d1118] md:p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-ticket-green/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-ticket-green">
            <TicketIcon className="h-4 w-4" />
            Hướng dẫn mua vé
          </div>
          <h1 className="mt-5 font-display text-3xl font-black tracking-tight md:text-4xl">
            Mua vé TicketBox trong 5 bước
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Trang này giải thích ngắn gọn luồng mua vé cho khán giả: từ chọn
            concert, giữ chỗ, thanh toán đến nhận e-ticket QR.
          </p>

          <div className="mt-8 grid gap-4">
            {buyingSteps.map((step, index) => (
              <article
                key={step.title}
                className="grid gap-4 rounded-lg border border-black/10 bg-ticket-alabaster p-4 sm:grid-cols-[56px_1fr]"
              >
                <div className="grid h-12 w-12 place-items-center rounded bg-ticket-obsidian font-display text-lg font-black text-white">
                  {index + 1}
                </div>
                <div>
                  <h2 className="font-display text-xl font-black">
                    {step.title}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {step.body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="grid gap-5">
          <div className="rounded-lg border border-black/10 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded bg-ticket-green/10 text-ticket-green">
                <CreditCardIcon className="h-5 w-5" />
              </div>
              <h2 className="font-display text-xl font-black">Thanh toán</h2>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Hiện checkout hỗ trợ thanh toán qua VNPAY. Mỗi đơn có mã thanh
              toán riêng, không dùng lại QR của đơn cũ.
            </p>
          </div>

          <div className="rounded-lg border border-black/10 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded bg-ticket-stone text-ticket-obsidian">
                <UsersIcon className="h-5 w-5" />
              </div>
              <h2 className="font-display text-xl font-black">Tài khoản</h2>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Tài khoản giúp bạn theo dõi vé giữ chỗ, vé đã mua và thông tin cơ
              bản dùng khi checkout.
            </p>
            <Link
              href="/user"
              className="mt-4 flex min-h-11 items-center justify-center rounded bg-ticket-green px-4 text-sm font-black uppercase tracking-wide text-white"
            >
              Xem tài khoản
            </Link>
          </div>

          <div className="rounded-lg border border-ticket-obsidian bg-ticket-obsidian p-5 text-white">
            <div className="flex items-center gap-3">
              <QrIcon className="h-6 w-6 text-ticket-green" />
              <h2 className="font-display text-xl font-black">
                Lưu ý khi vào cổng
              </h2>
            </div>
            <div className="mt-5 grid gap-3 text-sm leading-6 text-slate-200">
              {notes.map((note) => (
                <div key={note} className="flex gap-3">
                  <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-ticket-green" />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </PageShell>
  );
}
