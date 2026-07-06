"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteConcert } from "@/lib/api";
import { AdminButton } from "./admin-ui";

export function DeleteConcertButton({
  concertId,
  concertTitle,
}: {
  concertId: string;
  concertTitle: string;
}): React.ReactElement {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete concert \"${concertTitle}\"? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await deleteConcert(concertId);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to delete concert.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-2">
      <AdminButton
        type="button"
        variant="danger"
        className="min-h-11 px-4"
        onClick={handleDelete}
        disabled={isDeleting}
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </AdminButton>
      {error ? <p className="max-w-48 text-xs font-bold text-red-700">{error}</p> : null}
    </div>
  );
}
