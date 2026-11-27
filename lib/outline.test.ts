import { describe, expect, it } from "vitest";
import { formatOutlineRange, isEmptyOutline, parseOutlineText, parseRangeInput, rangeProblem, sectionNumber } from "./outline";

const MATTHEW_CHAPTERS = [25, 23, 17, 25, 48, 34, 29, 34, 38, 42, 30, 50, 58, 36, 39, 28, 27, 35, 30, 34, 46, 46, 39, 51, 46, 75, 66, 20];

describe("outline helpers", () => {
  it("parses pasted text into sections and items", () => {
    const outline = parseOutlineText(
      [
        "一、 引言：君王的宣告與預備 (1:1 - 4:11)",
        "• 1:1 - 2:23 ｜ 耶穌基督的家譜、降生與童年",
        "二、 加利利的事工 (4:12 - 13:52)",
        "4:12 - 4:25 ｜ 開始傳道",
      ].join("\n"),
      "太",
    );
    expect(outline).toEqual({
      book: "太",
      sections: [
        {
          title: "引言：君王的宣告與預備",
          range: { chapterStart: 1, verseStart: 1, chapterEnd: 4, verseEnd: 11 },
          items: [{ range: { chapterStart: 1, verseStart: 1, chapterEnd: 2, verseEnd: 23 }, text: "耶穌基督的家譜、降生與童年" }],
        },
        {
          title: "加利利的事工",
          range: { chapterStart: 4, verseStart: 12, chapterEnd: 13, verseEnd: 52 },
          items: [{ range: { chapterStart: 4, verseStart: 12, chapterEnd: 4, verseEnd: 25 }, text: "開始傳道" }],
        },
      ],
    });
  });

  it("does not take prose for an outline", () => {
    expect(parseOutlineText("這卷書很重要。\n作者是馬太。")).toBeNull();
  });

  it("reads and writes range inputs", () => {
    expect(parseRangeInput("26:1-75")).toEqual({ chapterStart: 26, verseStart: 1, chapterEnd: 26, verseEnd: 75 });
    expect(parseRangeInput("26:1-75 最後晚餐")).toBeNull();
    expect(formatOutlineRange({ chapterStart: 26, verseStart: 1, chapterEnd: 26, verseEnd: 75 })).toBe("26:1 - 75");
  });

  it("checks a range against the book", () => {
    expect(rangeProblem(parseRangeInput("1:1-4:11")!, MATTHEW_CHAPTERS)).toBeNull();
    expect(rangeProblem(parseRangeInput("28:1-28:21")!, MATTHEW_CHAPTERS)).toBe("第 28 章只有 20 節");
    expect(rangeProblem(parseRangeInput("29:1")!, MATTHEW_CHAPTERS)).toBe("這卷書只有 28 章");
    expect(rangeProblem(parseRangeInput("4:11-1:1")!, MATTHEW_CHAPTERS)).toBe("結束在開始之前");
  });

  it("numbers sections and spots empty outlines", () => {
    expect(sectionNumber(10)).toBe("十一");
    expect(isEmptyOutline({ book: "太", sections: [{ title: " ", range: null, items: [] }] })).toBe(true);
    expect(isEmptyOutline({ book: "太", sections: [{ title: "引言", range: null, items: [] }] })).toBe(false);
  });
});
