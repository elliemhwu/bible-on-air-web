"use client";

import { getBibleBooks } from "@/lib/api";
import { formatOutlineRange, parseOutlineText, parseRangeInput, rangeProblem, sectionNumber } from "@/lib/outline";
import type { BibleBook, OutlineContent, OutlineItem, OutlineRange, OutlineSection } from "@/lib/types";
import { useEffect, useState } from "react";

type Props = {
  content: OutlineContent;
  onChange: (content: OutlineContent) => void;
  /** "paper": the writing / review pages' palette */
  appearance?: "default" | "paper";
};

const STYLES = {
  default: {
    input:
      "rounded-md border border-pebble-200 bg-white px-2.5 py-1.5 text-sm text-pebble-900 placeholder:text-pebble-300 outline-none focus:border-iris-400 focus:ring-2 focus:ring-iris-400/20",
    invalid: "border-red-400",
    muted: "text-pebble-400",
    error: "text-red-500",
    card: "rounded-lg border border-pebble-200 bg-pebble-50/60 p-3",
    link: "text-iris-600 hover:text-iris-700",
    icon: "text-pebble-300 hover:text-pebble-600 disabled:opacity-20",
  },
  paper: {
    input:
      "rounded-md border border-st-line bg-transparent px-2 py-1 text-[15px] text-st-ink placeholder:text-st-placeholder outline-none focus:border-st-accent",
    invalid: "border-st-danger",
    muted: "text-st-muted",
    error: "text-st-danger",
    card: "rounded-lg border border-st-line bg-st-sunken p-3",
    link: "text-st-accent hover:underline",
    icon: "text-st-faint hover:text-st-ink disabled:opacity-20",
  },
};

function move<T>(list: T[], i: number, dir: -1 | 1): T[] {
  const next = [...list];
  [next[i], next[i + dir]] = [next[i + dir], next[i]];
  return next;
}

/** A passage typed as text ("1:1 - 4:11"); saved when it parses and fits the book */
function RangeInput({
  value,
  onChange,
  chapters,
  label,
  styles,
}: {
  value: OutlineRange | null;
  onChange: (range: OutlineRange | null) => void;
  chapters?: number[];
  label: string;
  styles: (typeof STYLES)["default"];
}) {
  const formatted = value ? formatOutlineRange(value) : "";
  const [text, setText] = useState(formatted);
  const [shownFor, setShownFor] = useState(formatted);
  // Follow changes made elsewhere (e.g. pasting a whole outline)
  if (shownFor !== formatted) {
    setShownFor(formatted);
    setText(formatted);
  }
  const range = parseRangeInput(text);
  const problem = !text.trim() ? null : !range ? "格式：章:節 - 章:節" : rangeProblem(range, chapters);

  return (
    <span className="flex flex-col">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (!text.trim()) onChange(null);
          else if (range && !problem) onChange(range);
        }}
        placeholder="1:1 - 4:11"
        aria-label={label}
        aria-invalid={!!problem}
        className={`${styles.input} w-32 tabular-nums ${problem ? styles.invalid : ""}`}
      />
      {problem && <span className={`text-xs ${styles.error}`}>{problem}</span>}
    </span>
  );
}

