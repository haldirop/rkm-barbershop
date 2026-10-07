import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { STATUS_META, type AppointmentStatus } from "@/lib/status";

export function Badge({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset",
        className,
      )}
      {...props}
    />
  );
}

export function StatusBadge({ status, className }: { status: AppointmentStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <Badge className={cn(meta.badge, className)}>
      <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden />
      {meta.label}
    </Badge>
  );
}

export function DemoBadge() {
  return (
    <Badge
      className="bg-fuchsia-400/10 text-fuchsia-300 ring-fuchsia-400/30"
      title="Voorbeelddata, geen echte klant"
    >
      Demo
    </Badge>
  );
}
