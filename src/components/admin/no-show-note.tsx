import { UserX } from "lucide-react";
import { cn } from "@/lib/cn";

/** "2× niet verschenen": shown wherever a decision about this customer is made. */
export function NoShowNote({ count, className }: { count: number; className?: string }) {
  return (
    <p className={cn("flex items-center gap-2 text-sm text-orange-300", className)}>
      <UserX className="size-4 shrink-0" aria-hidden />
      {count}× niet verschenen
    </p>
  );
}
