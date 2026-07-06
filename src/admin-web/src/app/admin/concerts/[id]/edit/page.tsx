import { notFound } from "next/navigation";
import { ConcertForm } from "@/components/concert-form";
import { AdminBackLink, AdminHero, AdminPanel } from "@/components/admin-ui";
import { Concert } from "@/lib/api";
import { serverApiFetch } from "@/lib/server-api";

type EditConcertPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditConcertPage({
  params,
}: EditConcertPageProps) {
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
        <AdminBackLink href="/admin/concerts">Back to concerts</AdminBackLink>
        <AdminHero
          eyebrow="Concert setup"
          title={`Edit ${concert.title}`}
          description="Update public-facing event details while keeping all current publishing rules and save behavior intact."
        />
      </div>

      <AdminPanel className="max-w-3xl">
        <ConcertForm mode="edit" concert={concert} />
      </AdminPanel>
    </div>
  );
}
