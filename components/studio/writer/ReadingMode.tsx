"use client";

import WriterHeader from "@/components/studio/writer/WriterHeader";
import { createNote, deleteNote, getNotes, lookupVerses, replaceBlocks } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { stBtnPrimary, stBtnSecondary, stInput } from "@/lib/styles";
import type { Article, BlockInput, NoteTag, Verse, WritingNote } from "@/lib/types";
import { longDate } from "@/lib/week";
import {
  blockContent,
  ensureArticle,
  findArticle,
  keysToRanges,
  MEMORY_SUBHEADING,
  memoryBlock,
  NOTE_TAGS,
  plannedDay,
  rangeLabel,
  readingBlock,
  verseKey,
} from "@/lib/writing";
import { formatVerseRef } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useState } from "react";

/** Verse keys covered by the ranges of a verse block */
function keysOf(verses: Verse[] | undefined): number[] {
  return (verses ?? []).map(verseKey);
}

/** ① 讀經模式: read the passage, select verses, and jot down notes for writing */
export default function ReadingMode({ date }: { date: string }) {
  const { token } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [ref, setRef] = useState("");
  const [refDraft, setRefDraft] = useState("");
  const [verses, setVerses] = useState<Verse[]>([]);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState<WritingNote[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [memory, setMemory] = useState<number[]>([]);
  const [tag, setTag] = useState<NoteTag | null>(null);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("載入中…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const [a, n] = await Promise.all([findArticle(token, date), getNotes(token, date)]);
      setArticle(a);
      setNotes(n);
      setMemory(keysOf(memoryBlock(a)?.content.verses));
      const reading = readingBlock(a);
      if (reading?.content.ranges.length) {
        setRef(formatVerseRef(reading.content.ranges));
        setVerses(reading.content.verses ?? []);
        setTitle(formatVerseRef(reading.content.ranges));
      } else {
        const planned = (await plannedDay(token, date)).ref;
        setRef(planned);
        setRefDraft(planned);
      }
      setStatus(longDate(date));
    })().catch(() => setError("無法載入這天的資料"));
  }, [token, date]);

  // Without an article yet, the passage comes from the plan (or what the writer types)
  useEffect(() => {
    if (!ref || readingBlock(article)?.content.ranges.length) return;
    lookupVerses(ref)
      .then((res) => {
        setVerses(res.verses);
        setTitle(formatVerseRef(res.ranges));
        setError(null);
      })
      .catch(() => setError(`查不到經文「${ref}」`));
  }, [ref, article]);

  const book = verses[0]?.abbrZh;

  function toggle(key: number) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function addNote() {
    const text = draft.trim();
    if (!token || !text) return;
    const note = await createNote(token, date, { tag, verses: selected, text });
    setNotes((prev) => [...prev, note]);
    setDraft("");
    setTag(null);
  }

  async function removeNote(note: WritingNote) {
    if (!token || !confirm("刪除這則筆記？")) return;
    await deleteNote(token, note);
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
  }

  /** Saves the selection as the article's 背誦經文 (creating the article if needed) */
  async function setMemoryVerse() {
    if (!token || !book || selected.length === 0) return;
    setStatus("儲存中…");
    try {
      const a = await ensureArticle(token, date, ref);
      const ranges = keysToRanges(book, selected);
      const blocks = [...a.blocks].sort((x, y) => x.order - y.order);
      const target = memoryBlock(a);
      const next: BlockInput[] = blocks.map((b, i) => ({
        id: b.id,
        order: i + 1,
        type: b.type,
        subheading: b.subheading,
        content: b.id === target?.id ? { ...blockContent(b), ranges } : blockContent(b),
      }));
      if (!target) next.push({ order: next.length + 1, type: "verse", subheading: MEMORY_SUBHEADING, content: { ranges } });
      await replaceBlocks(token, date, next);
      setArticle(await findArticle(token, date));
      setMemory([...selected]);
      setStatus("已設為背誦經文");
    } catch {
      setStatus("儲存失敗");
    }
  }

  const sortedNotes = [...notes].sort((a, b) => a.order - b.order);

  return (
    <div className="studio flex min-h-screen flex-col bg-st-bg text-st-ink">
      <WriterHeader date={date} mode="read" status={status} />
      <div className="flex flex-1 flex-wrap items-stretch">
        <main className="flex min-w-0 flex-[999_1_560px] justify-center px-4 py-8 sm:px-8">
          <div className="w-full max-w-2xl">
            {error && <p className="text-sm text-st-danger">{error}</p>}
            {!readingBlock(article)?.content.ranges.length && (!ref || error) && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setRef(refDraft.trim());
                }}
                className="mb-5 flex flex-wrap items-center gap-2 text-sm"
              >
                <label htmlFor="passage" className="text-st-muted">這天的經文</label>
                <input id="passage" value={refDraft} onChange={(e) => setRefDraft(e.target.value)} placeholder="例如 太24:45-51" className={`${stInput} w-44`} />
                <button type="submit" className={stBtnSecondary}>讀這段</button>
              </form>
            )}
            <h1 className="m-0 mb-5 font-serif text-[28px] font-semibold">{title || ref || "還沒有安排經文"}</h1>
            <ol className="m-0 flex list-none flex-col gap-1 p-0">
              {verses.map((v) => {
                const key = verseKey(v);
                const on = selected.includes(key);
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => toggle(key)}
                      aria-pressed={on}
                      className={`flex w-full gap-3 rounded-lg px-3 py-1.5 text-left font-serif text-[17px] leading-[2] transition ${on ? "bg-st-highlight" : "hover:bg-st-surface"}`}
                    >
                      <span className="w-6 shrink-0 pt-1 text-right font-sans text-xs text-st-gold-ink">{v.verse}</span>
                      <span>
                        {v.text}
                        {memory.includes(key) && (
                          <span className="ml-2 rounded-full bg-st-gold-soft px-2 py-0.5 align-middle font-sans text-xs text-st-gold-soft-ink">背誦經文</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </main>

        <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-4 border-l border-st-line bg-st-sunken px-4 py-5 lg:max-w-[400px]">
          <section className="flex flex-col gap-2.5 rounded-xl border border-st-line bg-st-surface p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{rangeLabel(selected)}</span>
              <div className="flex gap-1">
                <button type="button" onClick={setMemoryVerse} disabled={selected.length === 0} className="h-8 rounded-lg px-2 text-xs text-st-gold-ink hover:bg-st-gold-soft disabled:opacity-40">
                  設為背誦經文
                </button>
                <button type="button" onClick={() => setSelected([])} disabled={selected.length === 0} className="h-8 rounded-lg px-2 text-xs text-st-muted hover:bg-st-soft disabled:opacity-40">
                  清除選取
                </button>
              </div>
            </div>
            <div role="group" aria-label="筆記類型" className="flex flex-wrap gap-1.5">
              {(Object.keys(NOTE_TAGS) as NoteTag[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(tag === t ? null : t)}
                  aria-pressed={tag === t}
                  className={`rounded-full px-3 py-1 text-xs transition ${tag === t ? `${NOTE_TAGS[t].cls} ring-2 ring-st-accent` : "bg-st-sunken text-st-ink-2 hover:text-st-ink"}`}
                >
                  {NOTE_TAGS[t].label}
                </button>
              ))}
            </div>
            <label htmlFor="note-text" className="sr-only">筆記</label>
            <textarea
              id="note-text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote();
              }}
              rows={3}
              placeholder="讀到什麼？寫下觀察、問題或段落小標…"
              className="resize-y rounded-lg border border-st-line-strong bg-st-surface p-2.5 text-sm leading-relaxed text-st-ink placeholder:text-st-placeholder outline-none focus:border-st-accent"
            />
            <button type="button" onClick={addNote} disabled={!draft.trim()} className={stBtnPrimary}>加入筆記</button>
          </section>

          <section aria-label="筆記" className="flex flex-col gap-2">
            {sortedNotes.length === 0 && <p className="m-0 text-sm text-st-muted">選幾節經文、寫下第一則筆記。</p>}
            {sortedNotes.map((note) => (
              <article key={note.id} className="group rounded-[10px] border border-st-line bg-st-surface px-3 py-2.5">
                <div className="flex items-center gap-2 text-xs">
                  {note.tag && <span className={`rounded-full px-2 py-px ${NOTE_TAGS[note.tag].cls}`}>{NOTE_TAGS[note.tag].label}</span>}
                  <span className="text-st-muted">{rangeLabel(note.verses)}</span>
                  {note.usedIn && <span className="text-st-sage-ink">· 已加入{note.usedIn}</span>}
                  <span className="flex-1" />
                  <button type="button" onClick={() => removeNote(note)} aria-label="刪除筆記" className="rounded px-1 text-st-muted opacity-0 hover:text-st-danger focus-visible:opacity-100 group-hover:opacity-100">
                    ×
                  </button>
                </div>
                <p className={`m-0 mt-1 whitespace-pre-wrap leading-relaxed ${note.tag === "heading" ? "font-semibold" : ""}`}>{note.text}</p>
              </article>
            ))}
          </section>

          <Link
            href={`/studio/write/${date}/compose`}
            className="sticky bottom-4 mt-auto flex items-center justify-center gap-2 rounded-xl bg-st-primary px-4 py-3 font-medium text-st-on-primary no-underline hover:opacity-90"
          >
            開始寫作 ↗
          </Link>
        </aside>
      </div>
    </div>
  );
}
