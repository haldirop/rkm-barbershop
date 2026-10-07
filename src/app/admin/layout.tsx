import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Beheer", template: "%s · Beheer" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
