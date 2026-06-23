"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("organizer@ticketbox.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? "Unable to sign in.");
      }

      const nextPath = searchParams.get("next") ?? "/admin/concerts";
      router.replace(
        nextPath.startsWith("/admin") ? nextPath : "/admin/concerts",
      );
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-950 shadow-sm outline-none focus:border-emerald-600"
          autoComplete="email"
          required
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-950 shadow-sm outline-none focus:border-emerald-600"
          autoComplete="current-password"
          required
        />
      </label>

      {error ? (
        <p className="text-sm font-medium text-red-700">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-11 w-full rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
