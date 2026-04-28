import { VerseRange } from "./types";

export function formatVerseRef(ranges: VerseRange[]): string {
  const rangeTexts = ranges.map((range) => {
    const { zh, chapterStart, verseStart, chapterEnd, verseEnd } = range;
    if (chapterEnd !== undefined && verseEnd !== undefined) {
      if (chapterEnd !== chapterStart) {
        return `${zh} ${chapterStart}:${verseStart}–${chapterEnd}:${verseEnd}`;
      }
      if (verseEnd !== verseStart) {
        return `${zh} ${chapterStart}:${verseStart}–${verseEnd}`;
      }
    }
    return `${zh} ${chapterStart}:${verseStart}`;
  });

  return rangeTexts.join("；");
}
