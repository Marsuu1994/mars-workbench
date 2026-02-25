import { describe, it, expect } from "vitest";
import {
  getTodayDate,
  getYesterdayDate,
  sameDay,
  getMondayFromPeriodKey,
  getWeekDateRange,
  getSundayFromPeriodKey,
  normalizeForDate,
  formatShortDate,
  getISOWeekKey,
} from "../dateUtils";

// ─── getTodayDate ──────────────────────────────────────────────────────

describe("getTodayDate", () => {
  it("returns a date with zeroed time components", () => {
    const today = getTodayDate();
    expect(today.getHours()).toBe(0);
    expect(today.getMinutes()).toBe(0);
    expect(today.getSeconds()).toBe(0);
    expect(today.getMilliseconds()).toBe(0);
  });

  it("returns today's calendar date", () => {
    const now = new Date();
    const today = getTodayDate();
    expect(today.getFullYear()).toBe(now.getFullYear());
    expect(today.getMonth()).toBe(now.getMonth());
    expect(today.getDate()).toBe(now.getDate());
  });
});

// ─── getYesterdayDate ──────────────────────────────────────────────────

describe("getYesterdayDate", () => {
  it("returns the day before today at midnight", () => {
    const yesterday = getYesterdayDate();
    const today = getTodayDate();
    const diff = today.getTime() - yesterday.getTime();
    expect(diff).toBe(86400000); // exactly 24 hours in ms
  });

  it("has zeroed time components", () => {
    const yesterday = getYesterdayDate();
    expect(yesterday.getHours()).toBe(0);
    expect(yesterday.getMinutes()).toBe(0);
  });
});

// ─── sameDay ───────────────────────────────────────────────────────────

describe("sameDay", () => {
  it("returns false when first argument is null", () => {
    expect(sameDay(null, new Date(2026, 1, 23))).toBe(false);
  });

  it("returns true for same calendar date", () => {
    const a = new Date(2026, 1, 23, 10, 30);
    const b = new Date(2026, 1, 23, 22, 45);
    expect(sameDay(a, b)).toBe(true);
  });

  it("returns false for different dates", () => {
    const a = new Date(2026, 1, 23);
    const b = new Date(2026, 1, 24);
    expect(sameDay(a, b)).toBe(false);
  });

  it("ignores time components", () => {
    const a = new Date(2026, 5, 15, 23, 59, 59);
    const b = new Date(2026, 5, 15, 0, 0, 1);
    expect(sameDay(a, b)).toBe(true);
  });
});

// ─── getMondayFromPeriodKey ────────────────────────────────────────────

describe("getMondayFromPeriodKey", () => {
  it("returns Monday for 2026-W09 (Feb 23)", () => {
    const monday = getMondayFromPeriodKey("2026-W09");
    expect(monday.getFullYear()).toBe(2026);
    expect(monday.getMonth()).toBe(1); // February
    expect(monday.getDate()).toBe(23);
    expect(monday.getDay()).toBe(1); // Monday
  });

  it("returns Monday for 2026-W01 (Dec 29, 2025)", () => {
    const monday = getMondayFromPeriodKey("2026-W01");
    // ISO week 1 of 2026 starts on Dec 29, 2025
    expect(monday.getFullYear()).toBe(2025);
    expect(monday.getMonth()).toBe(11); // December
    expect(monday.getDate()).toBe(29);
    expect(monday.getDay()).toBe(1);
  });

  it("returns Monday for 2025-W01 (Dec 30, 2024)", () => {
    const monday = getMondayFromPeriodKey("2025-W01");
    expect(monday.getFullYear()).toBe(2024);
    expect(monday.getMonth()).toBe(11); // December
    expect(monday.getDate()).toBe(30);
    expect(monday.getDay()).toBe(1);
  });

  it("returns Monday for mid-year week 2026-W26", () => {
    const monday = getMondayFromPeriodKey("2026-W26");
    expect(monday.getDay()).toBe(1); // always a Monday
    expect(monday.getFullYear()).toBe(2026);
    expect(monday.getMonth()).toBe(5); // June
    expect(monday.getDate()).toBe(22);
  });

  it("handles last week of year 2026-W53", () => {
    // 2026 has 53 ISO weeks
    const monday = getMondayFromPeriodKey("2026-W53");
    expect(monday.getDay()).toBe(1);
    expect(monday.getFullYear()).toBe(2026);
    expect(monday.getMonth()).toBe(11); // December
    expect(monday.getDate()).toBe(28);
  });
});

// ─── getSundayFromPeriodKey ────────────────────────────────────────────

describe("getSundayFromPeriodKey", () => {
  it("returns Sunday (Monday + 6 days) for 2026-W09", () => {
    const sunday = getSundayFromPeriodKey("2026-W09");
    expect(sunday.getDay()).toBe(0); // Sunday
    expect(sunday.getMonth()).toBe(2); // March
    expect(sunday.getDate()).toBe(1);
  });

  it("is exactly 6 days after Monday", () => {
    const monday = getMondayFromPeriodKey("2026-W09");
    const sunday = getSundayFromPeriodKey("2026-W09");
    const diff = sunday.getTime() - monday.getTime();
    expect(diff).toBe(6 * 86400000);
  });
});

