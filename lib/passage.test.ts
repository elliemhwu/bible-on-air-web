import { describe, expect, it } from "vitest";
import { parsePassages, passageRef } from "./passage";
import type { BibleBook } from "./types";

const book = (id: number, zh: string, abbrZh: string, chapters: number[]): BibleBook => ({ id, zh, en: "", abbrZh, abbrEn: "", chapters });
const BOOKS = [
  book(23, "以賽亞書", "賽", Array.from({ length: 66 }, (_, i) => (i === 60 ? 11 : 20))),
  book(42, "路加福音", "路", Array.from({ length: 24 }, (_, i) => (i === 3 ? 44 : 30))),
  book(43, "約翰福音", "約", Array.from({ length: 21 }, (_, i) => (i === 0 ? 51 : 30))),
  book(48, "加拉太書", "加", [24, 21, 29, 31, 26, 18]),
];
const refs = (input: string) => parsePassages(input, BOOKS).passages.map(passageRef);

describe("parsePassages", () => {
  it("reads part of a chapter, a whole chapter, and ranges across chapters", () => {
    expect(refs("約1:1-34")).toEqual(["約1:1-34"]);
    expect(refs("路4:15-21、賽61")).toEqual(["路4:15-21", "賽61:1-11"]);
    expect(refs("加1:13-2:14")).toEqual(["加1:13-2:14"]);
    expect(refs("加1-2")).toEqual(["加1:1-2:21"]);
  });

  it("takes any separator, full- or half-width, and continues the book", () => {
    for (const input of ["路4:15-21，賽61", "路4:15-21, 賽61", "路4:15-21；賽61", "路4:15-21;賽61", "路４：１５－２１ / 賽61"]) {
      expect(refs(input)).toEqual(["路4:15-21", "賽61:1-11"]);
    }
    expect(refs("加1:1-5、2:1")).toEqual(["加1:1-5", "加2:1"]);
    expect(refs("加拉太書 3")).toEqual(["加3:1-29"]);
  });

  it("explains what it cannot use", () => {
    expect(parsePassages("加3:30", BOOKS).errors).toEqual(["「加3:30」：第 3 章只有 29 節"]);
    expect(parsePassages("加7", BOOKS).errors).toEqual(["「加7」：加拉太書只有 6 章"]);
    expect(parsePassages("宣教主日", BOOKS).errors).toEqual(["看不懂「宣教主日」"]);
  });
});
