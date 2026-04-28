import { VerseRange } from "./types";

function formatSingleRange(range: VerseRange, includeBook: boolean): string {
  const { zh, chapterStart, verseStart, chapterEnd, verseEnd } = range;
  const loc =
    chapterEnd !== undefined && verseEnd !== undefined
      ? chapterEnd !== chapterStart
        ? `${chapterStart}:${verseStart}–${chapterEnd}:${verseEnd}`
        : verseEnd !== verseStart
          ? `${chapterStart}:${verseStart}–${verseEnd}`
          : `${chapterStart}:${verseStart}`
      : `${chapterStart}:${verseStart}`;
  return includeBook ? `${zh} ${loc}` : loc;
}

export function formatVerseRef(ranges: VerseRange[]): string {
  const result: string[] = [];
  for (let i = 0; i < ranges.length; i++) {
    const sameBook = i > 0 && ranges[i].zh === ranges[i - 1].zh;
    const text = formatSingleRange(ranges[i], !sameBook);
    if (i === 0) result.push(text);
    else if (sameBook) result.push(`、${text}`);
    else result.push(`；${text}`);
  }
  return result.join("");
}
