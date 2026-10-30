import { describe, expect, it } from "vitest";
import { parseSheet } from "./plan-sheet";

describe("parseSheet", () => {
  it("reads tab-separated rows, keyed by the Monday of the given day", () => {
    const rows = parseSheet(
      ["日期\t主題\t經文\t一", "10/30\t警醒預備\t太24\t太24:1-14\t太24:15-28\t\t\t\t帖前5:1-11"].join("\n"),
      2026,
    );
    expect(rows).toEqual([
      {
        weekStart: "2026-10-26",
        sundayTheme: "警醒預備",
        sundayPassage: "太24",
        days: [
          { ref: "太24:1-14" },
          { ref: "太24:15-28" },
          { ref: "" },
          { ref: "" },
          { ref: "" },
          { ref: "帖前5:1-11" },
        ],
      },
    ]);
  });

  it("accepts comma-separated rows with a full date and marks overview days", () => {
    const [row] = parseSheet("2026/5/18,,太1,馬太福音（鳥瞰）", 2026);
    expect(row.weekStart).toBe("2026-05-18");
    expect(row.sundayTheme).toBeNull();
    expect(row.days[0]).toEqual({ ref: "馬太福音", overview: true });
  });
});
