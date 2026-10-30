"use client";

import { StudioPage } from "@/components/studio/shell/StudioHeader";
import { getBibleBooks, getPlans, lookupVerses, savePlan } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { stBtnPrimary, stBtnSecondary, stInput } from "@/lib/styles";
import type { BibleBook, Verse } from "@/lib/types";
import { addDays, md, weekDays, weekday, WEEKDAYS } from "@/lib/week";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const arrow =
  "flex h-9 w-9 items-center justify-center rounded-lg text-lg text-st-ink-2 no-underline hover:bg-st-surface hover:text-st-ink";

type Chapter = { abbr: string; chapter: number; verses: Verse[] };
type Clip = { start: number; end: number };

/** "太24" or "馬太福音 24" → book + chapter; null when it names no single chapter */
function parseChapter(input: string, books: BibleBook[]): { book: BibleBook; chapter: number } | null {
  const m = input.trim().match(/^(.+?)\s*(\d+)$/);
  if (!m) return null;
  const book = books.find((b) => b.abbrZh === m[1] || b.zh === m[1]);
  const chapter = Number(m[2]);
  return book && chapter >= 1 && chapter <= book.chapters.length ? { book, chapter } : null;
}

/** Plan state for one week: where the chapter is cut and which clip each day reads */
type Layout = {
  /** A clip ends after each of these verse numbers */
  cuts: number[];
  /** clip start verse → day index */
  owner: Record<number, number>;
  /** Free-text passage per day, used instead of a clip (e.g. another book) */
  override: string[];
  overview: boolean[];
};

/** Rebuild cuts and owners from saved day refs that fall in `chapter` */
function layoutFrom(refs: { ref: string; overview?: boolean }[], chapter: Chapter | null): Layout {
  const layout: Layout = { cuts: [], owner: {}, override: Array(6).fill(""), overview: Array(6).fill(false) };
  const verseCount = chapter?.verses.length ?? 0;
  refs.forEach(({ ref, overview }, i) => {
    layout.overview[i] = !!overview;
    if (!ref) return;
    const m = chapter && ref.match(/^(.+?)(\d+):(\d+)(?:-(\d+))?$/);
    if (!m || m[1] !== chapter.abbr || Number(m[2]) !== chapter.chapter) {
      layout.override[i] = ref;
      return;
    }
    const from = Number(m[3]);
    const to = Number(m[4] ?? m[3]);
    if (from > 1) layout.cuts.push(from - 1);
    if (to < verseCount) layout.cuts.push(to);
    layout.owner[from] = i;
  });
  layout.cuts = [...new Set(layout.cuts)].sort((a, b) => a - b);
  return layout;
}

function clipsOf(cuts: number[], last: number): Clip[] {
  const starts = [1, ...cuts.map((c) => c + 1)];
  return starts.map((start, i) => ({ start, end: i + 1 < starts.length ? starts[i + 1] - 1 : last }));
}

