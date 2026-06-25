"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, Concert, ConcertPayload, uploadPoster } from "@/lib/api";
import { getPostCreateStatusPatch } from "@/lib/concert-form-orchestration";

type ConcertFormProps = {
  mode: "create" | "edit";
  concert?: Concert;
};

export function ConcertForm({ mode, concert }: ConcertFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(concert?.title ?? "");
  const [venue, setVenue] = useState(concert?.venue ?? "");
  const [startAt, setStartAt] = useState(
    toDateTimeLocalValue(concert?.startAt),
  );
  const [status, setStatus] = useState<ConcertPayload["status"]>(
    concert?.status ?? "draft",
  );
  const [error, setError] = useState("");
  const [recoveryConcertId, setRecoveryConcertId] = useState<string | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);

  const existingPosterUrl = concert?.posterObjectKey
    ? `/api/backend/media/concert-posters/${encodeURIComponent(concert.posterObjectKey)}`
    : null;

  useEffect(() => {
    return () => {
      if (posterPreview) URL.revokeObjectURL(posterPreview);
    };
  }, [posterPreview]);

  function handlePosterChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setPosterFile(file);

    setPosterPreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setRecoveryConcertId(null);

    if (!title.trim() || !venue.trim() || !startAt) {
      setError("Title, venue, and start time are required.");
      return;
    }

    const isPublish = status === "published";
    const hasPosterFile = Boolean(posterFile);
    const hasExistingPoster = Boolean(concert?.posterObjectKey);

    if (isPublish && !hasPosterFile && !hasExistingPoster) {
      setError("Please select a poster image before publishing.");
      return;
    }

    setIsSaving(true);

    let createdConcert: Concert | null = null;

    try {
      if (mode === "create") {
        createdConcert = await apiFetch<Concert>("/admin/concerts", {
          method: "POST",
          body: JSON.stringify(
            buildConcertPayload({
              title,
              venue,
              startAt,
              status: "draft",
              concert,
            }),
          ),
        });
      }

      const targetId =
        mode === "edit" && concert ? concert.id : createdConcert?.id;

      if (!targetId) {
        throw new Error("Failed to identify concert for poster upload");
      }

      if (posterFile) {
        await uploadPoster(targetId, posterFile);
      }

      if (mode === "edit") {
        await apiFetch<Concert>(`/admin/concerts/${concert!.id}`, {
          method: "PATCH",
          body: JSON.stringify(
            buildConcertPayload({ title, venue, startAt, status, concert }),
          ),
        });
      } else if (createdConcert) {
        const statusPatch = getPostCreateStatusPatch(status);
        if (statusPatch) {
          await apiFetch<Concert>(`/admin/concerts/${createdConcert.id}`, {
            method: "PATCH",
            body: JSON.stringify(statusPatch),
          });
        }
      }

      router.push("/admin/concerts");
      router.refresh();
    } catch (caught) {
      setRecoveryConcertId(createdConcert?.id ?? null);
      setError(
        caught instanceof Error ? caught.message : "Unable to save concert.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Title</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-950 shadow-sm outline-none focus:border-emerald-600"
          required
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Venue</span>
        <input
          value={venue}
          onChange={(event) => setVenue(event.target.value)}
          className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-950 shadow-sm outline-none focus:border-emerald-600"
          required
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Start time</span>
        <input
          type="datetime-local"
          value={startAt}
          onChange={(event) => setStartAt(event.target.value)}
          className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-950 shadow-sm outline-none focus:border-emerald-600"
          required
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Status</span>
        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as ConcertPayload["status"])
          }
          className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-950 shadow-sm outline-none focus:border-emerald-600"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="canceled">Canceled</option>
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">
          Poster{mode === "create" ? " (required for publish)" : ""}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handlePosterChange}
          className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:rounded file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-emerald-700 hover:file:bg-emerald-100"
        />
        {mode === "edit" && !posterFile && existingPosterUrl ? (
          <div className="mt-2">
            <p className="mb-1 text-xs text-slate-500">Current poster:</p>
            <Image
              src={existingPosterUrl}
              alt="Current poster"
              width={256}
              height={128}
              className="h-32 w-auto rounded border object-contain"
            />
          </div>
        ) : null}
        {posterPreview ? (
          <div className="mt-2">
            <p className="mb-1 text-xs text-slate-500">New poster preview:</p>
            <Image
              src={posterPreview}
              alt="Poster preview"
              width={256}
              height={128}
              unoptimized
              className="h-32 w-auto rounded border object-contain"
            />
          </div>
        ) : null}
      </label>

      {error ? (
        <div className="space-y-1 text-sm font-medium text-red-700">
          <p>{error}</p>
          {recoveryConcertId ? (
            <p>
              Draft created. Continue editing at{" "}
              <Link
                href={`/admin/concerts/${recoveryConcertId}/edit`}
                className="underline"
              >
                concert {recoveryConcertId}
              </Link>
              .
            </p>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSaving}
        className="h-11 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isSaving
          ? "Saving..."
          : mode === "create"
            ? "Create concert"
            : "Save concert"}
      </button>
    </form>
  );
}

function buildConcertPayload(input: {
  title: string;
  venue: string;
  startAt: string;
  status: ConcertPayload["status"];
  concert?: Concert;
}): ConcertPayload {
  const title = input.title.trim();
  const venue = input.venue.trim();
  const fallbackObjectKey = `seating-maps/${slugify(title)}.svg`;

  return {
    title,
    venue,
    artistName: input.concert?.artistName ?? title,
    description: input.concert?.description ?? null,
    startAt: input.startAt,
    status: input.status,
    seatingMapObjectKey:
      input.concert?.seatingMapObjectKey ?? fallbackObjectKey,
    publishedArtistBio:
      input.concert?.publishedArtistBio ?? `${title} live at ${venue}.`,
  };
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "concert";
}

function toDateTimeLocalValue(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().slice(0, 16);
}
