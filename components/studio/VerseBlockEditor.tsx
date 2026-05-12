"use client";

import { getBibleBooks, lookupVerses } from "@/lib/api";
import type { BibleBook, VerseRange, VerseResultResponse } from "@/lib/types";
import { useEffect, useMemo, useRef, useState } from "react";
import LookupVerseBlock from "./LookupVerseBlock";

type Props = {
  onChange: (ranges: VerseRange[]) => void;
  initialRanges?: VerseRange[];
};

type EditingRange = {
  bookIdx: number;
  chapterStart: number;
  verseStart: number;
  isRange: boolean;
  chapterEnd: number;
  verseEnd: number;
  preview: VerseResultResponse | null;
};

const emptyForm: EditingRange = {
  bookIdx: 0,
  chapterStart: 1,
  verseStart: 1,
  isRange: false,
  chapterEnd: 1,
  verseEnd: 1,
  preview: null,
};

function buildRef(book: BibleBook, r: EditingRange): string {
  const abbr = book.abbrZh;
  if (!r.isRange) return `${abbr}${r.chapterStart}:${r.verseStart}`;
  if (r.chapterEnd === r.chapterStart)
    return `${abbr}${r.chapterStart}:${r.verseStart}-${r.verseEnd}`;
  return `${abbr}${r.chapterStart}:${r.verseStart}-${r.chapterEnd}:${r.verseEnd}`;
}

function buildRange(book: BibleBook, r: EditingRange): VerseRange {
  const base = {
    zh: book.zh,
    abbrZh: book.abbrZh,
    en: book.en,
    abbrEn: book.abbrEn,
    chapterStart: r.chapterStart,
    verseStart: r.verseStart,
  };
  if (!r.isRange) return base;
  return { ...base, chapterEnd: r.chapterEnd, verseEnd: r.verseEnd };
}

