"use client";

import { getBibleBooks, lookupVerses } from "@/lib/api";
import type { BibleBook, VerseRange, VerseResultResponse } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import LookupVerseBlock from "./LookupVerseBlock";

type Props = {
  onChange: (ranges: VerseRange[]) => void;
  initialRanges?: VerseRange[];
};

type TempForm = {
  bookIdx: number;
  chapterStart: number;
  verseStart: number;
  isRange: boolean;
  chapterEnd: number;
  verseEnd: number;
};

type CommittedRange = {
  range: VerseRange;
  preview: VerseResultResponse;
};

const emptyForm: TempForm = {
  bookIdx: 0,
  chapterStart: 1,
  verseStart: 1,
  isRange: false,
  chapterEnd: 1,
  verseEnd: 1,
};

const smSelect =
  "rounded-md border border-pebble-200 bg-white px-2.5 py-1.5 text-sm text-pebble-900 outline-none focus:border-iris-400 focus:ring-2 focus:ring-iris-400/20 transition";

function buildRef(book: BibleBook, f: TempForm): string {
  const abbr = book.abbrZh;
  if (!f.isRange) return `${abbr}${f.chapterStart}:${f.verseStart}`;
  if (f.chapterEnd === f.chapterStart)
    return `${abbr}${f.chapterStart}:${f.verseStart}-${f.verseEnd}`;
  return `${abbr}${f.chapterStart}:${f.verseStart}-${f.chapterEnd}:${f.verseEnd}`;
}

function buildRange(book: BibleBook, f: TempForm): VerseRange {
  const base = {
    zh: book.zh,
    abbrZh: book.abbrZh,
    en: book.en,
    abbrEn: book.abbrEn,
    chapterStart: f.chapterStart,
    verseStart: f.verseStart,
  };
  if (!f.isRange) return base;
  return { ...base, chapterEnd: f.chapterEnd, verseEnd: f.verseEnd };
}

