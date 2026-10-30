import type { OutlineContent, OutlineRange, OutlineSection } from "@/lib/types";

const DASH = "[-–—~－～]";
/** "1:1 - 4:11", "13:53 - 17:27", "4:12-25" or a single "5:1" */
const RANGE_RE = new RegExp(`^(\\d+):(\\d+)(?:\\s*${DASH}\\s*(?:(\\d+):)?(\\d+))?`);
const NUMBERING_RE = /^[一二三四五六七八九十百]+\s*[、.．]\s*/;
const SEPARATOR_RE = /^\s*[｜|：:、]?\s*/;
const NUMERALS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

/** Reads a range at the start of `text`; returns it with the rest of the text */
export function parseOutlineRange(text: string): { range: OutlineRange; rest: string } | null {
  const m = text.trim().match(RANGE_RE);
  if (!m) return null;
  const chapterStart = Number(m[1]);
  const verseStart = Number(m[2]);
  return {
    range: {
      chapterStart,
      verseStart,
      chapterEnd: m[3] ? Number(m[3]) : chapterStart,
      verseEnd: m[4] ? Number(m[4]) : verseStart,
    },
    rest: text.trim().slice(m[0].length),
  };
}

/** Exactly a range and nothing else ("" → null) */
export function parseRangeInput(text: string): OutlineRange | null {
  const parsed = parseOutlineRange(text);
  return parsed && !parsed.rest.trim() ? parsed.range : null;
}

/** "1:1 - 4:11", "4:12 - 25", or "5:1" */
export function formatOutlineRange(r: OutlineRange): string {
  if (r.chapterStart === r.chapterEnd && r.verseStart === r.verseEnd) return `${r.chapterStart}:${r.verseStart}`;
  const end = r.chapterStart === r.chapterEnd ? `${r.verseEnd}` : `${r.chapterEnd}:${r.verseEnd}`;
  return `${r.chapterStart}:${r.verseStart} - ${end}`;
}

/** Why a range does not fit the book (chapters[i] = verse count of chapter i+1), or null */
export function rangeProblem(r: OutlineRange, chapters: number[] | undefined): string | null {
  const start = r.chapterStart * 1000 + r.verseStart;
  const end = r.chapterEnd * 1000 + r.verseEnd;
  if (end < start) return "結束在開始之前";
  if (!chapters) return null;
  for (const [c, v] of [[r.chapterStart, r.verseStart], [r.chapterEnd, r.verseEnd]]) {
    if (c < 1 || c > chapters.length) return `這卷書只有 ${chapters.length} 章`;
    if (v < 1 || v > chapters[c - 1]) return `第 ${c} 章只有 ${chapters[c - 1]} 節`;
  }
  return null;
}

/** Section numbers as on the old site: 一、二、… 十、十一、… */
export function sectionNumber(i: number): string {
  const n = i + 1;
  if (n <= 10) return NUMERALS[n - 1];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return `${tens > 1 ? NUMERALS[tens - 1] : ""}十${ones ? NUMERALS[ones - 1] : ""}`;
}

/**
 * Text pasted from a document, one line per heading or item:
 *   一、 引言：君王的宣告與預備 (1:1 - 4:11)
 *   1:1 - 2:23 ｜ 耶穌基督的家譜、降生與童年
 * Returns null when nothing in it looks like an outline.
 */
export function parseOutlineText(text: string, book = ""): OutlineContent | null {
  const sections: OutlineSection[] = [];
  let found = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^[\s•·\-*]+/, "").replace(/\s+/g, " ").trim();
    if (!line) continue;
    const item = parseOutlineRange(line);
    if (item) {
      if (sections.length === 0) sections.push({ title: "", range: null, items: [] });
      sections[sections.length - 1].items.push({ range: item.range, text: item.rest.replace(SEPARATOR_RE, "").trim() });
      found = true;
      continue;
    }
    let title = line.replace(NUMBERING_RE, "");
    let range: OutlineRange | null = null;
    const paren = title.match(/[（(]\s*([^（()）]+?)\s*[）)]\s*$/);
    const inside = paren ? parseRangeInput(paren[1]) : null;
    if (paren && inside) {
      range = inside;
      title = title.slice(0, paren.index).trim();
    }
    found ||= NUMBERING_RE.test(line) || range !== null;
    sections.push({ title, range, items: [] });
  }
  return found ? { book, sections } : null;
}

export function isEmptyOutline(content: OutlineContent | null | undefined): boolean {
  return !content?.sections?.some((s) => s.title.trim() || s.items.some((i) => i.text.trim()));
}
