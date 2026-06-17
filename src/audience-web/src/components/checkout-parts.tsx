export function CheckoutField({
  label,
  value,
  onChange,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "tel" | "email";
  className?: string;
}): React.ReactElement {
  return (
    <label className={`grid gap-2 ${className}`}>
      <span className="text-xs font-black uppercase tracking-wide text-slate-600">{label}</span>
      <input
        required
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 border-0 border-b-2 border-ticket-stone bg-transparent px-0 text-base font-semibold outline-none transition focus:border-ticket-green"
      />
    </label>
  );
}

export function SummaryRow({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="mt-4 flex justify-between gap-4 text-sm font-bold text-slate-600">
      <span>{label}</span>
      <span className="text-ticket-obsidian">{value}</span>
    </div>
  );
}