/** 本書大綱: numbered sections of the book, each with its passages */
export default function OutlineBlockEditor({ content, onChange, appearance = "default" }: Props) {
  const s = STYLES[appearance];
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);

  useEffect(() => {
    getBibleBooks().then(setBooks).catch(() => setBooks([]));
  }, []);

  const book = books.find((b) => b.abbrZh === content.book);
  const sections = content.sections;
  const setSections = (next: OutlineSection[]) => onChange({ ...content, sections: next });
  const setSection = (i: number, patch: Partial<OutlineSection>) =>
    setSections(sections.map((sec, j) => (j === i ? { ...sec, ...patch } : sec)));
  const setItems = (i: number, items: OutlineItem[]) => setSection(i, { items });

  function applyPaste() {
    const outline = parseOutlineText(pasted, content.book);
    if (!outline) {
      setPasteError("看不出大綱的格式：每行一個大段（例如「一、引言 (1:1 - 4:11)」）或一個段落（例如「1:1 - 2:23 ｜ 家譜」）。");
      return;
    }
    if (sections.length && !confirm("用貼上的內容取代目前的大綱？")) return;
    onChange(outline);
    setPasting(false);
    setPasted("");
    setPasteError(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <span className={s.muted}>書卷</span>
          <select
            value={content.book}
            onChange={(e) => onChange({ ...content, book: e.target.value })}
            className={s.input}
          >
            <option value="">選擇書卷…</option>
            {books.map((b) => (
              <option key={b.abbrZh} value={b.abbrZh}>{b.zh}</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => setPasting(!pasting)} aria-expanded={pasting} className={`text-xs font-medium ${s.link}`}>
          從文字貼上
        </button>
      </div>

      {pasting && (
        <div className={`${s.card} flex flex-col gap-2`}>
          <label htmlFor="outline-paste" className={`text-xs ${s.muted}`}>
            每行一個大段或段落，例如「一、 引言：君王的宣告與預備 (1:1 - 4:11)」、「1:1 - 2:23 ｜ 耶穌基督的家譜」。
          </label>
          <textarea id="outline-paste" rows={6} value={pasted} onChange={(e) => setPasted(e.target.value)} className={`${s.input} font-mono text-xs`} />
          {pasteError && <span className={`text-xs ${s.error}`}>{pasteError}</span>}
          <div className="flex justify-end gap-3 text-sm">
            <button type="button" onClick={() => setPasting(false)} className={s.muted}>取消</button>
            <button type="button" onClick={applyPaste} disabled={!pasted.trim()} className={`font-medium ${s.link}`}>套用</button>
          </div>
        </div>
      )}

      <ol className="flex flex-col gap-3">
        {sections.map((section, i) => (
          <li key={i} className={s.card}>
            <div className="flex flex-wrap items-start gap-2">
              <span className="pt-1.5 font-medium">{sectionNumber(i)}、</span>
              <input
                value={section.title}
                onChange={(e) => setSection(i, { title: e.target.value })}
                placeholder="大段標題，例如「引言：君王的宣告與預備」"
                aria-label={`第${sectionNumber(i)}大段標題`}
                className={`${s.input} min-w-0 flex-[1_1_10rem] font-medium`}
              />
              <RangeInput
                value={section.range}
                onChange={(range) => setSection(i, { range })}
                chapters={book?.chapters}
                label={`第${sectionNumber(i)}大段經文範圍`}
                styles={s}
              />
              <span className="flex gap-0.5 pt-1">
                <button type="button" onClick={() => setSections(move(sections, i, -1))} disabled={i === 0} aria-label="大段上移" className={s.icon}>↑</button>
                <button type="button" onClick={() => setSections(move(sections, i, 1))} disabled={i === sections.length - 1} aria-label="大段下移" className={s.icon}>↓</button>
                <button
                  type="button"
                  onClick={() => {
                    if (section.items.length === 0 || confirm(`刪除「${section.title || `第${sectionNumber(i)}大段`}」和其中的段落？`)) {
                      setSections(sections.filter((_, j) => j !== i));
                    }
                  }}
                  aria-label="刪除大段"
                  className={`${s.icon} ml-1 text-lg leading-none`}
                >
                  ×
                </button>
              </span>
            </div>

            <ul className="mt-2 flex flex-col gap-1.5 pl-6">
              {section.items.map((item, j) => (
                <li key={j} className="flex flex-wrap items-start gap-2">
                  <RangeInput
                    value={item.range}
                    onChange={(range) => setItems(i, section.items.map((it, k) => (k === j ? { ...it, range } : it)))}
                    chapters={book?.chapters}
                    label={`段落 ${j + 1} 經文範圍`}
                    styles={s}
                  />
                  <input
                    value={item.text}
                    onChange={(e) => setItems(i, section.items.map((it, k) => (k === j ? { ...it, text: e.target.value } : it)))}
                    placeholder="這段的內容"
                    aria-label={`段落 ${j + 1} 內容`}
                    className={`${s.input} min-w-0 flex-[1_1_10rem]`}
                  />
                  <span className="flex gap-0.5 pt-1">
                    <button type="button" onClick={() => setItems(i, move(section.items, j, -1))} disabled={j === 0} aria-label="段落上移" className={s.icon}>↑</button>
                    <button type="button" onClick={() => setItems(i, move(section.items, j, 1))} disabled={j === section.items.length - 1} aria-label="段落下移" className={s.icon}>↓</button>
                    <button type="button" onClick={() => setItems(i, section.items.filter((_, k) => k !== j))} aria-label="刪除段落" className={`${s.icon} ml-1 text-lg leading-none`}>×</button>
                  </span>
                </li>
              ))}
              <li>
                <button type="button" onClick={() => setItems(i, [...section.items, { range: null, text: "" }])} className={`text-xs font-medium ${s.link}`}>
                  + 新增段落
                </button>
              </li>
            </ul>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={() => setSections([...sections, { title: "", range: null, items: [] }])}
        className={`self-start text-xs font-medium ${s.link}`}
      >
        + 新增大段
      </button>
    </div>
  );
}
