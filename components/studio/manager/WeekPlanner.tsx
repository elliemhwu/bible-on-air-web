"use client";

import { StudioPage } from "@/components/studio/shell/StudioHeader";
import { getBibleBooks, getPlans, lookupVerses, savePlan } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { stBtnPrimary, stBtnSecondary, stInput } from "@/lib/styles";
import { parsePassages, passageRef } from "@/lib/passage";
import type { BibleBook, Verse } from "@/lib/types";
import { addDays, md, weekDays, weekday, WEEKDAYS } from "@/lib/week";
import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";

const arrow =
  "flex h-9 w-9 items-center justify-center rounded-lg text-lg text-st-ink-2 no-underline hover:bg-st-surface hover:text-st-ink";

type Clip = { start: number; end: number };

/** The verses of every Sunday passage, one after another */
type Reading = { key: string; verses: Verse[]; starts: number[] };

const sameVerse = (v: Verse, abbr: string, chapter: number, verse: number) =>
  v.abbrZh === abbr && v.chapter === chapter && v.verse === verse;

/** "加1:13-2:14" → the indexes of its first and last verse in `verses` */
function findRef(ref: string, verses: Verse[]): Clip | null {
  const m = ref.match(/^(.+?)(\d+):(\d+)(?:-(?:(\d+):)?(\d+))?$/);
  if (!m) return null;
  const [, abbr, c1, v1, c2, v2] = m;
  const start = verses.findIndex((v) => sameVerse(v, abbr, Number(c1), Number(v1)));
  const end = verses.findIndex((v) => sameVerse(v, abbr, Number(c2 ?? c1), Number(v2 ?? v1)));
  return start >= 0 && end >= start ? { start, end } : null;
}

/** "賽61:1-11", "加1:13-2:14" for verses[start..end] (always one book) */
function clipRef(verses: Verse[], { start, end }: Clip): string {
  const a = verses[start];
  const b = verses[end];
  const head = `${a.abbrZh}${a.chapter}:${a.verse}`;
  if (a.chapter !== b.chapter) return `${head}-${b.chapter}:${b.verse}`;
  return a.verse === b.verse ? head : `${head}-${b.verse}`;
}

/** Plan state for one week: where the reading is cut and which clip each day reads */
type Layout = {
  /** A clip ends after each of these verse indexes */
  cuts: number[];
  /** clip start index → day index */
  owner: Record<number, number>;
  /** Free-text passage per day, used instead of a clip (e.g. another book) */
  override: string[];
  overview: boolean[];
};

/** Rebuild cuts and owners from saved day refs that fall in the reading */
function layoutFrom(refs: { ref: string; overview?: boolean }[], verses: Verse[]): Layout {
  const layout: Layout = { cuts: [], owner: {}, override: Array(6).fill(""), overview: Array(6).fill(false) };
  refs.forEach(({ ref, overview }, i) => {
    layout.overview[i] = !!overview;
    if (!ref) return;
    const clip = findRef(ref, verses);
    if (!clip) {
      layout.override[i] = ref;
      return;
    }
    if (clip.start > 0) layout.cuts.push(clip.start - 1);
    if (clip.end < verses.length - 1) layout.cuts.push(clip.end);
    layout.owner[clip.start] = i;
  });
  layout.cuts = [...new Set(layout.cuts)].sort((a, b) => a - b);
  return layout;
}

function clipsOf(cuts: number[], last: number): Clip[] {
  const starts = [0, ...cuts.map((c) => c + 1)];
  return starts.map((start, i) => ({ start, end: i + 1 < starts.length ? starts[i + 1] - 1 : last }));
}

/** Six days shared by the passages in proportion to their length, at least one each */
function daysPerPassage(lengths: number[]): number[] {
  if (lengths.length >= 6) return lengths.map(() => 1);
  const total = lengths.reduce((a, b) => a + b, 0);
  const spare = 6 - lengths.length;
  const exact = lengths.map((l) => (l / total) * spare);
  const days = exact.map((x) => 1 + Math.floor(x));
  let left = 6 - days.reduce((a, b) => a + b, 0);
  for (const i of exact.map((x, i) => i).sort((a, b) => (exact[b] % 1) - (exact[a] % 1))) {
    if (left-- <= 0) break;
    days[i]++;
  }
  return days.map((d, i) => Math.min(d, lengths[i]));
}