export default function VerseBlockEditor({ onChange, initialRanges }: Props) {
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [committed, setCommitted] = useState<CommittedRange[]>([]);
  const [form, setForm] = useState<TempForm>({ ...emptyForm });
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    getBibleBooks().then(setBooks);
  }, []);

  // Pre-populate committed ranges from initialRanges once books are loaded
  useEffect(() => {
    if (books.length === 0 || !initialRanges?.length || initializedRef.current)
      return;
    initializedRef.current = true;

    initialRanges.forEach((r) => {
      const bookIdx = Math.max(
        books.findIndex((b) => b.abbrZh === r.abbrZh),
        0,
      );
      const f: TempForm = {
        bookIdx,
        chapterStart: r.chapterStart,
        verseStart: r.verseStart,
        isRange: !!(r.chapterEnd && r.verseEnd),
        chapterEnd: r.chapterEnd ?? r.chapterStart,
        verseEnd: r.verseEnd ?? r.verseStart,
      };
      const book = books[bookIdx];
      if (!book) return;
      lookupVerses(buildRef(book, f))
        .then((preview) => {
          setCommitted((prev) => {
            const next = [...prev, { range: buildRange(book, f), preview }];
            onChange(next.map((c) => c.range));
            return next;
          });
        })
        .catch(() => {});
    });
  }, [books, initialRanges, onChange]);

  const book = books[form.bookIdx];
  const chapCount = book?.chapters.length ?? 1;
  const verseCountStart = book
    ? (book.chapters[form.chapterStart - 1] ?? 1)
    : 1;
  const verseCountEnd = book ? (book.chapters[form.chapterEnd - 1] ?? 1) : 1;

  function setField<K extends keyof TempForm>(key: K, val: TempForm[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: val };
      if (key === "chapterStart") {
        const max = book?.chapters[(val as number) - 1] ?? 1;
        next.verseStart = Math.min(next.verseStart, max);
        if (!next.isRange || next.chapterEnd < (val as number)) {
          next.chapterEnd = val as number;
          next.verseEnd = Math.min(next.verseEnd, max);
        }
      }
      if (key === "chapterEnd") {
        const max = book?.chapters[(val as number) - 1] ?? 1;
        next.verseEnd = Math.min(next.verseEnd, max);
      }
      return next;
    });
  }

  function openDialog() {
    setForm({ ...emptyForm });
    setAddError(null);
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  async function handleAdd() {
    if (!book) return;
    setAddError(null);
    setIsAdding(true);
    try {
      const preview = await lookupVerses(buildRef(book, form));
      const range = buildRange(book, form);
      setCommitted((prev) => {
        const next = [...prev, { range, preview }];
        onChange(next.map((c) => c.range));
        return next;
      });
      closeDialog();
    } catch {
      setAddError("找不到經文，請確認範圍是否正確");
    } finally {
      setIsAdding(false);
    }
  }

  function handleRemove(idx: number) {
    setCommitted((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      onChange(next.map((c) => c.range));
      return next;
    });
  }

  if (books.length === 0) {
    return <p className="text-xs text-pebble-400">載入書卷清單中…</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Committed ranges */}
      {committed.length === 0 && (
        <p className="text-xs text-pebble-300">尚未加入任何經文段落</p>
      )}
      {committed.map((c, i) => (
        <LookupVerseBlock
          key={i}
          ranges={c.preview.ranges}
          verses={c.preview.verses}
          onRemove={() => handleRemove(i)}
        />
      ))}

      {/* Add button */}
      <button
        type="button"
        onClick={openDialog}
        className="self-start rounded-md border border-pebble-200 px-3 py-1.5 text-xs text-pebble-600 hover:border-pebble-300 hover:text-pebble-800 transition-colors"
      >
        ＋ 新增經文
      </button>

      {/* Add dialog */}
      <dialog
        ref={dialogRef}
        className="m-auto rounded-xl border border-pebble-200 bg-white p-6 shadow-lg backdrop:bg-black/30 w-full max-w-md"
        onCancel={closeDialog}
      >
        <h3 className="text-sm font-semibold text-pebble-800 mb-4">
          新增經文段落
        </h3>

        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2.5">
          {/* Book */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-pebble-500">書卷</label>
            <select
              value={form.bookIdx}
              onChange={(e) => setField("bookIdx", Number(e.target.value))}
              className={smSelect}
            >
              {books.map((b, i) => (
                <option key={b.id} value={i}>
                  {b.zh}
                </option>
              ))}
            </select>
          </div>

          {/* Chapter start */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-pebble-500">章</label>
            <select
              value={form.chapterStart}
              onChange={(e) => setField("chapterStart", Number(e.target.value))}
              className={`${smSelect} w-16`}
            >
              {Array.from({ length: chapCount }, (_, i) => i + 1).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Verse start */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-pebble-500">節</label>
            <select
              value={form.verseStart}
              onChange={(e) => setField("verseStart", Number(e.target.value))}
              className={`${smSelect} w-16`}
            >
              {Array.from({ length: verseCountStart }, (_, i) => i + 1).map(
                (v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ),
              )}
            </select>
          </div>

          {/* Range toggle */}
          <label className="flex items-center gap-1.5 h-9 cursor-pointer select-none text-sm text-pebble-600 mt-5 ml-1">
            <input
              type="checkbox"
              checked={form.isRange}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  isRange: e.target.checked,
                  chapterEnd: prev.chapterStart,
                  verseEnd: prev.verseStart,
                }))
              }
              className="accent-iris-500"
            />
            範圍
          </label>

          {/* End chapter + verse */}
          {form.isRange && (
            <>
              <span className="text-pebble-400 text-sm flex items-center justify-end mt-5 mr-2">
                至
              </span>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-pebble-500">章</label>
                <select
                  value={form.chapterEnd}
                  onChange={(e) =>
                    setField("chapterEnd", Number(e.target.value))
                  }
                  className={`${smSelect} w-16`}
                >
                  {Array.from({ length: chapCount }, (_, i) => i + 1)
                    .filter((c) => c >= form.chapterStart)
                    .map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-pebble-500">節</label>
                <select
                  value={form.verseEnd}
                  onChange={(e) => setField("verseEnd", Number(e.target.value))}
                  className={`${smSelect} w-16`}
                >
                  {Array.from({ length: verseCountEnd }, (_, i) => i + 1)
                    .filter((v) =>
                      form.chapterEnd === form.chapterStart
                        ? v >= form.verseStart
                        : true,
                    )
                    .map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                </select>
              </div>
            </>
          )}
        </div>

        {addError && <p className="mt-3 text-xs text-red-500">{addError}</p>}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={handleAdd}
            disabled={isAdding}
            className="rounded-lg bg-iris-500 px-4 py-2 text-sm font-semibold text-white hover:bg-iris-600 disabled:opacity-50 transition-colors"
          >
            {isAdding ? "查詢中…" : "新增"}
          </button>
          <button
            type="button"
            onClick={closeDialog}
            className="rounded-lg border border-pebble-200 px-4 py-2 text-sm text-pebble-600 hover:border-pebble-300 transition-colors"
          >
            取消
          </button>
        </div>
      </dialog>
    </div>
  );
}