/** 進度安排・單週: cut the Sunday chapter into clips and deal them to Mon–Sat */
export default function WeekPlanner({ monday }: { monday: string }) {
  const { token } = useAuth();
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [theme, setTheme] = useState("");
  const [sundayPassage, setSundayPassage] = useState("");
  const [savedRefs, setSavedRefs] = useState<{ ref: string; overview?: boolean }[]>([]);
  const [layout, setLayout] = useState<Layout>(() => layoutFrom([], null));
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [draft, setDraft] = useState({ from: "", to: "" });
  const [dragging, setDragging] = useState<number | null>(null);
  const [dropDay, setDropDay] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    getBibleBooks().then(setBooks).catch(() => setBooks([]));
  }, []);

  useEffect(() => {
    if (!token) return;
    getPlans(token, monday, monday).then(([plan]) => {
      setTheme(plan?.sundayTheme ?? "");
      setSundayPassage(plan?.sundayPassage ?? "");
      setSavedRefs(plan?.days ?? []);
      setDirty(false);
      setSavedAt(null);
    });
  }, [token, monday]);

  // Load the chapter whenever the Sunday passage names one
  const target = useMemo(() => parseChapter(sundayPassage, books), [sundayPassage, books]);
  const [fetched, setFetched] = useState<Chapter | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const chapter =
    fetched && target && fetched.abbr === target.book.abbrZh && fetched.chapter === target.chapter ? fetched : null;
  const chapterError =
    !target && sundayPassage.trim() && books.length ? "主日經文請寫成一章，例如「太24」" : target ? lookupError : null;

  useEffect(() => {
    if (!target) return;
    const { book, chapter: ch } = target;
    let cancelled = false;
    lookupVerses(`${book.abbrZh}${ch}:1-${book.chapters[ch - 1]}`)
      .then(({ verses }) => {
        if (cancelled) return;
        setFetched({ abbr: book.abbrZh, chapter: ch, verses });
        setLookupError(null);
      })
      .catch(() => !cancelled && setLookupError("無法載入經文"));
    return () => {
      cancelled = true;
    };
  }, [target]);

  // Saved refs are laid out again once their chapter is known
  const layoutKey = `${JSON.stringify(savedRefs)}|${chapter ? `${chapter.abbr}${chapter.chapter}` : ""}`;
  const [layoutFor, setLayoutFor] = useState(layoutKey);
  if (layoutFor !== layoutKey) {
    setLayoutFor(layoutKey);
    setLayout(layoutFrom(savedRefs, chapter));
    setOpen({});
  }

  const last = chapter?.verses.length ?? 0;
  const clips = chapter ? clipsOf(layout.cuts, last) : [];
  const label = (c: Clip) => (chapter ? `${chapter.abbr}${chapter.chapter}:${c.start === c.end ? c.start : `${c.start}-${c.end}`}` : "");

  function change(next: Partial<Layout>) {
    setLayout((prev) => ({ ...prev, ...next }));
    setDirty(true);
  }

  function clipOfDay(day: number): Clip | null {
    const entry = Object.entries(layout.owner).find(([, d]) => d === day);
    return entry ? clips.find((c) => c.start === Number(entry[0])) ?? null : null;
  }

  function dayRef(day: number): string {
    if (layout.override[day]) return layout.override[day];
    const clip = clipOfDay(day);
    return clip ? label(clip) : "";
  }

  function assign(start: number, day: number) {
    const owner: Record<number, number> = {};
    for (const [s, d] of Object.entries(layout.owner)) {
      if (d !== day && Number(s) !== start) owner[Number(s)] = d;
    }
    owner[start] = day;
    const override = [...layout.override];
    override[day] = "";
    change({ owner, override });
    setDragging(null);
    setDropDay(null);
  }

  function cut(after: number) {
    change({ cuts: [...layout.cuts, after].sort((a, b) => a - b) });
  }

  /** A removed clip joins the next one (which keeps its day); the last joins the previous */
  function removeClip(clip: Clip, isLast: boolean) {
    const owner = { ...layout.owner };
    delete owner[clip.start];
    if (isLast) {
      change({ cuts: layout.cuts.filter((c) => c !== clip.start - 1), owner });
      return;
    }
    const nextStart = clip.end + 1;
    if (owner[nextStart] !== undefined) {
      owner[clip.start] = owner[nextStart];
      delete owner[nextStart];
    }
    change({ cuts: layout.cuts.filter((c) => c !== clip.end), owner });
  }

  function splitEvenly() {
    if (!last) return;
    const cuts = [1, 2, 3, 4, 5]
      .map((k) => Math.round((last * k) / 6))
      .filter((c, i, a) => c > 0 && c < last && a.indexOf(c) === i);
    const owner: Record<number, number> = {};
    clipsOf(cuts, last).forEach((c, i) => (owner[c.start] = i));
    change({ cuts, owner, override: Array(6).fill("") });
  }

  function applyRange(day: number) {
    const from = Math.max(1, Math.min(last, parseInt(draft.from, 10)));
    const to = Math.max(from, Math.min(last, parseInt(draft.to, 10)));
    if (!from || !to) return;
    // Make [from, to] exactly one clip: drop cuts inside it, add cuts at its edges
    const cuts = layout.cuts.filter((c) => c < from - 1 || c >= to);
    if (from > 1 && !cuts.includes(from - 1)) cuts.push(from - 1);
    if (to < last && !cuts.includes(to)) cuts.push(to);
    const owner: Record<number, number> = {};
    for (const [s, d] of Object.entries(layout.owner)) {
      const sn = Number(s);
      if (d !== day && (sn < from || sn > to)) owner[sn] = d;
    }
    owner[from] = day;
    const override = [...layout.override];
    override[day] = "";
    change({ cuts: cuts.sort((a, b) => a - b), owner, override });
  }

  async function save() {
    if (!token) return;
    setSaving(true);
    try {
      const plan = await savePlan(token, monday, {
        sundayTheme: theme.trim() || null,
        sundayPassage: sundayPassage.trim() || null,
        days: WEEKDAYS.map((_, i) => ({ ref: dayRef(i), ...(layout.overview[i] && { overview: true }) })),
      });
      setSavedRefs(plan.days);
      setDirty(false);
      setSavedAt(new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false }));
    } finally {
      setSaving(false);
    }
  }

  const dates = weekDays(monday);
  const year = Number(monday.slice(0, 4));

  return (
    <StudioPage>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-st-line bg-st-surface px-4 py-3 sm:px-8">
        <Link href={`/studio/plan?year=${year}`} className="text-sm text-st-ink-2 no-underline">‹ {year} 年</Link>
        <Link href={`/studio/plan/${addDays(monday, -7)}`} aria-label="上一週" className={arrow}>‹</Link>
        <h1 className="m-0 font-serif text-xl font-semibold tabular-nums">{md(monday)} – {md(addDays(monday, 6))}</h1>
        <Link href={`/studio/plan/${addDays(monday, 7)}`} aria-label="下一週" className={arrow}>›</Link>
        <label className="flex items-center gap-2 text-sm text-st-muted">
          主日
          <input
            value={theme}
            onChange={(e) => { setTheme(e.target.value); setDirty(true); }}
            placeholder="主日主題"
            aria-label="主日主題"
            className={`${stInput} w-40`}
          />
          <input
            value={sundayPassage}
            onChange={(e) => { setSundayPassage(e.target.value); setDirty(true); }}
            placeholder="例如 太24"
            aria-label="主日經文（一章）"
            className={`${stInput} w-28`}
          />
        </label>
        <span className="flex-1" />
        <button type="button" onClick={splitEvenly} disabled={!chapter} className={stBtnSecondary}>平均切成 6 段</button>
        <button
          type="button"
          onClick={() => change({ cuts: [], owner: {}, override: Array(6).fill("") })}
          disabled={!chapter}
          className={stBtnSecondary}
        >
          全部重來
        </button>
      </div>

      <div className="flex flex-1 flex-wrap items-stretch">
        <main className="min-w-0 flex-[999_1_560px] px-4 py-5 sm:px-8">
          {chapterError && <p className="text-sm text-st-danger">{chapterError}</p>}
          {!sundayPassage.trim() && (
            <p className="text-sm text-st-ink-2">先在上方填主日經文（例如「太24」），就能把那一章切成段落、派到每一天。</p>
          )}
          <div className="flex flex-col gap-3">
            {clips.map((clip, ci) => {
              const isLast = ci === clips.length - 1;
              const day = layout.owner[clip.start];
              const expanded = open[clip.start] ?? isLast;
              const verses = chapter!.verses.filter((v) => v.verse >= clip.start && v.verse <= clip.end);
              return (
                <section key={clip.start} className="overflow-hidden rounded-xl border border-st-line bg-st-surface">
                  <div className="flex flex-wrap items-center gap-2 px-3 py-2">
                    <span
                      draggable
                      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setDragging(clip.start); }}
                      onDragEnd={() => { setDragging(null); setDropDay(null); }}
                      title="拖到右邊的某一天"
                      className="cursor-grab px-1 text-st-faint"
                      aria-hidden="true"
                    >
                      ⠿
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpen({ ...open, [clip.start]: !expanded })}
                      aria-expanded={expanded}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <span aria-hidden="true" className={`text-st-muted transition ${expanded ? "rotate-90" : ""}`}>›</span>
                      <span className="shrink-0 whitespace-nowrap font-medium">{label(clip)}</span>
                      {!expanded && (
                        <span className="truncate text-sm text-st-muted">
                          {verses.map((v) => `${v.verse} ${v.text}`).join(" ")}
                        </span>
                      )}
                    </button>
                    <div role="group" aria-label={`${label(clip)} 派入哪一天`} className="flex gap-1">
                      {WEEKDAYS.map((d, i) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => assign(clip.start, i)}
                          aria-pressed={day === i}
                          aria-label={`派入 ${md(dates[i])} 週${d}`}
                          className={`h-8 w-8 rounded-full text-sm transition ${day === i ? "bg-st-primary text-st-on-primary" : "bg-st-soft text-st-ink-2 hover:text-st-ink"}`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                    {clips.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeClip(clip, isLast)}
                        aria-label={`移除 ${label(clip)}`}
                        title="移除這段（併入相鄰段落）"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-st-muted hover:bg-st-soft hover:text-st-ink"
                      >
                        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12" /><path d="M9 7V4h6v3" /></svg>
                      </button>
                    )}
                  </div>
                  {expanded && (
                    <div className="border-t border-st-line px-4 py-3 font-serif">
                      {verses.map((v) => (
                        <div key={v.verse}>
                          <div className="flex gap-3 py-0.5 text-[15px] leading-[1.9]">
                            <span className="w-6 shrink-0 text-right font-sans text-xs leading-[2.4] text-st-gold-ink">{v.verse}</span>
                            <span>{v.text}</span>
                          </div>
                          {v.verse < clip.end && (
                            <button
                              type="button"
                              onClick={() => cut(v.verse)}
                              aria-label={`在 ${v.verse} 和 ${v.verse + 1} 節之間切開`}
                              className="flex h-[18px] w-full items-center gap-2 opacity-0 transition hover:opacity-100 focus-visible:opacity-100 motion-reduce:transition-none"
                            >
                              <span className="flex h-[18px] w-[26px] items-center justify-center rounded-full bg-st-gold text-white">
                                <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M8.6 7.6L20 18" /><path d="M8.6 16.4L20 6" /></svg>
                              </span>
                              <span className="flex-1 border-t-2 border-st-gold" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </main>

        <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-2 border-l border-st-line bg-st-sunken px-4 py-5 lg:max-w-sm">
          {WEEKDAYS.map((d, i) => {
            const ref = dayRef(i);
            const isOpen = openDay === i;
            const target = dropDay === i && dragging !== null;
            return (
              <div
                key={d}
                onDragOver={(e) => { e.preventDefault(); if (dropDay !== i) setDropDay(i); }}
                onDragLeave={() => setDropDay(null)}
                onDrop={(e) => { e.preventDefault(); if (dragging !== null) assign(dragging, i); }}
                className={`rounded-xl border bg-st-surface ${target ? "border-2 border-dashed border-st-gold bg-st-warm" : "border-st-line"}`}
              >
                <button
                  type="button"
                  onClick={() => {
                    const clip = clipOfDay(i);
                    setOpenDay(isOpen ? null : i);
                    setDraft({ from: clip ? String(clip.start) : "", to: clip ? String(clip.end) : "" });
                  }}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-st-soft font-medium">{d}</span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-xs text-st-muted">{md(dates[i])} 週{weekday(dates[i])}</span>
                    <span className={ref ? "font-medium" : "text-st-muted"}>
                      {ref || "未安排"}
                      {layout.overview[i] && <span className="ml-2 rounded-full bg-st-soft px-2 text-xs font-normal text-st-ink-2">鳥瞰</span>}
                    </span>
                  </span>
                </button>
                {isOpen && (
                  <div className="flex flex-col gap-2 border-t border-st-line px-3 py-3 text-sm">
                    {chapter && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span>{chapter.abbr}{chapter.chapter}:</span>
                        <input type="number" min={1} max={last} aria-label="起始節" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} className={`${stInput} w-16`} />
                        <span>–</span>
                        <input type="number" min={1} max={last} aria-label="結束節" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} className={`${stInput} w-16`} />
                        <button type="button" onClick={() => applyRange(i)} className={stBtnSecondary}>套用</button>
                      </div>
                    )}
                    <label className="flex items-center gap-2">
                      <span className="shrink-0 text-st-muted">其他經文</span>
                      <input
                        type="text"
                        value={layout.override[i]}
                        onChange={(e) => {
                          const override = [...layout.override];
                          override[i] = e.target.value;
                          change({ override });
                        }}
                        placeholder="例如 帖前5:1-11"
                        className={`${stInput} min-w-0 flex-1`}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-st-ink-2">
                      <input
                        type="checkbox"
                        checked={layout.overview[i]}
                        onChange={(e) => {
                          const overview = [...layout.overview];
                          overview[i] = e.target.checked;
                          change({ overview });
                        }}
                      />
                      這天是書卷鳥瞰
                    </label>
                  </div>
                )}
              </div>
            );
          })}
          <button type="button" onClick={save} disabled={saving} className={`${stBtnPrimary} mt-2`}>
            {saving ? "儲存中…" : "儲存安排"}
          </button>
          <p className="m-0 text-xs text-st-muted" aria-live="polite">
            {dirty ? "有尚未儲存的變更" : savedAt ? `已於 ${savedAt} 儲存` : ""}
          </p>
        </aside>
      </div>
    </StudioPage>
  );
}
