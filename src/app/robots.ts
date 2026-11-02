import type { MetadataRoute } from "next";
import { siteUrl } from "@/server/services/settings";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Personal appointment pages (in every language) stay out of search engines.
      disallow: ["/admin", "/kassa", "/afspraak/", "/en/appointment/", "/de/termin/", "/api/"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
