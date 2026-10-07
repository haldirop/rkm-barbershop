import { CircleAlert, CircleCheck, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const tones = {
  info: { className: "border-sky-400/25 bg-sky-400/5 text-sky-100", Icon: Info },
  success: { className: "border-emerald-400/25 bg-emerald-400/5 text-emerald-100", Icon: CircleCheck },
  warning: { className: "border-amber-400/30 bg-amber-400/5 text-amber-100", Icon: CircleAlert },
  error: { className: "border-red-400/30 bg-red-400/5 text-red-100", Icon: CircleAlert },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: keyof typeof tones;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const { className: toneClass, Icon } = tones[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-xl border px-4 py-3 text-sm", toneClass, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="opacity-90">{children}</div> : null}
      </div>
    </div>
  );
}