export default function VerseBlockEditor({ onChange, initialRanges }: Props) {
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [forms, setForms] = useState<EditingRange[]>([{ ...emptyForm }]);
  const [editingIdx, setEditingIdx] = useState(0);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLooking, setIsLooking] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    getBibleBooks().then(setBooks);
  }, []);

  // Pre-populate from initialRanges once books are loaded
  useEffect(() => {
    if (books.length === 0 || !initialRanges?.length || initializedRef.current)
      return;
    initializedRef.current = true;

    const initial: EditingRange[] = initialRanges.map((r) => {
      const bookIdx = Math.max(
        books.findIndex((b) => b.abbrZh === r.abbrZh),
        0,
      );
      const isRange = !!(r.chapterEnd && r.verseEnd);
      return {
        bookIdx,
        chapterStart: r.chapterStart,
        verseStart: r.verseStart,
        isRange,
        chapterEnd: r.chapterEnd ?? r.chapterStart,
        verseEnd: r.verseEnd ?? r.verseStart,
        preview: null,
      };
    });

    // Append an empty editing slot so all initial forms are "committed"
    setForms([...initial, { ...emptyForm }]);
    setEditingIdx(initial.length);

    // Auto-fetch previews for each initial range
    initial.forEach((f, idx) => {
      const b = books[f.bookIdx];
      if (!b) return;
      lookupVerses(buildRef(b, f))
        .then((preview) => {
          setForms((prev) =>
            prev.map((p, i) => (i === idx ? { ...p, preview } : p)),
          );
        })
        .catch(() => {});
    });
  }, [books, initialRanges]);

  const editing = forms[editingIdx];
  const { book, chapCount, verseCountStart, verseCountEnd } = useMemo(() => {
    const theBook = books[editing?.bookIdx];
    return {
      book: theBook,
      chapCount: theBook?.chapters.length ?? 1,
      verseCountStart: theBook
        ? theBook.chapters[editing?.chapterStart - 1]
        : 1,
      verseCountEnd: theBook ? theBook.chapters[editing?.chapterEnd - 1] : 1,
    };
  }, [books, editing]);

  function updateForms(next: EditingRange[]) {
    onChange(
      next
        .filter((_, idx) => idx !== editingIdx)
        .map((f) => buildRange(books[f.bookIdx], f)),
    );

    setForms(next);
  }

  function updateEditing(updater: (prev: EditingRange) => EditingRange) {
    updateForms(forms.map((f, i) => (i === editingIdx ? updater(f) : f)));
  }

  function set<K extends keyof EditingRange>(key: K, val: EditingRange[K]) {
    updateEditing((prev) => {
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

  async function handleLookup(idx: number) {
    if (!book) return;
    setLookupError(null);
    setIsLooking(true);
    try {
      const preview = await lookupVerses(buildRef(book, forms[idx]));
      updateForms(forms.map((f, i) => (i === idx ? { ...f, preview } : f)));
    } catch {
      setLookupError("找不到經文，請確認範圍是否正確");
    } finally {
      setIsLooking(false);
    }
  }

  function handleAdd() {
    onChange(forms.map((f) => buildRange(books[f.bookIdx], f)));

    const next = [...forms, { ...emptyForm }];
    setForms(next);
    setEditingIdx(next.length - 1);
  }

  function handleRemove(idx: number) {
    if (idx === editingIdx) {
      // reset this slot rather than removing, to keep editing in place
      updateForms(forms.map((f, i) => (i === idx ? { ...emptyForm } : f)));
    } else {
      onChange(
        forms
          .filter((_, i) => i !== idx && i !== editingIdx)
          .map((f) => buildRange(books[f.bookIdx], f)),
      );

      const next = forms.filter((_, i) => i !== idx);
      setForms(next);
      setEditingIdx(idx < editingIdx ? editingIdx - 1 : editingIdx);
    }
  }

  const hasNoRanges = forms.every((f) => f.preview === null);

  if (books.length === 0) {
    return <p className="text-xs text-pebble-400">載入書卷清單中…</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ── picker row ── */}
      <div className="flex flex-wrap items-end gap-2">
        {/* Book */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-pebble-500">書卷</label>
          <select
            value={editing?.bookIdx}
            onChange={(e) => {
              updateEditing(() => ({
                ...emptyForm,
                bookIdx: Number(e.target.value),
              }));
            }}
            className="rounded-md border border-pebble-200 bg-white px-2.5 py-1.5 text-sm text-pebble-900 outline-none focus:border-iris-400 focus:ring-2 focus:ring-iris-400/20 transition"
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
            value={editing?.chapterStart}
            onChange={(e) => set("chapterStart", Number(e.target.value))}
            className="rounded-md border border-pebble-200 bg-white px-2.5 py-1.5 text-sm text-pebble-900 outline-none focus:border-iris-400 focus:ring-2 focus:ring-iris-400/20 transition w-16"
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
            value={editing?.verseStart}
            onChange={(e) => set("verseStart", Number(e.target.value))}
            className="rounded-md border border-pebble-200 bg-white px-2.5 py-1.5 text-sm text-pebble-900 outline-none focus:border-iris-400 focus:ring-2 focus:ring-iris-400/20 transition w-16"
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
        <label className="flex items-center gap-1.5 pb-1.5 cursor-pointer select-none text-sm text-pebble-600">
          <input
            type="checkbox"
            checked={editing?.isRange}
            onChange={(e) => {
              updateEditing((prev) => ({
                ...prev,
                isRange: e.target.checked,
                chapterEnd: prev.chapterStart,
                verseEnd: prev.verseStart,
              }));
            }}
            className="accent-iris-500"
          />
          範圍
        </label>

        {/* End chapter + verse (range only) */}
        {editing?.isRange && (
          <>
            <span className="pb-1.5 text-pebble-400 text-sm">至</span>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-pebble-500">章</label>
              <select
                value={editing?.chapterEnd}
                onChange={(e) => set("chapterEnd", Number(e.target.value))}
                className="rounded-md border border-pebble-200 bg-white px-2.5 py-1.5 text-sm text-pebble-900 outline-none focus:border-iris-400 focus:ring-2 focus:ring-iris-400/20 transition w-16"
              >
                {Array.from({ length: chapCount }, (_, i) => i + 1)
                  .filter((c) => c >= editing?.chapterStart)
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
                value={editing?.verseEnd}
                onChange={(e) => set("verseEnd", Number(e.target.value))}
                className="rounded-md border border-pebble-200 bg-white px-2.5 py-1.5 text-sm text-pebble-900 outline-none focus:border-iris-400 focus:ring-2 focus:ring-iris-400/20 transition w-16"
              >
                {Array.from({ length: verseCountEnd }, (_, i) => i + 1)
                  .filter((v) =>
                    editing?.chapterEnd === editing?.chapterStart
                      ? v >= editing?.verseStart
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

        <button
          type="button"
          onClick={() => handleLookup(editingIdx)}
          disabled={isLooking}
          className="mb-0 pb-1.5 self-end text-sm font-medium text-iris-600 hover:text-iris-700 disabled:opacity-50 transition-colors"
        >
          {isLooking ? "查詢中…" : "查詢"}
        </button>
      </div>

      {/* ── preview list ── */}
      {lookupError && <p className="text-xs text-red-500">{lookupError}</p>}
      {forms.map(
        (f, i) =>
          f.preview && (
            <LookupVerseBlock
              key={i}
              ranges={f.preview.ranges}
              verses={f.preview.verses}
              onAdd={i === editingIdx ? handleAdd : undefined}
              onRemove={() => handleRemove(i)}
            />
          ),
      )}

      {hasNoRanges && (
        <p className="text-xs text-pebble-300">尚未加入任何經文段落</p>
      )}
    </div>
  );
}
