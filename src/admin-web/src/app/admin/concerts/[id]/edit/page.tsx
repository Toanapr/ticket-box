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
        <AdminBackLink href="/admin/concerts">Quay lại danh sách sự kiện</AdminBackLink>
        <AdminHero
          eyebrow="Cấu hình sự kiện"
          title={`Chỉnh sửa ${concert.title}`}
          description="Cập nhật thông tin chi tiết sự kiện hiển thị công khai."
          action={
            <AdminLinkButton
              href={`/admin/concerts/${concert.id}/operations`}
              variant="secondary"
            >
              Vận hành
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
