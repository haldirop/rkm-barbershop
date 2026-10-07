import type { MetadataRoute } from "next";
import { siteUrl } from "@/server/services/settings";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/afspraak-maken`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/behandelingen`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
