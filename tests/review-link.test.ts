import { describe, expect, it } from "vitest";
import { resolvePublicPath } from "@/i18n/config";
import { REVIEW_PATH, reviewTarget } from "@/lib/review-link";

const base = { businessName: "RKM Barbershop", city: "Rotterdam", googleReviewWriteUrl: null, googleReviewsUrl: null };

describe("reviewkaart: /review", () => {
  it("stuurt naar de 'review schrijven'-link als die is ingevuld", () => {
    expect(
      reviewTarget({
        ...base,
        googleReviewWriteUrl: "https://g.page/r/abc/review",
        googleReviewsUrl: "https://g.page/rkm",
      }),
    ).toBe("https://g.page/r/abc/review");
  });

  it("valt terug op de algemene Google-reviewlink", () => {
    expect(reviewTarget({ ...base, googleReviewsUrl: "https://g.page/rkm" })).toBe("https://g.page/rkm");
  });

  it("zoekt anders op Google naar de zaak", () => {
    expect(reviewTarget(base)).toBe("https://www.google.com/search?q=RKM%20Barbershop%20Rotterdam");
    expect(reviewTarget({ ...base, city: "" })).toBe("https://www.google.com/search?q=RKM%20Barbershop");
  });

  it("is in elke taal bereikbaar", () => {
    expect(resolvePublicPath(REVIEW_PATH)).toEqual({ kind: "page", locale: "nl", internal: "/nl/review" });
    expect(resolvePublicPath(`/en${REVIEW_PATH}`)).toEqual({ kind: "page", locale: "en", internal: "/en/review" });
    expect(resolvePublicPath(`/de${REVIEW_PATH}`)).toEqual({ kind: "page", locale: "de", internal: "/de/review" });
  });
});
