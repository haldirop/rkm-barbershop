import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Kassa", template: "%s · Kassa" },
  robots: { index: false, follow: false },
};

export default function KassaRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
