import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LOGIN_WINDOW_MINUTES, latest, lockedState, withAttemptsLeft } from "@/server/auth/login-limit";
import { clearHits, hitsInWindow, recordHit, unlockTime } from "@/server/auth/rate-limit";
import { openDatabase, setDb, type DatabaseHandle } from "@/server/db/client";

const at = (minutes: number) => new Date(Date.UTC(2026, 10, 16, 13, 0) + minutes * 60_000);

describe("when logging in is possible again", () => {
  it("is not locked below the limit", () => {
    expect(unlockTime([at(0), at(1), at(2), at(3)], 5, 15)).toBeNull();
  });

  it("unlocks 15 minutes after the oldest of the last five wrong passwords", () => {
    expect(unlockTime([at(3), at(0), at(4), at(1), at(2)], 5, 15)).toEqual(at(15));
    // Six hits: the second-oldest must leave the window too.
    expect(unlockTime([at(0), at(1), at(2), at(3), at(4), at(5)], 5, 15)).toEqual(at(16));
  });

  it("takes the latest of the address and network locks", () => {
    expect(latest([null, at(5), at(2)])).toEqual(at(5));
    expect(latest([null, null])).toBeNull();
  });
});

describe("messages", () => {
  it("says the time in the Netherlands and how long that is", () => {
    // 13:00 UTC is 14:00 in Amsterdam in November.
    const state = lockedState(at(12), at(0));
    expect(state.error).toBe("Te veel mislukte pogingen. Je kunt weer inloggen om 14:12 (over 12 minuten).");
    expect(state.retryAfterSeconds).toBe(720);
    expect(lockedState(at(0.5), at(0)).error).toContain("(over 1 minuut)");
  });

  it("warns before the last two attempts only", () => {
    const wrong = "Onjuist e-mailadres of wachtwoord.";
    expect(withAttemptsLeft(wrong, 3)).toBe(wrong);
    expect(withAttemptsLeft(wrong, 2)).toBe(`${wrong} Nog 2 pogingen, daarna kun je ${LOGIN_WINDOW_MINUTES} minuten niet inloggen.`);
    expect(withAttemptsLeft(wrong, 1)).toContain("Nog 1 poging,");
    expect(withAttemptsLeft(wrong, 0)).toBe(wrong);
  });
});

describe("stored wrong passwords", () => {
  let handle: DatabaseHandle;

  beforeAll(async () => {
    handle = openDatabase({ kind: "pglite", dataDir: undefined });
    await handle.migrate();
    setDb(handle.db);
  });

  afterAll(async () => {
    await handle.close();
  });

  it("locks after five, and a new password via the e-mail link lifts it", async () => {
    const key = "login:email:eigenaar@example.com";
    for (let i = 0; i < 4; i++) await recordHit(key);
    expect(unlockTime(await hitsInWindow(key, 15), 5, 15)).toBeNull();

    await recordHit(key);
    const until = unlockTime(await hitsInWindow(key, 15), 5, 15);
    expect(until).not.toBeNull();
    const minutes = (until!.getTime() - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(14);
    expect(minutes).toBeLessThanOrEqual(15);

    // Another address is not affected.
    expect(await hitsInWindow("login:email:iemand-anders@example.com", 15)).toEqual([]);

    await clearHits(key);
    expect(unlockTime(await hitsInWindow(key, 15), 5, 15)).toBeNull();
  });
});
