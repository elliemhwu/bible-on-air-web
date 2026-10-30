"use client";

import OutlineBlockEditor from "@/components/studio/OutlineBlockEditor";
import QuestionsBlockEditor from "@/components/studio/QuestionsBlockEditor";
import RichtextBlockEditor from "@/components/studio/RichtextBlockEditor";
import WriterHeader from "@/components/studio/writer/WriterHeader";
import {
  batchSubmit,
  deleteNote,
  getComments,
  getNotes,
  replaceBlocks,
  updateArticle,
  updateNote,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { stBtnPrimary, stBtnSecondary } from "@/lib/styles";
import type { Article, ArticleComment, Block, BlockInput, OutlineRange, WritingNote } from "@/lib/types";
import { formatVerseRef } from "@/lib/utils";
import { fullDate, localDay, md } from "@/lib/week";
import {
  blockContent,
  ensureArticle,
  NOTE_TAGS,
  rangeLabel,
  readingBlock,
} from "@/lib/writing";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const AUTOSAVE_MS = 1500;
const THEME_KEY = "boa_compose_theme";

const sectionLabel = "text-xs font-medium tracking-[.08em] text-st-gold-ink";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function clock(): string {
  return new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** Name of a writable section, as shown on the copy buttons */
/** The span of a note's verses (chapter * 1000 + verse) as an outline range */
function notesRange(keys: number[]): OutlineRange | null {
  if (keys.length === 0) return null;
  const first = Math.min(...keys);
  const last = Math.max(...keys);
  return {
    chapterStart: Math.floor(first / 1000),
    verseStart: first % 1000,
    chapterEnd: Math.floor(last / 1000),
    verseEnd: last % 1000,
  };
}

function sectionName(b: Block): string {
  return b.subheading ?? (b.type === "richtext" ? "書卷介紹" : "內容");
}

/** ② 寫作模式: turn the reading notes into the day's devotion */
export default function ComposeMode({ date }: { date: string }) {
  const { token } = useAuth();
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [notes, setNotes] = useState<WritingNote[]>([]);
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState("載入中…");
  const [busy, setBusy] = useState(false);
  const [night, setNight] = useState(false);
  const saving = useRef(false);

  useEffect(() => {
    try {
      // Stored in the browser, so it can only be read after hydration
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNight(localStorage.getItem(THEME_KEY) === "night");
    } catch {
      // storage unavailable: stay in the day theme
    }
  }, []);

  function toggleTheme() {
    const next = !night;
    setNight(next);
    try {
      localStorage.setItem(THEME_KEY, next ? "night" : "day");
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!token) return;
    (async () => {
      const a = await ensureArticle(token, date);
      const [n, c] = await Promise.all([getNotes(token, date), getComments(token, a.id)]);
      setArticle(a);
      setTitle(a.title ?? "");
      setBlocks([...a.blocks].sort((x, y) => x.order - y.order));
      setNotes(n);
      setComments(c);
      setStatus(a.status === "draft" ? "草稿" : "已送出校閱");
    })().catch(() => setStatus("無法載入稿件"));
  }, [token, date]);

  const save = useCallback(async () => {
    if (!token || !article || saving.current) return false;
    saving.current = true;
    setStatus("儲存中…");
    try {
      const input: BlockInput[] = blocks.map((b, i) => ({
        id: b.id,
        order: i + 1,
        type: b.type,
        subheading: b.subheading,
        content: blockContent(b),
      }));
      await Promise.all([updateArticle(token, date, { title }), replaceBlocks(token, date, input)]);
      setDirty(false);
      setStatus(`${article.status === "draft" ? "草稿" : "已送出校閱"} · 已於 ${clock()} 自動儲存`);
      return true;
    } catch {
      setStatus("儲存失敗，稍後會再試");
      return false;
    } finally {
      saving.current = false;
    }
  }, [token, article, blocks, title, date]);

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(save, AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [dirty, save]);

  function patchBlock(id: string, content: Block["content"]) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? ({ ...b, content } as Block) : b)));
    setDirty(true);
  }

  async function submit() {
    if (!token || !article) return;
    if (!confirm("送出給校稿同工？送出後仍可以修改。")) return;
    setBusy(true);
    try {
      if (dirty && !(await save())) return;
      await batchSubmit(token, [article.id]);
      router.push("/studio/my");
    } finally {
      setBusy(false);
    }
  }

  /** Copy the checked notes to the end of a section (or to the title) */
  async function copyTo(target: Block | "title") {
    if (!token) return;
    const picked = notes.filter((n) => checked.has(n.id));
    if (picked.length === 0) return;
    const withRef = (n: WritingNote) => (n.verses.length ? `${n.text}（${rangeLabel(n.verses)}）` : n.text);
    if (target === "title") {
      setTitle(picked[0].text);
    } else if (target.type === "questions") {
      patchBlock(target.id, { items: [...target.content.items.filter((q) => q.trim()), ...picked.map(withRef)] });
    } else if (target.type === "outline") {
      // A 段落小標 note starts a section; other notes become its passages
      const sections = [...target.content.sections];
      for (const n of picked) {
        const range = notesRange(n.verses);
        if (n.tag === "heading" || sections.length === 0) {
          sections.push({ title: n.tag === "heading" ? n.text : "", range: n.tag === "heading" ? range : null, items: [] });
          if (n.tag === "heading") continue;
        }
        const last = sections[sections.length - 1];
        sections[sections.length - 1] = { ...last, items: [...last.items, { range, text: n.text }] };
      }
      patchBlock(target.id, { ...target.content, sections });
    } else if (target.type === "richtext") {
      const html = target.content.html.replace(/<p><\/p>$/, "");
      patchBlock(target.id, { html: html + picked.map((n) => `<p>${escapeHtml(withRef(n))}</p>`).join("") });
    }
    setDirty(true);
    const usedIn = target === "title" ? "標題" : sectionName(target);
    const updated = await Promise.all(picked.map((n) => updateNote(token, n, { usedIn })));
    setNotes((prev) => prev.map((n) => updated.find((u) => u.id === n.id) ?? n));
    setChecked(new Set());
  }

  async function removeChecked() {
    if (!token) return;
    const picked = notes.filter((n) => checked.has(n.id));
    if (!confirm(`刪除勾選的 ${picked.length} 則筆記？`)) return;
    await Promise.all(picked.map((n) => deleteNote(token, n)));
    setNotes((prev) => prev.filter((n) => !checked.has(n.id)));
    setChecked(new Set());
  }

  async function saveEdit() {
    if (!token || !editing) return;
    const note = notes.find((n) => n.id === editing.id);
    setEditing(null);
    if (!note || note.text === editing.text.trim() || !editing.text.trim()) return;
    const updated = await updateNote(token, note, { text: editing.text.trim() });
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
  }

  const reading = readingBlock(article);
  const overview = blocks.some((b) => b.type === "outline");
  const passage = reading?.content.ranges.length
    ? formatVerseRef(reading.content.ranges)
    : overview
      ? "書卷鳥瞰"
      : "";
  const targets = blocks.filter((b) => b.type !== "verse");
  const pickedCount = checked.size;

  return (
    <div className={`studio flex min-h-screen flex-col bg-st-bg text-st-ink ${night ? "studio-night" : ""}`}>
      <WriterHeader date={date} mode="write" status={status}>
        <button
          type="button"
          onClick={toggleTheme}
          aria-pressed={night}
          aria-label={night ? "切換為淺色主題" : "切換為深色主題"}
          className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-st-line-strong text-st-ink-2 hover:text-st-ink"
        >
          {night ? (
            <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
          ) : (
            <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" /></svg>
          )}
        </button>
        <button type="button" onClick={save} disabled={busy || !article} className={stBtnSecondary}>存成草稿</button>
        {article?.status === "draft" && (
          <button type="button" onClick={submit} disabled={busy} className={stBtnPrimary}>送出校閱</button>
        )}
      </WriterHeader>

      <div className="flex flex-1 flex-wrap items-stretch">
        <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-4 border-r border-st-line bg-st-sunken px-4 pb-7 pt-5 lg:max-w-[400px]">
          {comments.length > 0 && (
            <section aria-label="校稿同工留話" className="flex flex-col gap-2 rounded-xl border border-st-gold bg-st-warm p-3">
              {comments.map((c) => (
                <div key={c.id} className="text-sm">
                  <div className="text-xs text-st-gold-ink">{c.authorName} · {md(localDay(c.createdAt))}</div>
                  <p className="m-0 whitespace-pre-wrap">{c.text}</p>
                </div>
              ))}
            </section>
          )}

          <Link href={`/studio/write/${date}`} className="block rounded-xl border border-st-line bg-st-surface px-3.5 py-3 text-st-ink no-underline">
            <span className="mb-1.5 flex justify-between gap-2 text-xs text-st-muted">
              <span>{passage || "還沒有經文"}</span>
              <span className="text-st-accent">回到讀經 ↺</span>
            </span>
            <span className="line-clamp-6 block font-serif text-[13px] leading-[1.85] text-st-ink-2">
              {overview && !reading && "讀經模式可以逐章閱讀整卷書，邊讀邊記下大綱的段落。"}
              {reading?.content.verses?.map((v) => (
                <span key={`${v.chapter}:${v.verse}`}>
                  <sup className="text-st-gold-ink">{v.verse}</sup>
                  {v.text}
                </span>
              ))}
            </span>
          </Link>

          <section aria-label="筆記" className="flex flex-col gap-2">
            {notes.length === 0 && (
              <p className="m-0 text-sm text-st-muted">
                還沒有筆記。<Link href={`/studio/write/${date}`}>到讀經模式</Link>邊讀邊記，再回來整理成文章。
              </p>
            )}
            {notes.map((note) => {
              const on = checked.has(note.id);
              return (
                <div
                  key={note.id}
                  className={`flex items-start gap-2.5 rounded-[10px] bg-st-surface px-3 py-2.5 ${on ? "border-2 border-st-accent" : "border border-st-line"}`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => {
                      const next = new Set(checked);
                      if (on) next.delete(note.id);
                      else next.add(note.id);
                      setChecked(next);
                    }}
                    aria-label={`選取筆記：${note.text.slice(0, 20)}`}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      {note.tag && <span className={`rounded-full px-2 py-px ${NOTE_TAGS[note.tag].cls}`}>{NOTE_TAGS[note.tag].label}</span>}
                      <span className="text-st-muted">{rangeLabel(note.verses)}</span>
                      {note.usedIn && <span className="text-st-sage-ink">· 已加入{note.usedIn}</span>}
                    </div>
                    {editing?.id === note.id ? (
                      <textarea
                        autoFocus
                        aria-label="編輯筆記"
                        value={editing.text}
                        onChange={(e) => setEditing({ id: note.id, text: e.target.value })}
                        onBlur={saveEdit}
                        rows={3}
                        className="mt-1 w-full rounded-md border border-st-accent bg-st-surface p-1.5 text-sm leading-relaxed text-st-ink outline-none"
                      />
                    ) : (
                      <div className={`mt-1 whitespace-pre-wrap leading-[1.7] ${note.tag === "heading" ? "font-semibold" : ""} ${note.usedIn ? "text-st-muted" : ""}`}>
                        {note.text}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditing({ id: note.id, text: note.text })}
                    aria-label="編輯筆記"
                    className="flex rounded p-0.5 text-st-muted hover:text-st-ink"
                  >
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4l10.5-10.5a2.83 2.83 0 1 0-4-4L4 16v4" /><path d="M13.5 6.5l4 4" /></svg>
                  </button>
                </div>
              );
            })}
          </section>

          {pickedCount > 0 && (
            <section aria-label="把勾選的筆記加入" className="sticky bottom-3 flex flex-col gap-2 rounded-xl bg-st-ink p-3 text-st-bg">
              <span className="text-[13px]">已勾選 {pickedCount} 則，複製到：</span>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => copyTo("title")} className="h-[34px] rounded-lg border border-st-faint px-3 text-[13px] hover:bg-white/10">標題</button>
                {targets.map((b, i) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => copyTo(b)}
                    className={`h-[34px] rounded-lg px-3 text-[13px] ${i === 0 ? "bg-st-gold font-medium text-[#1d2027]" : "border border-st-faint hover:bg-white/10"}`}
                  >
                    {sectionName(b)}
                  </button>
                ))}
                <button type="button" onClick={removeChecked} className="h-[34px] rounded-lg border border-st-faint px-2.5 text-[13px] hover:bg-white/10">刪除</button>
              </div>
            </section>
          )}
        </aside>

        <main className="flex min-w-0 flex-[999_1_560px] justify-center px-4 pb-12 pt-8 sm:px-7">
          <article className="flex w-full max-w-[680px] flex-col gap-6 rounded-md bg-st-surface px-6 pb-14 pt-10 sm:px-13">
            <div className="text-xs tracking-[.06em] text-st-gold-ink">
              {fullDate(date)}{passage ? ` · ${passage}` : ""}
            </div>
            <label htmlFor="title" className="sr-only">標題</label>
            <input
              id="title"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
              placeholder="標題"
              className="-mt-3.5 w-full border-none bg-transparent p-0 font-serif text-[34px] font-semibold leading-snug text-st-ink placeholder:text-st-placeholder outline-none"
            />

            {blocks.map((b) => {
              if (b.type === "verse" && b.subheading === null) return null;
              if (b.type === "verse") {
                return (
                  <div key={b.id} className="flex flex-col gap-2">
                    <div className={sectionLabel}>{b.subheading}</div>
                    <div className="flex items-start gap-3.5 rounded-[10px] bg-st-sunken px-4.5 py-3.5">
                      <p className="m-0 flex-1 font-serif text-[17px] italic leading-[1.9] text-st-accent">
                        {b.content.verses?.map((v) => v.text).join("") || (
                          <span className="not-italic text-st-placeholder">在讀經模式選好經文，按「設為背誦經文」</span>
                        )}
                      </p>
                      <Link href={`/studio/write/${date}`} className="flex h-8 flex-none items-center rounded-lg border border-st-line-strong px-2.5 text-xs text-st-ink no-underline">
                        {b.content.ranges.length ? formatVerseRef(b.content.ranges) : "選經文"} ↺
                      </Link>
                    </div>
                  </div>
                );
              }
              return (
                <div key={b.id} className="flex flex-col gap-2">
                  <div className={sectionLabel}>{sectionName(b)}</div>
                  {b.type === "questions" ? (
                    <QuestionsBlockEditor
                      appearance="paper"
                      items={b.content.items.length ? b.content.items : [""]}
                      onChange={(items) => patchBlock(b.id, { items })}
                    />
                  ) : b.type === "outline" ? (
                    <OutlineBlockEditor appearance="paper" content={b.content} onChange={(content) => patchBlock(b.id, content)} />
                  ) : (
                    <RichtextBlockEditor appearance="paper" html={b.content.html} onChange={(html) => patchBlock(b.id, { html })} />
                  )}
                </div>
              );
            })}
          </article>
        </main>
      </div>
    </div>
  );
}
