"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AdminButton,
  AdminField,
  AdminNotice,
  inputClassName,
} from "./admin-ui";

type AdminAuthMode = "login" | "register";

export function AdminAuthForm({
  mode,
}: {
  mode: AdminAuthMode;
}): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRegister = mode === "register";
  const [fullName, setFullName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState(
    isRegister ? "" : "organizer@ticketbox.local",
  );
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim() || !password || (isRegister && (!fullName.trim() || !organizationName.trim()))) {
      setError("Complete all required fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        isRegister ? "/api/auth/register" : "/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            isRegister
              ? { fullName, organizationName, email, password }
              : { email, password },
          ),
        },
      );

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.message ?? "Unable to authenticate.");
      }

      setMessage(
        isRegister
          ? "Organizer account created successfully."
          : "Signed in successfully.",
      );

      const nextPath = searchParams.get("next") ?? "/admin/concerts";
      router.replace(
        nextPath.startsWith("/admin") ? nextPath : "/admin/concerts",
      );
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to authenticate.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {isRegister ? (
        <>
          <AdminField label="Full name">
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className={inputClassName}
              autoComplete="name"
              minLength={2}
              maxLength={120}
              required
            />
          </AdminField>

          <AdminField label="Organization">
            <input
              type="text"
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              className={inputClassName}
              autoComplete="organization"
              minLength={2}
              maxLength={160}
              required
            />
          </AdminField>
        </>
      ) : null}

      <AdminField label="Email">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClassName}
          autoComplete="email"
          required
        />
      </AdminField>

      <AdminField label="Password">
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClassName}
          autoComplete={isRegister ? "new-password" : "current-password"}
          minLength={8}
          required
        />
      </AdminField>

      {message ? <AdminNotice tone="success">{message}</AdminNotice> : null}
      {error ? <AdminNotice tone="error">{error}</AdminNotice> : null}

      <AdminButton type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting
          ? isRegister
            ? "Creating account..."
            : "Signing in..."
          : isRegister
            ? "Create admin account"
            : "Sign in"}
      </AdminButton>

      <p className="text-sm font-bold text-slate-600">
        {isRegister ? "Already have an organizer account?" : "Need an organizer account?"}{" "}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="text-ticket-green underline-offset-4 hover:underline"
        >
          {isRegister ? "Sign in" : "Register"}
        </Link>
      </p>
    </form>
  );
}
