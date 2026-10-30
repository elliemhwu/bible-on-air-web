import {
  createArticle,
  getArticleById,
  getArticleTemplates,
  getPlans,
  lookupVerses,
} from "@/lib/api";
import type { Article, Block, NoteTag, Verse, VerseBlock, VerseRange } from "@/lib/types";
import { mondayOf } from "@/lib/week";
import { isAxiosError } from "axios";

export const MEMORY_SUBHEADING = "背誦經文";

export const NOTE_TAGS: Record<NoteTag, { label: string; cls: string }> = {
  heading: { label: "段落小標", cls: "bg-st-soft text-st-ink" },
  question: { label: "問題", cls: "bg-st-gold-soft text-st-gold-soft-ink" },
  fragment: { label: "寫作片段", cls: "bg-st-sage-soft text-st-sage-ink" },
};

/** Notes and selections refer to verses by chapter * 1000 + verse, so passages may span chapters */
export const verseKey = (v: Pick<Verse, "chapter" | "verse">) => v.chapter * 1000 + v.verse;

/** [24045, 24046, 24047, 24049] → "45–47、49節"; across chapters "24:45–25:2" */
export function rangeLabel(keys: number[]): string {
  if (keys.length === 0) return "整段經文";
  const sorted = [...keys].sort((a, b) => a - b);
  const oneChapter = Math.floor(sorted[0] / 1000) === Math.floor(sorted[sorted.length - 1] / 1000);
  const fmt = (k: number) => (oneChapter ? String(k % 1000) : `${Math.floor(k / 1000)}:${k % 1000}`);
  const parts: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (const k of [...sorted.slice(1), null]) {
    if (k !== null && k === prev + 1) {
      prev = k;
      continue;
    }
    parts.push(start === prev ? fmt(start) : `${fmt(start)}–${fmt(prev)}`);
    if (k !== null) start = prev = k;
  }
  return parts.join("、") + (oneChapter ? "節" : "");
}

/** Contiguous verse keys → stored verse ranges in the book `abbrZh` */
export function keysToRanges(abbrZh: string, keys: number[]): Pick<VerseRange, "abbrZh" | "chapterStart" | "verseStart" | "chapterEnd" | "verseEnd">[] {
  const sorted = [...keys].sort((a, b) => a - b);
  const ranges: ReturnType<typeof keysToRanges> = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (const k of [...sorted.slice(1), null]) {
    if (k !== null && k === prev + 1) {
      prev = k;
      continue;
    }
    const range = { abbrZh, chapterStart: Math.floor(start / 1000), verseStart: start % 1000 };
    ranges.push(start === prev ? range : { ...range, chapterEnd: Math.floor(prev / 1000), verseEnd: prev % 1000 });
    if (k !== null) start = prev = k;
  }
  return ranges;
}

/** The passage block (a verse block without a subheading) */
export function readingBlock(article: Article | null): VerseBlock | null {
  const b = article?.blocks.find((x) => x.type === "verse" && x.subheading === null);
  return (b as VerseBlock | undefined) ?? null;
}

export function memoryBlock(article: Article | null): VerseBlock | null {
  const b = article?.blocks.find((x) => x.type === "verse" && x.subheading === MEMORY_SUBHEADING);
  return (b as VerseBlock | undefined) ?? null;
}

/** Strip a range to the fields the API stores */
export function storedRange(r: VerseRange) {
  const { abbrZh, chapterStart, verseStart, chapterEnd, verseEnd } = r;
  return {
    abbrZh,
    chapterStart,
    verseStart,
    ...(chapterEnd !== undefined && { chapterEnd }),
    ...(verseEnd !== undefined && { verseEnd }),
  };
}

/** Content of a block as the PUT /blocks payload expects it */
export function blockContent(b: Block): Record<string, unknown> {
  if (b.type === "verse") {
    return {
      ranges: b.content.ranges.map(storedRange),
      ...(b.content.displayMode && { displayMode: b.content.displayMode }),
    };
  }
  return b.content;
}

/** The planned passage of a day, from its week plan */
export async function plannedDay(token: string, date: string): Promise<{ ref: string; overview: boolean }> {
  const monday = mondayOf(date);
  const [plan] = await getPlans(token, monday, monday);
  const index = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
  const day = plan?.days[index];
  return { ref: day?.ref ?? "", overview: !!day?.overview };
}

export async function findArticle(token: string, date: string): Promise<Article | null> {
  try {
    return await getArticleById(token, date);
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === 404) return null;
    throw e;
  }
}

/**
 * The day's article, created from the template (the overview template on a
 * 鳥瞰 day) with the planned passage filled in when it does not exist yet.
 */
export async function ensureArticle(token: string, date: string, ref?: string): Promise<Article> {
  const existing = await findArticle(token, date);
  if (existing) return existing;

  const planned = await plannedDay(token, date);
  const passage = ref ?? planned.ref;
  const templates = await getArticleTemplates(token);
  const template =
    (planned.overview && templates.find((t) => t.name.includes("鳥瞰"))) ||
    templates.find((t) => t.isDefault) ||
    templates[0];
  const ranges = passage ? (await lookupVerses(passage).catch(() => ({ ranges: [] }))).ranges : [];

  await createArticle(token, {
    date,
    title: "",
    articleTemplateId: template?.id,
    blocks: (template?.blockDefinitions ?? []).map((def) => {
      const defaults = def.defaultContent ?? {};
      const content =
        def.type === "verse"
          ? { ...defaults, ranges: def.subheading === null ? ranges.map(storedRange) : [] }
          : def.type === "questions"
            ? { items: [] }
            : { html: "" };
      return { order: def.order, type: def.type, subheading: def.subheading ?? undefined, content };
    }),
  });
  return getArticleById(token, date);
}
