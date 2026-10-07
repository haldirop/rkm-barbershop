import type { MetadataRoute } from "next";
import { siteUrl } from "@/server/services/settings";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/afspraak/", "/api/"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
