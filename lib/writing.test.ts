import { describe, expect, it } from "vitest";
import { keysToRanges, rangeLabel, verseKey } from "./writing";

const k = (chapter: number, verse: number) => verseKey({ chapter, verse });

describe("rangeLabel", () => {
  it("describes the whole passage when nothing is selected", () => {
    expect(rangeLabel([])).toBe("整段經文");
  });

  it("joins runs within one chapter", () => {
    expect(rangeLabel([k(24, 47), k(24, 45), k(24, 46), k(24, 49)])).toBe("45–47、49節");
  });

  it("names chapters when a selection spans two", () => {
    expect(rangeLabel([k(24, 51), k(25, 1)])).toBe("24:51、25:1");
  });
});

describe("keysToRanges", () => {
  it("turns verse runs into stored ranges", () => {
    expect(keysToRanges("太", [k(24, 45), k(24, 46), k(24, 50)])).toEqual([
      { abbrZh: "太", chapterStart: 24, verseStart: 45, chapterEnd: 24, verseEnd: 46 },
      { abbrZh: "太", chapterStart: 24, verseStart: 50 },
    ]);
  });
});
