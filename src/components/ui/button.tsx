import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-gold text-canvas hover:bg-gold-bright shadow-[0_8px_30px_-12px_rgba(200,169,106,0.6)]",
  secondary: "border border-line-strong text-ink hover:border-gold/60 hover:text-gold-bright",
  ghost: "text-ink-muted hover:text-ink hover:bg-surface-3",
  danger: "border border-red-400/40 text-red-300 hover:bg-red-400/10",
  success: "bg-emerald-500 text-canvas hover:bg-emerald-400",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-13 px-7 text-base gap-2.5",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(
    "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full font-semibold whitespace-nowrap transition-all duration-200 select-none",
    "disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClasses({ variant, size, className })} {...props} />;
}
