"use client";

import Image from "next/image";
import { useState } from "react";

export function ConcertPoster({
  src,
  title,
  sizes,
  priority = false,
  compact = false,
}: {
  src?: string;
  title: string;
  sizes: string;
  priority?: boolean;
  compact?: boolean;
}): React.ReactElement {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (shouldShowPoster(src, failedSrc)) {
    return (
      <Image
        src={src}
        alt={`${title} poster`}
        fill
        priority={priority}
        sizes={sizes}
        className="object-cover"
        onError={() => setFailedSrc(src)}
      />
    );
  }

  return (
    <div
      className={`absolute inset-0 grid place-items-center bg-[linear-gradient(145deg,#111315,#23352c)] text-center text-white ${compact ? "p-2" : "p-6"}`}
    >
      <div>
        <div
          className={`${compact ? "text-[7px] tracking-wider" : "text-xs tracking-[0.25em]"} font-black uppercase text-ticket-green`}
        >
          TicketBox Concert
        </div>
        <div
          className={`${compact ? "mt-1 line-clamp-3 text-[9px]" : "mt-3 text-xl"} font-display font-black uppercase leading-tight`}
        >
          {title}
        </div>
      </div>
    </div>
  );
}

export function shouldShowPoster(
  src: string | undefined,
  failedSrc: string | null,
): src is string {
  return Boolean(src && src !== failedSrc);
}
