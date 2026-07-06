import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { CheckIcon, TicketIcon, UsersIcon } from "@/components/icons";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-5 py-10 md:px-10">
      <section className="grid w-full gap-8 lg:grid-cols-[1.1fr_420px] lg:items-start">
        <div className="rounded-lg border border-ticket-obsidian bg-white p-6 shadow-[6px_6px_0_#0d1118] md:p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-ticket-green/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-ticket-green">
            <UsersIcon className="h-4 w-4" />
            Organizer access
          </div>
          <h1 className="mt-5 font-display text-3xl font-black tracking-tight md:text-4xl">
            TicketBox Admin
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
            Sign in with an organizer account to manage concerts, ticket types,
            guest lists, and operational notifications.
          </p>
          <div className="mt-8">
            <Suspense>
              <LoginForm />
            </Suspense>
          </div>
        </div>

        <aside className="rounded-lg border border-black/10 bg-ticket-obsidian p-6 text-white md:p-8">
          <TicketIcon className="h-10 w-10 text-ticket-green" />
          <h2 className="mt-5 font-display text-2xl font-black">
            Same product family, tuned for admin workflows.
          </h2>
          <div className="mt-6 grid gap-4 text-sm leading-6 text-slate-200">
            <LoginBenefit text="Review concert readiness, publish inventory, and keep timelines visible." />
            <LoginBenefit text="Manage ticket types and guest list imports without leaving the admin workspace." />
            <LoginBenefit text="Track delivery notifications and preserve the same TicketBox interaction style." />
          </div>
        </aside>
      </section>
    </main>
  );
}

function LoginBenefit({ text }: { text: string }): React.ReactElement {
  return (
    <div className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ticket-green/15 text-ticket-green">
        <CheckIcon className="h-4 w-4" />
      </span>
      <span>{text}</span>
    </div>
  );
}
