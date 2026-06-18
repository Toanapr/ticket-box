import Link from "next/link";
import { TicketIcon } from "./icons";
import { SiteAuthControls } from "./site-auth-controls";

export function SiteHeader(): React.ReactElement {
  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-[rgba(250,250,248,0.88)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-10">
        <Link href="/concerts" className="flex items-center gap-2 font-display text-xl font-black tracking-tight">
          <TicketIcon className="h-7 w-7 text-ticket-green" />
          <span>
            Ticket<span className="text-ticket-green">Box</span>
          </span>
        </Link>

        <nav aria-label="Điều hướng chính" className="hidden items-center gap-8 text-sm font-bold text-slate-600 md:flex">
          <Link className="transition hover:text-ticket-green" href="/concerts">
            Sự kiện
          </Link>
          <Link className="transition hover:text-ticket-green" href="/concerts">
            Lịch diễn
          </Link>
          <Link className="transition hover:text-ticket-green" href="/concerts">
            Hướng dẫn
          </Link>
          <Link className="transition hover:text-ticket-green" href="/user">
            Tài khoản
          </Link>
        </nav>

        <SiteAuthControls />
      </div>
    </header>
  );
}

export function SiteFooter(): React.ReactElement {
  return (
    <footer className="mt-20 border-t border-black/10 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-[2fr_1fr_1.2fr] md:px-10">
        <div>
          <div className="mb-4 flex items-center gap-2 font-display text-2xl font-black">
            <TicketIcon className="h-7 w-7 text-ticket-green" />
            Ticket<span className="text-ticket-green">Box</span>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-600">
            Hệ thống bán vé concert cho khán giả: xem sự kiện, giữ vé, theo dõi thanh toán và nhận e-ticket QR.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
            <span className="rounded border border-black/10 bg-ticket-alabaster px-3 py-2">SSL Secure</span>
            <span className="rounded border border-black/10 bg-ticket-alabaster px-3 py-2">Signed QR</span>
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-xs font-black uppercase tracking-wider">Dịch vụ</h2>
          <div className="grid gap-3 text-sm text-slate-600">
            <Link href="/concerts">Chính sách bảo mật</Link>
            <Link href="/concerts">Điều khoản sử dụng</Link>
            <Link href="/concerts">Chính sách hoàn tiền</Link>
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-xs font-black uppercase tracking-wider">Trợ giúp</h2>
          <div className="grid gap-3 text-sm text-slate-600">
            <span>1900 6408 (8:30 - 18:30)</span>
            <span>support@ticketbox.vn</span>
            <span>Quận 1, TP. Hồ Chí Minh</span>
          </div>
        </div>
      </div>
      <div className="border-t border-black/10 px-5 py-5 text-center text-xs text-slate-500">
        © 2026 TicketBox Việt Nam. Phase 1 audience web demo.
      </div>
    </footer>
  );
}

export function PageShell({ children }: { children: React.ReactNode }): React.ReactElement {
  return <main className="mx-auto min-h-[calc(100dvh-18rem)] w-full max-w-7xl px-5 py-8 md:px-10 md:py-12">{children}</main>;
}
