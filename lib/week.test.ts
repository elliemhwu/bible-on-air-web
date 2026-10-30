import { describe, expect, it } from "vitest";
import { addDays, dateRuns, localDay, md, mondayOf, mondaysOfYear, weekDays, weekLabel } from "./week";

describe("week helpers", () => {
  it("treats Sunday as the end of the week before", () => {
    expect(mondayOf("2026-10-30")).toBe("2026-10-26"); // Friday
    expect(mondayOf("2026-11-01")).toBe("2026-10-26"); // Sunday
    expect(mondayOf("2026-11-02")).toBe("2026-11-02"); // Monday
  });

  it("does date arithmetic across month and year ends", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-28", 7)).toBe("2027-01-04");
  });

  it("lists the six devotion days of a week", () => {
    expect(weekDays("2026-10-26")).toEqual([
      "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31",
    ]);
    expect(weekLabel("2026-10-26")).toBe("10/26 – 10/31");
    expect(md("2026-01-05")).toBe("1/5");
  });

  it("lists the Mondays that fall in a year", () => {
    const mondays = mondaysOfYear(2026);
    expect(mondays[0]).toBe("2026-01-05");
    expect(mondays.at(-1)).toBe("2026-12-28");
    expect(mondays).toHaveLength(52);
  });

  it("reads timestamps as Taipei calendar days", () => {
    expect(localDay("2026-10-29T23:30:00Z")).toBe("2026-10-30");
  });

  it("groups assigned days into runs, bridging Sundays", () => {
    expect(dateRuns(["2026-12-09", "2026-12-07", "2026-12-08", "2026-12-12", "2026-12-14"])).toEqual([
      { from: "2026-12-07", to: "2026-12-09", count: 3 },
      { from: "2026-12-12", to: "2026-12-14", count: 2 },
    ]);
  });
});
