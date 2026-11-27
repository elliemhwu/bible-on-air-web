import type { BibleBook } from "@/lib/types";

/** One continuous stretch of a book: chapter:verse to chapter:verse */
export type Passage = {
  book: BibleBook;
  from: { chapter: number; verse: number };
  to: { chapter: number; verse: number };
};

/** Passages are separated by 、，,；; (full- or half-width) or a slash */
export const PASSAGE_SEPARATORS = /[、，,；;／/]+/;

const FULL_WIDTH: Record<string, string> = { "：": ":", "－": "-", "–": "-", "—": "-", "~": "-", "～": "-", "至": "-" };

function normalize(text: string): string {
  return text
    .replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
    .replace(/[：－–—~～至]/g, (c) => FULL_WIDTH[c])
    .trim();
}

// [book] chapter [:verse] [- [chapter:] verse | - chapter]
const PIECE_RE = /^(\D*?)\s*(\d+)(?::(\d+))?(?:\s*-\s*(?:(\d+):)?(\d+))?$/;

export type PassageResult = { passages: Passage[]; errors: string[] };

/**
 * "路4:15-21、賽61", "約1:1-34", "加1:13-2:14", "羅3:19-24; 4:1-8".
 * A piece without a book continues the book before it. A bare chapter (or
 * chapters, "加1-2") means the whole of it.
 */
export function parsePassages(input: string, books: BibleBook[]): PassageResult {
  const passages: Passage[] = [];
  const errors: string[] = [];
  let book: BibleBook | null = null;

  for (const raw of input.split(PASSAGE_SEPARATORS)) {
    const piece = normalize(raw);
    if (!piece) continue;
    const m = piece.match(PIECE_RE);
    const named = m?.[1].trim();
    if (named) book = books.find((b) => b.abbrZh === named || b.zh === named) ?? null;
    if (!m || !book) {
      errors.push(`看不懂「${raw.trim()}」`);
      continue;
    }
    const [, , c1, v1, c2, v2] = m;
    const chapterStart = Number(c1);
    const from = { chapter: chapterStart, verse: v1 ? Number(v1) : 1 };
    let to: Passage["to"];
    if (v1) {
      // 1:5 / 1:5-9 / 1:5-2:3
      const chapterEnd = c2 ? Number(c2) : chapterStart;
      to = { chapter: chapterEnd, verse: v2 ? Number(v2) : Number(v1) };
    } else {
      // 61 / 1-2 (whole chapters)
      const chapterEnd = v2 && !c2 ? Number(v2) : chapterStart;
      to = { chapter: chapterEnd, verse: book.chapters[chapterEnd - 1] ?? 0 };
    }
    const problem = rangeProblem(book, from, to);
    if (problem) {
      errors.push(`「${raw.trim()}」${problem}`);
      continue;
    }
    passages.push({ book, from, to });
  }
  return { passages, errors };
}

function rangeProblem(book: BibleBook, from: Passage["from"], to: Passage["to"]): string | null {
  for (const p of [from, to]) {
    const verses = book.chapters[p.chapter - 1];
    if (!verses) return `：${book.zh}只有 ${book.chapters.length} 章`;
    if (p.verse < 1 || p.verse > verses) return `：第 ${p.chapter} 章只有 ${verses} 節`;
  }
  if (to.chapter < from.chapter || (to.chapter === from.chapter && to.verse < from.verse)) return "：結束在開始之前";
  return null;
}

/** "賽61:1-11", "加1:13-2:14", "可1:14" */
export function passageRef(p: Passage): string {
  const { from, to } = p;
  const start = `${p.book.abbrZh}${from.chapter}:${from.verse}`;
  if (from.chapter !== to.chapter) return `${start}-${to.chapter}:${to.verse}`;
  return from.verse === to.verse ? start : `${start}-${to.verse}`;
}
