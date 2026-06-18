import Link from "next/link";
import { notFound } from "next/navigation";
import { ConcertForm } from "@/components/concert-form";
import { apiFetch, Concert } from "@/lib/api";

type EditConcertPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditConcertPage({ params }: EditConcertPageProps) {
  const { id } = await params;
  const concert = await apiFetch<Concert>(`/admin/concerts/${id}`).catch(() => null);

  if (!concert) {
    notFound();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/admin/concerts" className="text-sm font-medium text-emerald-700">
          Back to concerts
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-slate-950">Edit concert</h1>
      </div>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <ConcertForm mode="edit" concert={concert} />
      </section>
    </div>
  );
}
