"use client";

import { useId, useTransition } from "react";
import { useScannerAppState } from "@/lib/scanner/state";

export function ScannerConnectionForm() {
  const { connectionConfig, setConnectionConfig, setError } = useScannerAppState();
  const [isPending, startTransition] = useTransition();
  const formId = useId();

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await setConnectionConfig({
          accessToken: String(formData.get("accessToken") ?? "").trim(),
          deviceId: String(formData.get("deviceId") ?? "").trim(),
          baseUrl: String(formData.get("baseUrl") ?? "").trim(),
        });
        setError(null);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to save scanner connection settings.",
        );
      }
    });
  }

  return (
    <form
      key={`${connectionConfig?.deviceId ?? "new"}:${connectionConfig?.baseUrl ?? "default"}`}
      id={formId}
      action={handleSubmit}
      className="rounded-3xl border border-line bg-surface-strong p-5"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Connection
          </p>
          <h3 className="mt-2 text-lg font-semibold">Scanner backend profile</h3>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Save profile"}
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <Field
          label="Bearer token"
          name="accessToken"
          defaultValue={connectionConfig?.accessToken ?? ""}
          placeholder="scanner:scanner-user-01"
          type="password"
        />
        <Field
          label="Device id"
          name="deviceId"
          defaultValue={connectionConfig?.deviceId ?? ""}
          placeholder="device-uuid"
        />
        <Field
          label="Scanner API base URL"
          name="baseUrl"
          defaultValue={
            connectionConfig?.baseUrl ??
            process.env.NEXT_PUBLIC_SCANNER_API_BASE_URL?.trim() ??
            "http://localhost:3000/scanner"
          }
          placeholder="http://localhost:3000/scanner"
        />
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        {label}
      </span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-line bg-white/90 px-4 py-3 text-sm outline-none ring-0 transition placeholder:text-stone-400 focus:border-accent"
      />
    </label>
  );
}
