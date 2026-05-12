"use client";

import { getBibleBooks, lookupVerses } from "@/lib/api";
import type { BibleBook, Verse, VerseRange } from "@/lib/types";
import { useFormData } from "@/lib/useFormData";
import { formatLookupRef } from "@/lib/utils";
import { find, isEmpty } from "lodash";
import { useEffect, useRef, useState } from "react";
import LookupVerseBlock from "./LookupVerseBlock";

type Props = {
  ranges?: VerseRange[];
  onChange: (ranges: VerseRange[]) => void;
};

const smSelect =
  "rounded-md border border-pebble-200 bg-white px-2.5 py-1.5 text-sm text-pebble-900 outline-none focus:border-iris-400 focus:ring-2 focus:ring-iris-400/20 transition";

export default function VerseBlockEditor({ ranges = [], onChange }: Props) {
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [previews, setPreviews] = useState<Record<string, Verse[]>>({});
  const {
    formData,
    onFormChange,
    setFormData,
    resetFormData,
    setInitialState,
  } = useFormData({
    abbrZh: "",
    chapterStart: 1,
    verseStart: 1,
    isRange: false,
    chapterEnd: 1,
    verseEnd: 1,
  });
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    getBibleBooks().then((bks) => {
      const defaultAbbrZh = bks[0]?.abbrZh ?? "";
      setInitialState((prev) => ({ ...prev, abbrZh: defaultAbbrZh }));
      onFormChange("abbrZh", defaultAbbrZh);
      setBooks(bks);
    });
  }, []);

  // Pre-populate committed ranges from initialRanges once books are loaded
  useEffect(() => {
    if (books.length === 0 || !ranges?.length || initializedRef.current) return;
    initializedRef.current = true;

    const lookupRefs = ranges
      .map(formatLookupRef)
      .filter((ref): ref is string => ref !== null);

    Promise.all(lookupRefs.map((ref) => lookupVerses(ref))).then((results) => {
      const prev = results.reduce(
        (acc, res, i) => {
          const ref = lookupRefs[i];
          if (ref) {
            acc[ref] = res.verses;
          }
          return acc;
        },
        {} as Record<string, Verse[]>,
      );
      setPreviews(prev);
    });
  }, [books, ranges]);

  const book = find(books, { abbrZh: formData.abbrZh });
  const chapCount = book?.chapters.length ?? 1;
  const verseCountStart = book
    ? (book.chapters[formData.chapterStart - 1] ?? 1)
    : 1;
  const verseCountEnd = book
    ? (book.chapters[formData.chapterEnd - 1] ?? 1)
    : 1;

  function openDialog() {
    resetFormData();
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
    const range = {
      abbrZh: formData.abbrZh,
      zh: book.zh,
      en: book.en,
      abbrEn: book.abbrEn,
      chapterStart: formData.chapterStart,
      verseStart: formData.verseStart,
      chapterEnd: formData.isRange ? formData.chapterEnd : undefined,
      verseEnd: formData.isRange ? formData.verseEnd : undefined,
    };

    onChange([...ranges, range]);

    const ref = formatLookupRef(range);

    try {
      const res = await lookupVerses(ref);
      const verses = res.verses;
      setPreviews((prev) => ({ ...prev, [ref]: verses }));
      closeDialog();
    } catch {
      setAddError("找不到經文，請確認範圍是否正確");
    } finally {
      setIsAdding(false);
    }
  }

  function handleRemove(idx: number) {
    const removingRange = ranges[idx];
    const ref = formatLookupRef(removingRange);
    onChange(ranges.filter((_, i) => i !== idx));
    setPreviews((prev) => {
      const newPreviews = { ...prev };
      delete newPreviews[ref ?? ""];
      return newPreviews;
    });
  }

  if (books.length === 0) {
    return <p className="text-xs text-pebble-400">載入書卷清單中…</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {isEmpty(previews) && (
        <p className="text-xs text-pebble-300">尚未加入任何經文段落</p>
      )}

      {ranges.map((range, idx) => {
        const ref = formatLookupRef(range);
        const verses = previews[ref];
        if (!verses?.length) return null;
        return (
          <LookupVerseBlock
            key={idx}
            ranges={[range]}
            verses={verses}
            onRemove={() => handleRemove(idx)}
          />
        );
      })}

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
              value={formData.abbrZh}
              onChange={(e) => onFormChange("abbrZh", e.target.value)}
              className={smSelect}
            >
              {books.map((b) => (
                <option key={b.id} value={b.abbrZh}>
                  {b.zh}
                </option>
              ))}
            </select>
          </div>

          {/* Chapter start */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-pebble-500">章</label>
            <select
              value={formData.chapterStart}
              onChange={(e) =>
                onFormChange("chapterStart", Number(e.target.value))
              }
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
              value={formData.verseStart}
              onChange={(e) =>
                onFormChange("verseStart", Number(e.target.value))
              }
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
              checked={formData.isRange}
              onChange={(e) =>
                setFormData((prev) => ({
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
          {formData.isRange && (
            <>
              <span className="text-pebble-400 text-sm flex items-center justify-end mt-5 mr-2">
                至
              </span>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-pebble-500">章</label>
                <select
                  value={formData.chapterEnd}
                  onChange={(e) =>
                    onFormChange("chapterEnd", Number(e.target.value))
                  }
                  className={`${smSelect} w-16`}
                >
                  {Array.from({ length: chapCount }, (_, i) => i + 1)
                    .filter((c) => c >= formData.chapterStart)
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
                  value={formData.verseEnd}
                  onChange={(e) =>
                    onFormChange("verseEnd", Number(e.target.value))
                  }
                  className={`${smSelect} w-16`}
                >
                  {Array.from({ length: verseCountEnd }, (_, i) => i + 1)
                    .filter((v) =>
                      formData.chapterEnd === formData.chapterStart
                        ? v >= formData.verseStart
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
