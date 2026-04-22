import { VerseBlock } from "./types";

export function formatVerseRef(range: VerseBlock["content"]["range"]): string {
  const { book, chapterStart, verseStart, chapterEnd, verseEnd } = range;
  if (chapterEnd !== undefined && verseEnd !== undefined) {
    if (chapterEnd !== chapterStart) {
      return `${book} ${chapterStart}:${verseStart}–${chapterEnd}:${verseEnd}`;
    }
    if (verseEnd !== verseStart) {
      return `${book} ${chapterStart}:${verseStart}–${verseEnd}`;
    }
  }
  return `${book} ${chapterStart}:${verseStart}`;
}
