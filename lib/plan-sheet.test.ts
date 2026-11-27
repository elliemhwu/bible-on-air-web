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

  it("reads one row per day, matching month/day dates to the weekday column", () => {
    const rows = parseSheet(
      [
        "主題\t日期\t禮拜幾\t經文\t經文段落\t寫作認領",
        "\t12月29日\t星期一\t加拉太書鳥瞰\t\t仲甫",
        "\t12月30日\t星期二\t加1:1-5\t\t冠力",
        "春節連假\t12月31日\t星期三\t1:6-10\t\t冠力",
        "\t1月2日\t星期五\t徒9:1-9\t\t虹麗",
        "福音的生命與身分1\t1月4日\t星期日\t加1:1-12",
        "\t1月5日\t星期一\t\t\t",
      ].join("\n"),
      2026,
    );
    expect(rows).toEqual([
      {
        weekStart: "2025-12-29",
        sundayTheme: "福音的生命與身分1",
        sundayPassage: "加1:1-12",
        note: "春節連假",
        days: [
          { ref: "加拉太書", overview: true },
          { ref: "加1:1-5" },
          { ref: "加1:6-10" },
          { ref: "" },
          { ref: "徒9:1-9" },
          { ref: "" },
        ],
      },
    ]);
  });

  it("finds the day layout without a header", () => {
    const [row] = parseSheet("2026/5/18\t星期一\t馬太福音鳥瞰\t仲甫", 2026);
    expect(row.weekStart).toBe("2026-05-18");
    expect(row.days[0]).toEqual({ ref: "馬太福音", overview: true });
  });

  it("accepts comma-separated rows with a full date and marks overview days", () => {
    const [row] = parseSheet("2026/5/18,,太1,馬太福音（鳥瞰）", 2026);
    expect(row.weekStart).toBe("2026-05-18");
    expect(row.sundayTheme).toBeNull();
    expect(row.days[0]).toEqual({ ref: "馬太福音", overview: true });
  });
});
