"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, Concert, ConcertPayload } from "@/lib/api";

type ConcertFormProps = {
  mode: "create" | "edit";
  concert?: Concert;
};

export function ConcertForm({ mode, concert }: ConcertFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(concert?.title ?? "");
  const [venue, setVenue] = useState(concert?.venue ?? "");
  const [startsAt, setStartsAt] = useState(toDateTimeLocalValue(concert?.startsAt));
  const [status, setStatus] = useState<ConcertPayload["status"]>(
    concert?.status ?? "draft",
  );
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!title.trim() || !venue.trim() || !startsAt) {
      setError("Title, venue, and start time are required.");
      return;
    }

    setIsSaving(true);

    try {
      const payload: ConcertPayload = {
        title,
        venue,
        startsAt,
        status,
      };

      if (mode === "create") {
        await apiFetch<Concert>("/admin/concerts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else if (concert) {
        await apiFetch<Concert>(`/admin/concerts/${concert.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }

      router.push("/admin/concerts");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save concert.");
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
          value={startsAt}
          onChange={(event) => setStartsAt(event.target.value)}
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
        </select>
      </label>

      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={isSaving}
        className="h-11 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isSaving ? "Saving..." : mode === "create" ? "Create concert" : "Save concert"}
      </button>
    </form>
  );
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
