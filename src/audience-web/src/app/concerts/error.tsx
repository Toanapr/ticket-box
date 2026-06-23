"use client";

import { PageShell } from "@/components/site-shell";

export default function ConcertsError({ reset }: { error: Error; reset: () => void }): React.ReactElement {
  return (
    <PageShell>
      <section className="mx-auto max-w-xl rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <h1 className="font-display text-2xl font-black">Chưa thể tải danh sách concert</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Máy chủ đang bận hoặc tạm thời không khả dụng. Vui lòng thử lại.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 min-h-12 rounded bg-ticket-obsidian px-5 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-ticket-green"
        >
          Thử lại
        </button>
      </section>
    </PageShell>
  );
}