// ─── getWeekDateRange ──────────────────────────────────────────────────

describe("getWeekDateRange", () => {
  it("formats week range for 2026-W09", () => {
    const result = getWeekDateRange("2026-W09");
    expect(result).toBe("Week 09 · Feb 23 – Mar 1");
  });

  it("formats week range for 2026-W01", () => {
    const result = getWeekDateRange("2026-W01");
    expect(result).toBe("Week 01 · Dec 29 – Jan 4");
  });
});

// ─── normalizeForDate ──────────────────────────────────────────────────

describe("normalizeForDate", () => {
  it("converts UTC midnight to local midnight with same calendar date", () => {
    // Prisma returns DATE as UTC midnight: 2026-02-23T00:00:00.000Z
    const utcMidnight = new Date("2026-02-23T00:00:00.000Z");
    const normalized = normalizeForDate(utcMidnight);

    expect(normalized.getFullYear()).toBe(2026);
    expect(normalized.getMonth()).toBe(1); // Feb
    expect(normalized.getDate()).toBe(23);
    expect(normalized.getHours()).toBe(0);
    expect(normalized.getMinutes()).toBe(0);
  });

  it("preserves calendar date regardless of input timezone offset", () => {
    // Even if the input has a non-zero time, UTC date is what matters
    const d = new Date("2026-06-15T23:00:00.000Z");
    const normalized = normalizeForDate(d);
    expect(normalized.getDate()).toBe(15);
    expect(normalized.getMonth()).toBe(5); // June
  });

  it("does not mutate the original date", () => {
    const original = new Date("2026-03-10T00:00:00.000Z");
    const originalTime = original.getTime();
    normalizeForDate(original);
    expect(original.getTime()).toBe(originalTime);
  });
});

// ─── formatShortDate ───────────────────────────────────────────────────

describe("formatShortDate", () => {
  it("formats a UTC date as short string", () => {
    const d = new Date("2026-02-23T00:00:00.000Z");
    const result = formatShortDate(d);
    expect(result).toBe("Mon, Feb 23");
  });

  it("uses UTC so Prisma DATE values show correct calendar date", () => {
    // A date stored as UTC midnight should not shift to previous day
    const d = new Date("2026-03-01T00:00:00.000Z");
    const result = formatShortDate(d);
    expect(result).toContain("Mar 1");
  });
});

// ─── getISOWeekKey ─────────────────────────────────────────────────────

describe("getISOWeekKey", () => {
  it("returns correct week key for a mid-week date", () => {
    // Wednesday Feb 25, 2026 → Week 09
    expect(getISOWeekKey(new Date("2026-02-25T00:00:00.000Z"))).toBe(
      "2026-W09"
    );
  });

  it("returns correct week key for Monday", () => {
    // Monday Feb 23, 2026 → Week 09
    expect(getISOWeekKey(new Date("2026-02-23T00:00:00.000Z"))).toBe(
      "2026-W09"
    );
  });

  it("returns correct week key for Sunday", () => {
    // Sunday Mar 1, 2026 → still Week 09
    expect(getISOWeekKey(new Date("2026-03-01T00:00:00.000Z"))).toBe(
      "2026-W09"
    );
  });

  it("handles year boundary — Jan 1, 2026 falls in 2026-W01", () => {
    expect(getISOWeekKey(new Date("2026-01-01T00:00:00.000Z"))).toBe(
      "2026-W01"
    );
  });

  it("handles year boundary — Dec 31, 2025 falls in 2026-W01", () => {
    // Dec 31, 2025 is a Wednesday, which belongs to ISO week 1 of 2026
    expect(getISOWeekKey(new Date("2025-12-31T00:00:00.000Z"))).toBe(
      "2026-W01"
    );
  });

  it("handles Dec 28, 2025 which is in 2025-W52", () => {
    // Dec 28, 2025 is a Sunday → last day of ISO week 52 of 2025
    expect(getISOWeekKey(new Date("2025-12-28T00:00:00.000Z"))).toBe(
      "2025-W52"
    );
  });

  it("handles week 53 — Dec 28, 2026 is in 2026-W53", () => {
    // 2026 has 53 ISO weeks. Dec 28 is Monday of W53.
    expect(getISOWeekKey(new Date("2026-12-28T00:00:00.000Z"))).toBe(
      "2026-W53"
    );
  });

  it("pads single-digit week numbers", () => {
    expect(getISOWeekKey(new Date("2026-01-05T00:00:00.000Z"))).toBe(
      "2026-W02"
    );
  });

  it("does not mutate the input date", () => {
    const original = new Date("2026-06-15T12:30:00.000Z");
    const originalTime = original.getTime();
    getISOWeekKey(original);
    expect(original.getTime()).toBe(originalTime);
  });
});
