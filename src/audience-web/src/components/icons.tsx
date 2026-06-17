import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function TicketIcon(props: IconProps): React.ReactElement {
  return (
    <IconBase {...props}>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v2a2.5 2.5 0 0 0 0 5v2A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-2a2.5 2.5 0 0 0 0-5z" />
      <path d="M15 5v14" />
      <path d="M15 9v.01" />
      <path d="M15 15v.01" />
    </IconBase>
  );
}

export function CalendarIcon(props: IconProps): React.ReactElement {
  return (
    <IconBase {...props}>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </IconBase>
  );
}

export function MapPinIcon(props: IconProps): React.ReactElement {
  return (
    <IconBase {...props}>
      <path d="M12 21s7-5.1 7-11a7 7 0 1 0-14 0c0 5.9 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </IconBase>
  );
}

export function SearchIcon(props: IconProps): React.ReactElement {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </IconBase>
  );
}

export function ArrowRightIcon(props: IconProps): React.ReactElement {
  return (
    <IconBase {...props}>
      <path d="M5 12h14" />
      <path d="m13 5 7 7-7 7" />
    </IconBase>
  );
}

export function UsersIcon(props: IconProps): React.ReactElement {
  return (
    <IconBase {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </IconBase>
  );
}

export function LayersIcon(props: IconProps): React.ReactElement {
  return (
    <IconBase {...props}>
      <path d="m12 2 9 5-9 5-9-5 9-5z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 17 9 5 9-5" />
    </IconBase>
  );
}

export function InfoIcon(props: IconProps): React.ReactElement {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </IconBase>
  );
}

export function CreditCardIcon(props: IconProps): React.ReactElement {
  return (
    <IconBase {...props}>
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <path d="M2 10h20" />
    </IconBase>
  );
}

export function QrIcon(props: IconProps): React.ReactElement {
  return (
    <IconBase {...props}>
      <rect width="5" height="5" x="3" y="3" />
      <rect width="5" height="5" x="16" y="3" />
      <rect width="5" height="5" x="3" y="16" />
      <path d="M16 16h2v2h-2z" />
      <path d="M21 16v5h-5" />
      <path d="M12 7v5h5" />
      <path d="M12 17h.01" />
    </IconBase>
  );
}

export function CheckIcon(props: IconProps): React.ReactElement {
  return (
    <IconBase {...props}>
      <path d="M20 6 9 17l-5-5" />
    </IconBase>
  );
}

export function AlertIcon(props: IconProps): React.ReactElement {
  return (
    <IconBase {...props}>
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </IconBase>
  );
}

export function PrinterIcon(props: IconProps): React.ReactElement {
  return (
    <IconBase {...props}>
      <path d="M6 9V2h12v7" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 14h12v8H6z" />
    </IconBase>
  );
}
