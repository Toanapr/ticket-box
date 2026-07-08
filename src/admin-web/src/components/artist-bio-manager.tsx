"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  ArtistBioReviewState,
  Concert,
  getArtistBioReviewState,
  publishArtistBioDraft,
  retryArtistBioJob,
  updateArtistBioDraft,
  uploadArtistBioPdf,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import {
  AdminButton,
  AdminDataTable,
  AdminEmptyState,
  AdminNotice,
  AdminPanel,
  AdminPanelTitle,
  AdminStatusBadge,
  AdminTable,
  AdminTableBody,
  AdminTableHead,
  fileInputClassName,
} from "./admin-ui";

export function ArtistBioManager({
  concert,
  initialReviewState,
}: {
  concert: Concert;
  initialReviewState: ArtistBioReviewState;
}) {
  const [reviewState, setReviewState] = useState(initialReviewState);
  const [file, setFile] = useState<File | null>(null);
  const [draftContent, setDraftContent] = useState(
    initialReviewState.latestDraft?.content ?? "",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);

  const latestDraft = reviewState.latestDraft;
  const latestDraftJob = useMemo(
    () => reviewState.jobs.find((job) => job.draft?.id === latestDraft?.id) ?? null,
    [reviewState.jobs, latestDraft?.id],
  );

  async function refreshReviewState() {
    const nextState = await getArtistBioReviewState(concert.id);
    setReviewState(nextState);
    setDraftContent(nextState.latestDraft?.content ?? "");
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!file) {
      setError("Choose a PDF press kit first.");
      return;
    }

    setIsUploading(true);
    setMessage(null);
    setError(null);

    try {
      const job = await uploadArtistBioPdf(concert.id, file);
      await refreshReviewState();
      setFile(null);
      form.reset();
      setMessage(
        job.idempotent
          ? job.status === "failed"
            ? "This PDF matches an existing failed job. Click Retry to process it again with the latest Gemini fallback behavior."
            : "This PDF was already uploaded before, so the existing AI job was reused."
          : "PDF uploaded. The AI artist bio job is now queued for processing.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to upload PDF press kit.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSaveDraft() {
    if (!latestDraft) {
      return;
    }

    setIsSavingDraft(true);
    setMessage(null);
    setError(null);

    try {
      await updateArtistBioDraft(latestDraft.id, draftContent);
      await refreshReviewState();
      setMessage("Draft artist bio updated.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to save artist bio draft.",
      );
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function handlePublishDraft() {
    if (!latestDraft) {
      return;
    }

    setIsPublishing(true);
    setMessage(null);
    setError(null);

    try {
      await publishArtistBioDraft(latestDraft.id);
      await refreshReviewState();
      setMessage(
        "Published artist bio updated on the concert detail content.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to publish artist bio draft.",
      );
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleRetry(jobId: string) {
    setRetryingJobId(jobId);
    setMessage(null);
    setError(null);

    try {
      await retryArtistBioJob(jobId);
      await refreshReviewState();
      setMessage("Failed AI job queued again for another processing attempt.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to retry artist bio job.",
      );
    } finally {
      setRetryingJobId(null);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPanel>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <AdminPanelTitle
            title="AI artist bio"
            description={`Upload a PDF press kit for ${reviewState.artistName}. The backend extracts and sanitizes the text, then uses AI to generate a short concert-ready artist bio draft for review.`}
          />
          <form
            onSubmit={handleUpload}
            className="flex w-full max-w-2xl flex-col gap-3 sm:flex-row sm:items-start"
          >
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className={fileInputClassName}
            />
            <AdminButton type="submit" disabled={isUploading} className="sm:shrink-0">
              {isUploading ? "Uploading..." : "Upload PDF"}
            </AdminButton>
          </form>
        </div>
        <div className="mt-4 space-y-3">
          <AdminNotice tone="neutral">
            If <code>GEMINI_API_KEY</code> or <code>GOOGLE_API_KEY</code> is
            configured, the worker will call Gemini automatically. If the provider
            is unavailable or the account quota is exhausted, the system falls back
            to the local mock provider so the workflow can still be tested
            end-to-end.
          </AdminNotice>
          {message ? <AdminNotice tone="success">{message}</AdminNotice> : null}
          {error ? <AdminNotice tone="error">{error}</AdminNotice> : null}
        </div>
      </AdminPanel>

      <AdminPanel>
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-black/10 bg-ticket-stone/70 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
              Published bio
            </p>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {reviewState.publishedArtistBio || "No published artist bio yet."}
            </p>
            <ArtistProfilesPreview
              className="mt-5"
              title="Published artist lineup"
              profiles={reviewState.publishedArtistProfiles}
              emptyLabel="No published artist lineup extracted yet."
            />
          </section>

          <section className="rounded-2xl border border-black/10 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-ticket-green">
                  Draft for review
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Edit the AI output before publishing it to the concert detail page.
                </p>
              </div>
              {latestDraftJob ? (
                <AdminStatusBadge status={latestDraftJob.status} />
              ) : null}
            </div>

            {latestDraft ? (
              <>
                <textarea
                  value={draftContent}
                  onChange={(event) => setDraftContent(event.target.value)}
                  className="mt-4 min-h-60 w-full rounded border border-black/10 bg-ticket-alabaster px-4 py-3 text-sm leading-7 text-ticket-obsidian outline-none transition focus:border-ticket-green focus:bg-white"
                />
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <AdminButton
                    type="button"
                    variant="secondary"
                    onClick={handleSaveDraft}
                    disabled={isSavingDraft}
                  >
                    {isSavingDraft ? "Saving..." : "Save draft"}
                  </AdminButton>
                  <AdminButton
                    type="button"
                    onClick={handlePublishDraft}
                    disabled={isPublishing}
                  >
                    {isPublishing ? "Publishing..." : "Publish bio"}
                  </AdminButton>
                </div>
                <ArtistProfilesPreview
                  className="mt-5"
                  title="Extracted artist lineup"
                  profiles={latestDraft.artistProfiles}
                  emptyLabel="The PDF did not yield structured artist cards for the audience lineup yet."
                />
              </>
            ) : (
              <div className="mt-4">
                <AdminNotice tone="neutral">
                  Upload a PDF and wait for the worker to finish before a draft appears
                  here.
                </AdminNotice>
              </div>
            )}
          </section>
        </div>
      </AdminPanel>

      <AdminDataTable>
        <AdminTable minWidthClassName="min-w-[1180px]">
          <AdminTableHead>
            <tr>
              <th className="px-6 py-4">Created</th>
              <th className="px-6 py-4">Source file</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Attempts</th>
              <th className="px-6 py-4">Provider</th>
              <th className="px-6 py-4">Draft</th>
              <th className="px-6 py-4">Error</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {reviewState.jobs.map((job) => (
              <tr key={job.id} className="align-top">
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {formatDateTime(job.createdAt)}
                </td>
                <td className="px-6 py-5">
                  <p className="font-display text-lg font-black tracking-tight text-ticket-obsidian">
                    {job.originalName ?? job.rawObjectKey}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {job.pipelineVersion}
                  </p>
                </td>
                <td className="px-6 py-5">
                  <AdminStatusBadge status={job.status} />
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {job.attemptCount}/{job.maxAttempts}
                </td>
                <td className="px-6 py-5 text-sm text-slate-600">
                  {job.providerVersion ? (
                    <>
                      <p>{job.providerVersion}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                        {job.modelVersion ?? "n/a"}
                      </p>
                    </>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-6 py-5 text-sm text-slate-600">
                  {job.draft ? (
                    <>
                      <p className="font-semibold text-ticket-obsidian">
                        Ready for review
                      </p>
                      <p className="mt-1 line-clamp-3 max-w-sm leading-6">
                        {job.draft.content}
                      </p>
                    </>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-6 py-5 text-sm leading-6 text-slate-600">
                  {job.lastError ?? "-"}
                </td>
                <td className="px-6 py-5">
                  {job.status === "failed" || job.status === "draft_ready" ? (
                    <AdminButton
                      type="button"
                      variant="secondary"
                      className="min-h-11 px-4"
                      onClick={() => handleRetry(job.id)}
                      disabled={retryingJobId === job.id}
                    >
                      {retryingJobId === job.id ? "Retrying..." : "Retry"}
                    </AdminButton>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </AdminTableBody>
        </AdminTable>

        {reviewState.jobs.length === 0 ? (
          <AdminEmptyState>No artist bio jobs yet.</AdminEmptyState>
        ) : null}
      </AdminDataTable>
    </div>
  );
}

function ArtistProfilesPreview({
  title,
  profiles,
  emptyLabel,
  className = "",
}: {
  title: string;
  profiles?: Array<{ name: string; role?: string; summary: string }> | null;
  emptyLabel: string;
  className?: string;
}) {
  const safeProfiles = profiles || [];
  return (
    <div className={className}>
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
        {title}
      </p>
      {safeProfiles.length > 0 ? (
        <div className="mt-3 grid gap-3">
          {safeProfiles.map((artist) => (
            <article
              key={artist.name}
              className="rounded-xl border border-black/10 bg-ticket-alabaster px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-black tracking-tight text-ticket-obsidian">
                    {artist.name}
                  </p>
                  {artist.role ? (
                    <p className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] text-ticket-green">
                      {artist.role}
                    </p>
                  ) : null}
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {artist.summary}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold text-slate-500">{emptyLabel}</p>
      )}
    </div>
  );
}
