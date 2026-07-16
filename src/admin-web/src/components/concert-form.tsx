"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, Concert, ConcertPayload, uploadPoster } from "@/lib/api";
import { getPostCreateStatusPatch } from "@/lib/concert-form-orchestration";
import {
  AdminButton,
  AdminField,
  AdminNotice,
  fileInputClassName,
  inputClassName,
} from "./admin-ui";

type ConcertFormProps = {
  mode: "create" | "edit";
  concert?: Concert;
};

export function ConcertForm({ mode, concert }: ConcertFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(concert?.title ?? "");
  const [artistName, setArtistName] = useState(concert?.artistName ?? "");
  const [venue, setVenue] = useState(concert?.venue ?? "");
  const [description, setDescription] = useState(concert?.description ?? "");
  const [startAt, setStartAt] = useState(
    toDateTimeLocalValue(concert?.startAt),
  );
  const [status, setStatus] = useState<ConcertPayload["status"]>(
    concert?.status === "canceled" ? "published" : (concert?.status ?? "draft"),
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

    if (!title.trim() || !artistName.trim() || !venue.trim() || !startAt) {
      setError("Tên sự kiện, nghệ sĩ, địa điểm và thời gian bắt đầu là bắt buộc.");
      return;
    }

    const isPublish = status === "published";
    const hasPosterFile = Boolean(posterFile);
    const hasExistingPoster = Boolean(concert?.posterObjectKey);

    if (isPublish && !hasPosterFile && !hasExistingPoster) {
      setError("Vui lòng chọn ảnh poster trước khi xuất bản.");
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
              artistName,
              description,
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
        throw new Error("Không thể xác định sự kiện để tải lên poster.");
      }

      if (posterFile) {
        await uploadPoster(targetId, posterFile);
      }

      if (mode === "edit") {
        await apiFetch<Concert>(`/admin/concerts/${concert!.id}`, {
          method: "PATCH",
          body: JSON.stringify(
            buildConcertUpdatePayload({
              title,
              artistName,
              description,
              venue,
              startAt,
              status,
              concert,
            }),
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
        caught instanceof Error ? caught.message : "Không thể lưu thông tin sự kiện.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <AdminField label="Tên sự kiện">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className={inputClassName}
          required
        />
      </AdminField>

      <AdminField label="Địa điểm">
        <input
          value={venue}
          onChange={(event) => setVenue(event.target.value)}
          className={inputClassName}
          required
        />
      </AdminField>

      <AdminField label="Tên nghệ sĩ">
        <input
          value={artistName}
          onChange={(event) => setArtistName(event.target.value)}
          className={inputClassName}
          required
        />
      </AdminField>

      <AdminField label="Mô tả sự kiện">
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="mt-2 min-h-28 w-full rounded border border-black/10 bg-ticket-alabaster px-4 py-3 text-sm leading-7 text-ticket-obsidian outline-none transition placeholder:text-slate-400 focus:border-ticket-green focus:bg-white"
          placeholder="Mô tả chi tiết sự kiện cho trang công cộng (không bắt buộc)"
        />
      </AdminField>

      <AdminField label="Thời gian bắt đầu">
        <input
          type="datetime-local"
          value={startAt}
          onChange={(event) => setStartAt(event.target.value)}
          className={inputClassName}
          required
        />
      </AdminField>

      {concert?.status === "canceled" ? (
        <AdminNotice>
          Sự kiện này đã bị hủy. Trạng thái xuất bản hiện được quản lý bởi quy trình
          vận hành riêng biệt, do đó bạn không thể thay đổi trạng thái tại đây.
        </AdminNotice>
      ) : (
        <AdminField label="Trạng thái">
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as ConcertPayload["status"])
            }
            className={inputClassName}
          >
            <option value="draft">Nháp (Draft)</option>
            <option value="published">Xuất bản (Published)</option>
          </select>
        </AdminField>
      )}

      <AdminField
        label={`Ảnh Poster${mode === "create" ? " (bắt buộc khi xuất bản)" : ""}`}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handlePosterChange}
          className={fileInputClassName}
        />
        {mode === "edit" && !posterFile && existingPosterUrl ? (
          <div className="mt-4 rounded-lg border border-black/10 bg-ticket-stone p-4">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              Ảnh Poster hiện tại
            </p>
            <Image
              src={existingPosterUrl}
              alt="Ảnh Poster hiện tại"
              width={256}
              height={128}
              className="h-32 w-auto rounded border border-black/10 object-contain"
            />
          </div>
        ) : null}
        {posterPreview ? (
          <div className="mt-4 rounded-lg border border-black/10 bg-ticket-stone p-4">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              Xem trước Poster mới
            </p>
            <Image
              src={posterPreview}
              alt="Poster preview"
              width={256}
              height={128}
              unoptimized
              className="h-32 w-auto rounded border border-black/10 object-contain"
            />
          </div>
        ) : null}
      </AdminField>

      {error ? (
        <div className="space-y-3">
          <AdminNotice tone="error">{error}</AdminNotice>
          {recoveryConcertId ? (
            <AdminNotice>
              Bản nháp đã được tạo. Tiếp tục chỉnh sửa tại{" "}
              <Link
                href={`/admin/concerts/${recoveryConcertId}/edit`}
                className="text-ticket-green underline-offset-4 hover:underline"
              >
                sự kiện {recoveryConcertId}
              </Link>
              .
            </AdminNotice>
          ) : null}
        </div>
      ) : null}

      <AdminButton type="submit" disabled={isSaving}>
        {isSaving
          ? "Đang lưu..."
          : mode === "create"
            ? "Tạo sự kiện"
            : "Lưu sự kiện"}
      </AdminButton>
    </form>
  );
}

function buildConcertPayload(input: {
  title: string;
  artistName: string;
  description: string;
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
    artistName: input.artistName.trim(),
    description: input.description.trim() || null,
    startAt: input.startAt,
    status: input.status,
    seatingMapObjectKey:
      input.concert?.seatingMapObjectKey ?? fallbackObjectKey,
    publishedArtistBio:
      input.concert?.publishedArtistBio ??
      `${input.artistName.trim()} live at ${venue}.`,
  };
}

function buildConcertUpdatePayload(input: {
  title: string;
  artistName: string;
  description: string;
  venue: string;
  startAt: string;
  status: ConcertPayload["status"];
  concert?: Concert;
}): Partial<ConcertPayload> {
  const payload = buildConcertPayload(input);

  if (input.concert?.status === "canceled") {
    const rest: Partial<ConcertPayload> = { ...payload };
    delete rest.status;
    return rest;
  }

  return payload;
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
