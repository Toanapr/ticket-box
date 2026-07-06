import { ConcertForm } from "@/components/concert-form";
import { AdminBackLink, AdminHero, AdminPanel } from "@/components/admin-ui";

export default function NewConcertPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <AdminBackLink href="/admin/concerts">Back to concerts</AdminBackLink>
        <AdminHero
          eyebrow="Concert setup"
          title="Create a new concert"
          description="Set the core event details first. Publishing and poster requirements continue to follow the existing admin workflow."
        />
      </div>

      <AdminPanel className="max-w-3xl">
        <ConcertForm mode="create" />
      </AdminPanel>
    </div>
  );
}