/** 進度安排・單週: cut the Sunday passages into clips and deal them to Mon–Sat */
export default function WeekPlanner({ monday }: { monday: string }) {
  const { token } = useAuth();
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [theme, setTheme] = useState("");
  const [sundayPassage, setSundayPassage] = useState("");
  const [savedRefs, setSavedRefs] = useState<{ ref: string; overview?: boolean }[]>([]);
  const [layout, setLayout] = useState<Layout>(() => layoutFrom([], []));
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
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

  // Load the verses whenever the Sunday passages change
  const parsed = useMemo(() => parsePassages(sundayPassage, books), [sundayPassage, books]);
  const passageKey = parsed.passages.map(passageRef).join("、");
  const [fetched, setFetched] = useState<Reading | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const reading = fetched && passageKey && fetched.key === passageKey ? fetched : null;
  const passageError =
    sundayPassage.trim() && books.length
      ? parsed.errors.length
        ? `${parsed.errors.join("；")}。同一卷書的段落用「、」分開，不同書卷用「；」，例如「路4:15-21；賽61」。`
        : passageKey
          ? lookupError
          : null
      : null;

  useEffect(() => {
    if (!passageKey) return;
    let cancelled = false;
    Promise.all(passageKey.split("、").map((ref) => lookupVerses(ref)))
      .then((results) => {
        if (cancelled) return;
        const starts: number[] = [];
        const verses: Verse[] = [];
        for (const r of results) {
          starts.push(verses.length);
          verses.push(...r.verses);
        }
        setFetched({ key: passageKey, verses, starts });
        setLookupError(null);
      })
      .catch(() => !cancelled && setLookupError("無法載入經文"));
    return () => {
      cancelled = true;
    };
  }, [passageKey]);

  const verses = reading?.verses ?? [];
  const last = verses.length - 1;
  // Clips never run from one passage into the next
  const forced = useMemo(() => new Set(reading?.starts.slice(1).map((s) => s - 1) ?? []), [reading]);
  const passageAt = new Map(reading?.starts.map((s, i) => [s, parsed.passages[i]]) ?? []);

  // Saved refs are laid out again once their verses are known
  const layoutKey = `${JSON.stringify(savedRefs)}|${reading?.key ?? ""}`;
  const [layoutFor, setLayoutFor] = useState(layoutKey);
  if (layoutFor !== layoutKey) {
    setLayoutFor(layoutKey);
    setLayout(layoutFrom(savedRefs, verses));
    setOpen({});
  }

  const allCuts = [...new Set([...layout.cuts, ...forced])].filter((c) => c < last).sort((a, b) => a - b);
  const clips = reading ? clipsOf(allCuts, last) : [];
  const label = (c: Clip) => (reading ? clipRef(verses, c) : "");

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

  /** The cut a removed clip gives up: it joins the next clip (which keeps its day), or else the previous one */
  function joinable(clip: Clip): "next" | "previous" | null {
    if (clip.end < last && !forced.has(clip.end)) return "next";
    if (clip.start > 0 && !forced.has(clip.start - 1)) return "previous";
    return null;
  }

  function removeClip(clip: Clip) {
    const owner = { ...layout.owner };
    delete owner[clip.start];
    if (joinable(clip) === "previous") {
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
    if (!reading) return;
    const bounds = reading.starts.map((s, i) => ({ start: s, end: (reading.starts[i + 1] ?? verses.length) - 1 }));
    const shares = daysPerPassage(bounds.map((b) => b.end - b.start + 1));
    const cuts: number[] = [];
    const owner: Record<number, number> = {};
    let day = 0;
    bounds.forEach((b, i) => {
      const length = b.end - b.start + 1;
      const pieces = [...Array(shares[i] - 1).keys()]
        .map((k) => b.start + Math.round((length * (k + 1)) / shares[i]) - 1)
        .filter((c, j, a) => c >= b.start && c < b.end && a.indexOf(c) === j);
      cuts.push(...pieces);
      for (const start of [b.start, ...pieces.map((c) => c + 1)]) {
        if (day < 6) owner[start] = day++;
      }
    });
    change({ cuts, owner, override: Array(6).fill("") });
  }

  /** A passage inside the reading becomes that day's clip; anything else is kept as written */
  function applyRef(day: number) {
    const text = draft.trim();
    const [passage] = parsePassages(text, books).passages;
    const clip = passage && reading ? findRef(passageRef(passage), verses) : null;
    const owner: Record<number, number> = {};
    const override = [...layout.override];
    if (!clip) {
      for (const [s, d] of Object.entries(layout.owner)) if (d !== day) owner[Number(s)] = d;
      override[day] = passage ? passageRef(passage) : text;
      change({ owner, override });
      return;
    }
    // Make the passage exactly one clip: drop cuts inside it, add cuts at its edges
    const cuts = layout.cuts.filter((c) => c < clip.start - 1 || c >= clip.end);
    if (clip.start > 0 && !cuts.includes(clip.start - 1)) cuts.push(clip.start - 1);
    if (clip.end < last && !cuts.includes(clip.end)) cuts.push(clip.end);
    for (const [s, d] of Object.entries(layout.owner)) {
      const sn = Number(s);
      if (d !== day && (sn < clip.start || sn > clip.end)) owner[sn] = d;
    }
    owner[clip.start] = day;
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
            placeholder="例如：約1:1-34；賽61"
            aria-label="主日經文"
            className={`${stInput} w-52`}
          />
        </label>
        <span className="flex-1" />
        <button type="button" onClick={splitEvenly} disabled={!reading} className={stBtnSecondary}>平均切成 6 段</button>
        <button
          type="button"
          onClick={() => change({ cuts: [], owner: {}, override: Array(6).fill("") })}
          disabled={!reading}
          className={stBtnSecondary}
        >
          全部重來
        </button>
      </div>

      <div className="flex flex-1 flex-wrap items-stretch">
        <main className="min-w-0 flex-[999_1_560px] px-4 py-5 sm:px-8">
          {passageError && <p className="text-sm text-st-danger">{passageError}</p>}
          {!sundayPassage.trim() && (
            <p className="text-sm text-st-ink-2">
              先在上方填主日經文，就能把經文切成段落、派到每一天。可以是一章（「太24」）、一段（「約1:1-34」），
              或好幾段：同一卷書用「、」分開（「羅3:19-24、4:1-8」），不同書卷用「；」（「路4:15-21；賽61」）。
            </p>
          )}
          <div className="flex flex-col gap-3">
            {clips.map((clip, ci) => {
              const isLast = ci === clips.length - 1;
              const day = layout.owner[clip.start];
              const expanded = open[clip.start] ?? isLast;
              const clipVerses = verses.slice(clip.start, clip.end + 1);
              const spansChapters = clipVerses[0].chapter !== clipVerses[clipVerses.length - 1].chapter;
              const passage = passageAt.get(clip.start);
              const removable = clips.length > 1 && joinable(clip) !== null;
              return (
                <Fragment key={clip.start}>
                {passage && reading!.starts.length > 1 && (
                  <h2 className={`m-0 font-serif text-base font-semibold text-st-gold-ink ${ci > 0 ? "mt-3" : ""}`}>{passageRef(passage)}</h2>
                )}
                <section className="overflow-hidden rounded-xl border border-st-line bg-st-surface">
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
                          {clipVerses.map((v) => `${v.verse} ${v.text}`).join(" ")}
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
                    {removable && (
                      <button
                        type="button"
                        onClick={() => removeClip(clip)}
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
                      {clipVerses.map((v, k) => (
                        <div key={`${v.chapter}:${v.verse}`}>
                          <div className="flex gap-3 py-0.5 text-[15px] leading-[1.9]">
                            <span className={`${spansChapters ? "w-9" : "w-6"} shrink-0 text-right font-sans text-xs leading-[2.4] text-st-gold-ink`}>
                              {spansChapters ? `${v.chapter}:${v.verse}` : v.verse}
                            </span>
                            <span>{v.text}</span>
                          </div>
                          {clip.start + k < clip.end && (
                            <button
                              type="button"
                              onClick={() => cut(clip.start + k)}
                              aria-label={`在 ${v.chapter}:${v.verse} 之後切開`}
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
                </Fragment>
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
                    setOpenDay(isOpen ? null : i);
                    setDraft(dayRef(i));
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
                    <div className="flex items-center gap-2">
                      <label htmlFor={`day-ref-${i}`} className="shrink-0 text-st-muted">經文</label>
                      <input
                        id={`day-ref-${i}`}
                        type="text"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.nativeEvent.isComposing) applyRef(i);
                        }}
                        placeholder={reading ? clipRef(verses, { start: 0, end: Math.min(4, last) }) : "例如 帖前5:1-11"}
                        className={`${stInput} min-w-0 flex-1`}
                      />
                      <button type="button" onClick={() => applyRef(i)} className={stBtnSecondary}>套用</button>
                    </div>
                    <p className="m-0 text-xs text-st-muted">主日經文裡的段落會切出來派給這天；其他經文照寫的保留。</p>
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
