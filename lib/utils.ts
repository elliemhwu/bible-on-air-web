import { VerseRange } from "./types";

/** Parses a "YYYY-MM-DD" string into a local Date, avoiding UTC-offset shift. */
export function toDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Serialises a Date to "YYYY-MM-DD" using local time. */
export function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

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
