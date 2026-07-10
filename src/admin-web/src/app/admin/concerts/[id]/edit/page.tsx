import { notFound } from "next/navigation";
import { ArtistBioManager } from "@/components/artist-bio-manager";
import { ConcertForm } from "@/components/concert-form";
import {
  AdminBackLink,
  AdminHero,
  AdminLinkButton,
  AdminPanel,
} from "@/components/admin-ui";
import { ArtistBioReviewState, Concert } from "@/lib/api";
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

  const reviewState = await serverApiFetch<ArtistBioReviewState>(
    `/admin/concerts/${id}/artist-bio/review`,
  ).catch(() => ({
    concertId: id,
    artistName: concert.artistName,
    publishedArtistBio: concert.publishedArtistBio,
    publishedArtistProfiles: concert.publishedArtistProfiles ?? [],
    latestDraft: null,
    jobs: [],
  }));

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <AdminBackLink href="/admin/concerts">Back to concerts</AdminBackLink>
        <AdminHero
          eyebrow="Concert setup"
          title={`Edit ${concert.title}`}
          description="Update public-facing event details while keeping all current publishing rules and save behavior intact."
          action={
            <AdminLinkButton
              href={`/admin/concerts/${concert.id}/operations`}
              variant="secondary"
            >
              Operations
            </AdminLinkButton>
          }
        />
      </div>

      <AdminPanel className="max-w-3xl">
        <ConcertForm mode="edit" concert={concert} />
      </AdminPanel>

      <ArtistBioManager concert={concert} initialReviewState={reviewState} />
    </div>
  );
}
