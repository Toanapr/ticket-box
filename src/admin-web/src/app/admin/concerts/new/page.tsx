import Link from "next/link";
import { ConcertForm } from "@/components/concert-form";

export default function NewConcertPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/admin/concerts" className="text-sm font-medium text-emerald-700">
          Back to concerts
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-slate-950">Create concert</h1>
      </div>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <ConcertForm mode="create" />
      </section>
    </div>
  );
}
