import { describe, expect, it } from "vitest";
import { cn } from "@/lib/cn";

describe("cn", () => {
  it("lets later classes override conflicting ones", () => {
    expect(cn("inline-flex bg-gold hover:bg-gold-bright", "hidden sm:inline-flex bg-amber-400 hover:bg-amber-300")).toBe(
      "hidden sm:inline-flex bg-amber-400 hover:bg-amber-300",
    );
  });

  it("keeps font size and colour from the design tokens apart", () => {
    expect(cn("text-sm text-canvas", "text-ink")).toBe("text-sm text-ink");
    expect(cn("text-[15px] text-ink-muted", "text-gold")).toBe("text-[15px] text-gold");
  });
});
