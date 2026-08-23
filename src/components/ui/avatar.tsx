import * as React from "react";

import { cn, initials } from "@/lib/utils";

const SIZES = {
  sm: "size-7 text-[11px]",
  default: "size-9 text-xs",
  lg: "size-11 text-sm",
} as const;

/**
 * Initials avatar. The background hue is derived from the name so the same
 * person keeps the same colour across every screen.
 */
export function Avatar({
  name,
  src,
  size = "default",
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const hue = React.useMemo(() => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 360;
    return hash;
  }, [name]);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={cn("shrink-0 rounded-full object-cover", SIZES[size], className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        SIZES[size],
        className,
      )}
      style={{
        backgroundColor: `hsl(${hue} 70% 92%)`,
        color: `hsl(${hue} 60% 32%)`,
      }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/** Overlapping stack used for crew lists on cards. */
export function AvatarGroup({ names, max = 4 }: { names: string[]; max?: number }) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;

  return (
    <div className="flex items-center -space-x-2">
      {shown.map((name, i) => (
        <Avatar key={`${name}-${i}`} name={name} size="sm" className="ring-2 ring-card" />
      ))}
      {rest > 0 && (
        <span className="inline-flex size-7 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-muted-foreground ring-2 ring-card">
          +{rest}
        </span>
      )}
    </div>
  );
}
