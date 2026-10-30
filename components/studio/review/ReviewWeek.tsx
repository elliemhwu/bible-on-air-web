"use client";

import { OutlineBlock } from "@/components/reader/OutlineBlock";
import OutlineBlockEditor from "@/components/studio/OutlineBlockEditor";
import QuestionsBlockEditor from "@/components/studio/QuestionsBlockEditor";
import RichtextBlockEditor from "@/components/studio/RichtextBlockEditor";
import { StudioPage } from "@/components/studio/shell/StudioHeader";
import {
  addComment,
  batchReview,
  getArticleById,
  getAssignments,
  getComments,
  replaceBlocks,
  updateArticle,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { isManager } from "@/lib/roles";
import { stBtnPrimary, stBtnSecondary } from "@/lib/styles";
import type { Article, ArticleComment, Block, BlockInput } from "@/lib/types";
import { isReviewed, useWeek, writingState, type DayInfo } from "@/lib/useWeek";
import { formatVerseRef } from "@/lib/utils";
import { addDays, fullDate, localDay, md, mondayOf, today, weekLabel } from "@/lib/week";
import { blockContent, readingBlock } from "@/lib/writing";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const AUTOSAVE_MS = 1500;
const sectionLabel = "text-xs font-medium tracking-[.08em] text-st-gold-ink";

function dayStatus(d: DayInfo): { label: string; cls: string } {
  if (isReviewed(d.article)) return { label: "✓", cls: "text-st-sage-ink" };
  const w = writingState(d.article);
  if (w === "submitted") return { label: "待校閱", cls: "rounded-full bg-st-gold-soft px-2 text-st-gold-soft-ink" };
  return { label: w === "drafting" ? "撰寫中" : "未開始", cls: "text-st-muted" };
}

/** 校稿同工｜校閱: read the week's devotions, fix them in place, and sign them off */
export default function ReviewWeek({ week, date }: { week?: string; date?: string }) {
  const { token, user } = useAuth();
  const router = useRouter();
  const thisWeek = mondayOf(today());
  const [nextWeek, setNextWeek] = useState<string | null>(null);
  const lookUp = !week && !!user && !isManager(user);
  // Without a week in the URL, a reviewer opens the week they review next (or this week)
  const monday = week ?? (lookUp ? nextWeek : thisWeek);

  useEffect(() => {
    if (!lookUp || !token || !user) return;
    getAssignments(token, thisWeek, addDays(thisWeek, 120), user.id)
      .then((list) => {
        const next = list.find((a) => a.team === "reviewer");
        setNextWeek(next ? mondayOf(next.date) : thisWeek);
      })
      .catch(() => setNextWeek(thisWeek));
  }, [lookUp, token, user, thisWeek]);

  if (!monday) return <StudioPage><p className="px-8 py-10 text-sm text-st-muted">載入中…</p></StudioPage>;
  return <ReviewBoard monday={monday} date={date} onPick={(d) => router.replace(`/studio/review?week=${monday}&date=${d}`)} />;
}

function ReviewBoard({ monday, date, onPick }: { monday: string; date?: string; onPick: (date: string) => void }) {
  const { token, user } = useAuth();
  const { days, reload } = useWeek(monday);
  const [loaded, setArticle] = useState<Article | null>(null);
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState("");
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [messageOpen, setMessageOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);

  const reviewer = days.find((d) => d.assignees.reviewer)?.assignees.reviewer;
  const fallback = days.find((d) => writingState(d.article) === "submitted" && !isReviewed(d.article)) ?? days[0];
  const selected = days.find((d) => d.date === date) ?? fallback;
  const selectedId = selected?.article?.id;

  const article = loaded && loaded.id === selectedId ? loaded : null;

  useEffect(() => {
    if (!token || !selectedId) return;
    let cancelled = false;
    Promise.all([getArticleById(token, selectedId), getComments(token, selectedId)]).then(([a, c]) => {
      if (cancelled) return;
      setArticle(a);
      setTitle(a.title ?? "");
      setBlocks([...a.blocks].sort((x, y) => x.order - y.order));
      setComments(c);
      setChanged(new Set());
      setDirty(false);
      setStatus("");
    });
    return () => {
      cancelled = true;
    };
  }, [token, selectedId]);

  const editable = article?.status === "pending_review" || article?.status === "approved";

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
      await Promise.all([updateArticle(token, article.date, { title }), replaceBlocks(token, article.date, input)]);
      setDirty(false);
      setStatus("修改已儲存");
      return true;
    } catch {
      setStatus("儲存失敗");
      return false;
    } finally {
      saving.current = false;
    }
  }, [token, article, blocks, title]);

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(save, AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [dirty, save]);

  function patchBlock(id: string, content: Block["content"]) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? ({ ...b, content } as Block) : b)));
    setChanged((prev) => new Set(prev).add(id));
    setDirty(true);
  }

  async function markReviewed() {
    if (!token || !article) return;
    setBusy(true);
    try {
      if (dirty && !(await save())) return;
      await batchReview(token, [article.id]);
      await reload();
      setArticle({ ...article, status: "approved" });
      setStatus("已標記為校閱完成");
      const next = days.find((d) => d.date > article.date && writingState(d.article) === "submitted" && !isReviewed(d.article));
      onPick(next?.date ?? article.date);
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage() {
    if (!token || !article || !message.trim()) return;
    setComments(await addComment(token, article.id, message));
    setMessage("");
    setMessageOpen(false);
    setStatus("已留話給寫作同工");
  }

  const writer = selected?.assignees.writer?.userName;
  const reading = readingBlock(article);
  const passage = reading?.content.ranges.length ? formatVerseRef(reading.content.ranges) : selected?.passage;
  const highlight = (id: string) => (changed.has(id) ? "rounded-md bg-st-highlight -mx-2 px-2" : "");

  return (
    <StudioPage>
      <div className="flex flex-1 flex-wrap items-stretch">
        <nav aria-label="本週稿件" className="flex min-w-0 flex-[1_1_240px] flex-col gap-1 border-r border-st-line bg-st-sunken px-3 py-4 lg:max-w-[280px]">
          <div className="flex items-center gap-1 px-2 pb-2 text-sm text-st-muted">
            <Link href={`/studio/review?week=${addDays(monday, -7)}`} aria-label="上一週" className="rounded px-1.5 no-underline hover:bg-st-soft">‹</Link>
            <span className="flex-1">
              {weekLabel(monday)}
              {reviewer && ` · ${reviewer.userId === user?.id ? "你負責校閱" : reviewer.userName}`}
            </span>
            <Link href={`/studio/review?week=${addDays(monday, 7)}`} aria-label="下一週" className="rounded px-1.5 no-underline hover:bg-st-soft">›</Link>
          </div>
          {days.map((d) => {
            const s = dayStatus(d);
            const current = d.date === selected?.date;
            return (
              <button
                key={d.date}
                type="button"
                onClick={() => onPick(d.date)}
                aria-current={current ? "page" : undefined}
                className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm ${current ? "bg-st-surface font-medium shadow-sm" : "hover:bg-st-surface/60"}`}
              >
                <span>{md(d.date)} {d.passage || "未安排"}</span>
                <span className={`shrink-0 whitespace-nowrap text-xs ${s.cls}`}>{s.label}</span>
              </button>
            );
          })}
        </nav>

        <main className="flex min-w-0 flex-[999_1_560px] flex-col items-center gap-4 px-4 py-6 sm:px-8">
          <div className="flex w-full max-w-[680px] flex-wrap items-center gap-2.5">
            <span className="flex-1 text-sm text-st-ink-2">
              {article
                ? `寫作同工：${writer ?? "—"}${editable ? " · 點文字就能直接修改" : ""}`
                : selected?.article
                  ? "載入中…"
                  : "這天還沒有稿件"}
              {status && <span className="ml-2 text-st-muted" aria-live="polite">· {status}</span>}
            </span>
            {article && (
              <button type="button" onClick={() => setMessageOpen(!messageOpen)} aria-expanded={messageOpen} className={stBtnSecondary}>
                留話給寫作同工
              </button>
            )}
            {article?.status === "pending_review" && (
              <button type="button" onClick={markReviewed} disabled={busy} className={stBtnPrimary}>標記已校閱</button>
            )}
            {article && isReviewed(article) && <span className="text-sm text-st-sage-ink">✓ 已校閱</span>}
          </div>

          {(messageOpen || comments.length > 0) && article && (
            <section aria-label="留話" className="flex w-full max-w-[680px] flex-col gap-2 rounded-xl border border-st-line bg-st-surface p-3.5">
              {comments.map((c) => (
                <div key={c.id} className="text-sm">
                  <span className="text-xs text-st-muted">{c.authorName} · {md(localDay(c.createdAt))}</span>
                  <p className="m-0 whitespace-pre-wrap">{c.text}</p>
                </div>
              ))}
              {messageOpen && (
                <div className="flex flex-col gap-2">
                  <label htmlFor="message" className="sr-only">留話內容</label>
                  <textarea
                    id="message"
                    autoFocus
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    placeholder="寫給寫作同工的話，會顯示在他的寫作頁面"
                    className="rounded-lg border border-st-line-strong bg-st-surface p-2.5 text-sm text-st-ink outline-none focus:border-st-accent"
                  />
                  <button type="button" onClick={sendMessage} disabled={!message.trim()} className={`${stBtnPrimary} self-end`}>送出</button>
                </div>
              )}
            </section>
          )}

          {article && (
            <article className="flex w-full max-w-[680px] flex-col gap-6 rounded-md bg-st-surface px-6 pb-14 pt-10 sm:px-13">
              <div className="text-xs tracking-[.06em] text-st-gold-ink">{fullDate(article.date)}{passage ? ` · ${passage}` : ""}</div>
              {editable ? (
                <input
                  aria-label="標題"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setChanged((p) => new Set(p).add("title")); setDirty(true); }}
                  className={`-mt-3.5 w-full border-none bg-transparent p-0 font-serif text-[34px] font-semibold leading-snug text-st-ink outline-none ${changed.has("title") ? "bg-st-highlight" : ""}`}
                />
              ) : (
                <h1 className="-mt-3.5 mb-0 font-serif text-[34px] font-semibold leading-snug">{title || "（無標題）"}</h1>
              )}
              {blocks.map((b) => {
                if (b.type === "verse") {
                  if (b.subheading === null) return null;
                  return (
                    <div key={b.id} className="flex flex-col gap-2">
                      <div className={sectionLabel}>{b.subheading}</div>
                      <p className="m-0 font-serif text-[17px] leading-[1.9] text-st-accent">
                        {b.content.verses?.map((v) => v.text).join("")}
                        {b.content.ranges.length > 0 && `（${formatVerseRef(b.content.ranges)}）`}
                      </p>
                    </div>
                  );
                }
                return (
                  <div key={b.id} className="flex flex-col gap-2">
                    <div className={sectionLabel}>{b.subheading ?? "書卷介紹"}</div>
                    <div className={highlight(b.id)}>
                      {b.type === "questions" ? (
                        editable ? (
                          <QuestionsBlockEditor appearance="paper" items={b.content.items} onChange={(items) => patchBlock(b.id, { items })} />
                        ) : (
                          <ol className="m-0 pl-6 text-base leading-[1.9]">
                            {b.content.items.map((q, i) => <li key={i}>{q}</li>)}
                          </ol>
                        )
                      ) : b.type === "outline" ? (
                        editable ? (
                          <OutlineBlockEditor appearance="paper" content={b.content} onChange={(content) => patchBlock(b.id, content)} />
                        ) : (
                          <OutlineBlock block={{ ...b, subheading: null }} />
                        )
                      ) : editable ? (
                        <RichtextBlockEditor appearance="paper" html={b.content.html} onChange={(html) => patchBlock(b.id, { html })} />
                      ) : (
                        <div className="prose-tc text-base leading-[2] [&_p]:indent-8" dangerouslySetInnerHTML={{ __html: b.content.html }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </article>
          )}
          {article && changed.size > 0 && (
            <p className="m-0 text-sm text-st-muted">黃底是你這次修改的地方，修改會自動儲存；需要說明的話，可以留話給寫作同工。</p>
          )}
          {article && article.status === "draft" && (
            <p className="m-0 text-sm text-st-muted">寫作同工還沒送出，送出後就能校閱。</p>
          )}
        </main>
      </div>
    </StudioPage>
  );
}
