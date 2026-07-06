import Image from "next/image";
import type { PaymentMethod } from "@/lib/types";

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
      <span className="text-xs font-black uppercase tracking-wide text-slate-600">
        {label}
      </span>
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

const paymentOptions: Array<{
  value: PaymentMethod;
  name: string;
  description: string;
  logoSrc: string;
  logoClassName: string;
  accentClassName: string;
}> = [
  {
    value: "VNPAY",
    name: "VNPAY",
    description: "QR, ATM nội địa, thẻ ngân hàng",
    logoSrc: "/payment-logos/vnpay.svg",
    logoClassName: "h-16 w-full object-contain p-3",
    accentClassName: "from-sky-50 via-white to-red-50",
  },
];

export function PaymentMethodSelector({
  value,
  disabled,
  onChange,
}: {
  value: PaymentMethod;
  disabled: boolean;
  onChange: (value: PaymentMethod) => void;
}): React.ReactElement {
  return (
    <div className="mt-5 grid gap-4">
      {paymentOptions.map((option) => {
        const selected = value === option.value;
        return (
          <label
            key={option.value}
            className={`group relative grid min-h-40 cursor-pointer overflow-hidden rounded-lg border bg-gradient-to-br p-5 transition focus-within:ring-2 focus-within:ring-ticket-green focus-within:ring-offset-2 ${
              option.accentClassName
            } ${
              selected
                ? "border-ticket-green shadow-[5px_5px_0_#16a34a]"
                : "border-black/10 hover:-translate-y-0.5 hover:border-ticket-obsidian hover:shadow-[3px_3px_0_#0d1118]"
            } ${disabled ? "cursor-not-allowed opacity-60 hover:translate-y-0 hover:shadow-none" : ""}`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value={option.value}
              checked={selected}
              disabled={disabled}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span
              className={`absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full border ${
                selected
                  ? "border-ticket-green bg-ticket-green"
                  : "border-black/20 bg-white"
              }`}
              aria-hidden="true"
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${selected ? "bg-white" : "bg-transparent"}`}
              />
            </span>
            <span className="grid gap-4">
              <span className="grid h-20 w-full place-items-center rounded bg-white/85 px-4 ring-1 ring-black/5">
                <Image
                  src={option.logoSrc}
                  alt={`${option.name} logo`}
                  width={150}
                  height={64}
                  className={option.logoClassName}
                />
              </span>
              <span className="grid gap-1">
                <span className="font-display text-lg font-black text-ticket-obsidian">
                  {option.name}
                </span>
                <span className="text-sm font-semibold leading-6 text-slate-600">
                  {option.description}
                </span>
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

export function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <div className="mt-4 flex justify-between gap-4 text-sm font-bold text-slate-600">
      <span>{label}</span>
      <span className="text-ticket-obsidian">{value}</span>
    </div>
  );
}
