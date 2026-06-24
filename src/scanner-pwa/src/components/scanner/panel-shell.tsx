import type { ReactNode } from "react";

export function PanelShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">{description}</p>
      </div>
      {children}
    </div>
  );
}
