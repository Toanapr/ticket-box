import Link from "next/link";
import { PageShell } from "@/components/site-shell";

export default function NotFound(): React.ReactElement {
  return (
    <PageShell>
      <div className="rounded-lg border border-black/10 bg-white p-10 text-center">
        <h1 className="font-display text-3xl font-black">Không tìm thấy trang</h1>
        <p className="mt-3 text-slate-600">Đường dẫn này không tồn tại trong audience web.</p>
        <Link href="/concerts" className="mt-6 inline-flex min-h-12 items-center rounded bg-ticket-green px-5 text-sm font-black uppercase tracking-wide text-white">
          Về danh sách concert
        </Link>
      </div>
    </PageShell>
  );
}
