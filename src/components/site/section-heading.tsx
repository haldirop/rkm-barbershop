import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function SectionHeading({
  id,
  eyebrow,
  title,
  intro,
  align = "left",
  className,
}: {
  id?: string;
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      <p className={cn("eyebrow flex items-center gap-3", align === "center" && "justify-center")}>
        <span className="gold-rule" aria-hidden />
        {eyebrow}
      </p>
      <h2 id={id} className="heading-display mt-4 text-3xl leading-[1.15] sm:text-[2.75rem]">
        {title}
      </h2>
      {intro ? <p className="mt-5 text-base leading-relaxed text-ink-muted sm:text-lg">{intro}</p> : null}
    </div>
  );
}
