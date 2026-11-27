"use client";

import { StudioPage } from "@/components/studio/shell/StudioHeader";
import WeekNav from "@/components/studio/shell/WeekNav";
import { batchCoverImages, getArticleById, uploadImage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { stBtnPrimary, stBtnSecondary, stCard } from "@/lib/styles";
import type { Article } from "@/lib/types";
import { useWeek } from "@/lib/useWeek";
import { formatVerseRef } from "@/lib/utils";
import { md, weekday, weekLabel } from "@/lib/week";
import { memoryBlock } from "@/lib/writing";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/** "誰是忠心…呢？（太24:45）", or null when the day has no memory verse yet */
function memoryText(article: Article | undefined): string | null {
  const block = memoryBlock(article ?? null);
  const text = block?.content.verses?.map((v) => v.text).join("");
  return text ? `${text}（${formatVerseRef(block!.content.ranges)}）` : null;
}

/** 圖片同工｜本週圖片: one memory-verse image per day */
export default function WeekImages({ monday }: { monday: string }) {
  const { token } = useAuth();
  const { days, isLoading, reload } = useWeek(monday);
  const [full, setFull] = useState<Map<string, Article>>(new Map());
  const [images, setImages] = useState<(string | null)[]>(Array(6).fill(null));
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropOn, setDropOn] = useState<number | null>(null);
  const [uploading, setUploading] = useState<number | "bulk" | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const replaceInput = useRef<HTMLInputElement>(null);
  const replaceAt = useRef<number | null>(null);

  const articleIds = days.map((d) => d.article?.id ?? "").join(",");
  const savedImages = days.map((d) => d.article?.coverImageUrl ?? null);

  // Local edits start over whenever the saved images change
  const savedKey = savedImages.join("|");
  const [editsFor, setEditsFor] = useState(savedKey);
  if (editsFor !== savedKey) {
    setEditsFor(savedKey);
    setImages(savedImages);
  }

  useEffect(() => {
    if (!token) return;
    const ids = articleIds.split(",").filter(Boolean);
    Promise.all(ids.map((id) => getArticleById(token, id).catch(() => null))).then((list) =>
      setFull(new Map(list.filter((a): a is Article => !!a).map((a) => [a.date, a]))),
    );
  }, [token, articleIds]);

  const dirty = images.some((url, i) => url !== savedImages[i]);
  const verses = days.map((d) => memoryText(full.get(d.date)));

  async function upload(i: number, file: File) {
    if (!token) return;
    setUploading(i);
    try {
      const url = await uploadImage(token, file);
      setImages((prev) => prev.map((u, j) => (j === i ? url : u)));
    } catch {
      setStatus("上傳失敗，請再試一次");
    } finally {
      setUploading(null);
    }
  }

  /** Fill the empty days (that have an article) in order */
  async function uploadMany(files: FileList) {
    if (!token) return;
    const empty = days.map((d, i) => (d.article && !images[i] ? i : -1)).filter((i) => i >= 0);
    setUploading("bulk");
    try {
      const next = [...images];
      for (const [k, file] of Array.from(files).slice(0, empty.length).entries()) {
        next[empty[k]] = await uploadImage(token, file);
      }
      setImages(next);
      if (files.length > empty.length) setStatus(`只有 ${empty.length} 天缺圖片，多的 ${files.length - empty.length} 張沒有放上去`);
    } catch {
      setStatus("上傳失敗，請再試一次");
    } finally {
      setUploading(null);
    }
  }

  async function save() {
    if (!token) return;
    setSaving(true);
    try {
      const items = days
        .map((d, i) => ({ date: d.date, imageUrl: images[i] }))
        .filter((item, i) => days[i].article && item.imageUrl !== savedImages[i]);
      await batchCoverImages(token, items);
      await reload();
      setStatus("已儲存");
    } catch {
      setStatus("儲存失敗，請再試一次");
    } finally {
      setSaving(false);
    }
  }

  async function copyVerses() {
    const text = days
      .map((d, i) => (verses[i] ? `${md(d.date)}（${weekday(d.date)}）${verses[i]}` : null))
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setStatus("無法複製，請手動選取");
    }
  }

  const missing = days.filter((d, i) => d.article && !images[i]).map((d) => md(d.date));
  const verseCount = verses.filter(Boolean).length;

  return (
    <StudioPage>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-7 sm:px-8">
        <WeekNav monday={monday} href={(m) => `/studio/images/${m}`} title={weekLabel(monday)} />

        <section className={`${stCard} overflow-hidden`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-st-line px-5 py-3">
            <button type="button" onClick={copyVerses} disabled={verseCount === 0} className={stBtnSecondary}>
              {copied ? `已複製 ${verseCount} 段背誦經文` : "複製本週背誦經文"}
            </button>
            <label className={`${stBtnPrimary} cursor-pointer ${uploading === "bulk" ? "pointer-events-none opacity-50" : ""}`}>
              {uploading === "bulk" ? "上傳中…" : "上傳圖片"}
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  if (e.target.files?.length) uploadMany(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          {days.map((d, i) => {
            const url = images[i];
            const target = dropOn === i && dragFrom !== null && dragFrom !== i;
            return (
              <div key={d.date} className="flex flex-wrap items-center gap-4 border-b border-st-line/70 px-5 py-3.5 last:border-0">
                <div className="flex min-w-0 flex-[1_1_320px] items-center gap-4">
                  <div className="w-14 shrink-0 text-center">
                    <div className="font-medium tabular-nums">{md(d.date)}</div>
                    <div className="text-xs text-st-muted">週{weekday(d.date)}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-st-ink-2">{d.passage || "未安排"}</div>
                    <div className={`font-serif text-[15px] leading-relaxed ${verses[i] ? "" : "text-st-muted"}`}>
                      {d.article ? verses[i] ?? "寫作同工還沒選背誦經文" : "還沒有稿件"}
                    </div>
                  </div>
                </div>
                <div
                  onDragOver={(e) => { e.preventDefault(); if (dropOn !== i) setDropOn(i); }}
                  onDragLeave={() => setDropOn(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragFrom !== null && dragFrom !== i && d.article && days[dragFrom].article) {
                      const next = [...images];
                      [next[dragFrom], next[i]] = [next[i], next[dragFrom]];
                      setImages(next);
                    }
                    setDragFrom(null);
                    setDropOn(null);
                  }}
                  className={`flex items-center gap-2 rounded-xl p-1 ${target ? "outline-2 outline-dashed outline-st-gold" : ""}`}
                >
                  {url ? (
                    <>
                      <Image
                        src={url}
                        width={80}
                        height={80}
                        unoptimized
                        alt={`${md(d.date)} 的圖片`}
                        draggable
                        onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setDragFrom(i); }}
                        onDragEnd={() => { setDragFrom(null); setDropOn(null); }}
                        className={`h-20 w-20 cursor-grab rounded-lg object-cover ${dragFrom === i ? "opacity-50" : ""} ${url !== savedImages[i] ? "ring-2 ring-st-gold" : ""}`}
                      />
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => setImages((prev) => prev.map((u, j) => (j === i ? null : u)))}
                          aria-label={`移除 ${md(d.date)} 的圖片`}
                          title="移除"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-st-muted hover:bg-st-soft hover:text-st-ink"
                        >
                          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12" /><path d="M9 7V4h6v3" /></svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => { replaceAt.current = i; replaceInput.current?.click(); }}
                          aria-label={`更換 ${md(d.date)} 的圖片`}
                          title="更換"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-st-muted hover:bg-st-soft hover:text-st-ink"
                        >
                          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11a8.1 8.1 0 0 0-15.5-2m-.5-4v4h4" /><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" /></svg>
                        </button>
                      </div>
                    </>
                  ) : (
                    <label
                      className={`flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-st-line-strong text-2xl text-st-muted ${d.article ? "cursor-pointer hover:border-st-accent hover:text-st-accent" : "opacity-40"} ${uploading === i ? "animate-pulse" : ""}`}
                    >
                      <span aria-hidden="true">＋</span>
                      <span className="sr-only">上傳 {md(d.date)} 的圖片</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={!d.article}
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) upload(i, file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            );
          })}
          {isLoading && <p className="px-5 py-3 text-sm text-st-muted">載入中…</p>}
        </section>

        <input
          ref={replaceInput}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && replaceAt.current !== null) upload(replaceAt.current, file);
            e.target.value = "";
          }}
        />

        <div className="flex flex-wrap items-center justify-end gap-3">
          <span className="text-sm text-st-ink-2" aria-live="polite">
            {status ?? (missing.length ? `還沒有圖片：${missing.join("、")}` : "每一天都有圖片了")}
          </span>
          <button type="button" onClick={save} disabled={saving || !dirty} className={stBtnPrimary}>
            {saving ? "儲存中…" : "儲存"}
          </button>
        </div>
      </main>
    </StudioPage>
  );
}
