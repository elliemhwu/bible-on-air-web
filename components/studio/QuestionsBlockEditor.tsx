"use client";

import { useRef } from "react";

type Props = {
  items: string[];
  onChange: (items: string[]) => void;
  /** "paper": borderless inputs on the writing page */
  appearance?: "default" | "paper";
};

const PAPER_INPUT =
  "flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-base leading-[1.9] text-st-ink placeholder:text-st-placeholder outline-none hover:border-st-line focus:border-st-accent transition";

export default function QuestionsBlockEditor({ items, onChange, appearance = "default" }: Props) {
  const paper = appearance === "paper";
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function set(idx: number, val: string) {
    onChange(items.map((item, i) => (i === idx ? val : item)));
  }

  function add() {
    onChange([...items, ""]);
    // focus the new input on next render
    setTimeout(() => inputRefs.current[items.length]?.focus(), 0);
  }

  function remove(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  function move(idx: number, dir: -1 | 1) {
    const next = [...items];
    [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
    onChange(next);
  }

  function handleKeyDown(e: React.KeyboardEvent, idx: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (idx === items.length - 1) {
        add();
      } else {
        inputRefs.current[idx + 1]?.focus();
      }
    }
    if (e.key === "Backspace" && items[idx] === "" && items.length > 1) {
      e.preventDefault();
      remove(idx);
      setTimeout(() => inputRefs.current[Math.max(0, idx - 1)]?.focus(), 0);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <ol className="flex flex-col gap-2 list-none">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-center gap-2">
            <span className={`text-xs w-5 text-right shrink-0 ${paper ? "text-st-muted" : "text-pebble-400"}`}>
              {idx + 1}.
            </span>
            <input
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              value={item}
              onChange={(e) => set(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              placeholder={`問題 ${idx + 1}`}
              className={
                paper
                  ? PAPER_INPUT
                  : "flex-1 rounded-md border border-pebble-200 bg-white px-2.5 py-1.5 text-sm text-pebble-900 placeholder:text-pebble-300 outline-none focus:border-iris-400 focus:ring-2 focus:ring-iris-400/20 transition"
              }
            />
            <div className="flex gap-0.5">
              <button
                type="button"
                onClick={() => move(idx, -1)}
                disabled={idx === 0}
                className="text-pebble-300 hover:text-pebble-600 disabled:opacity-20 transition-colors px-0.5"
                aria-label="上移"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(idx, 1)}
                disabled={idx === items.length - 1}
                className="text-pebble-300 hover:text-pebble-600 disabled:opacity-20 transition-colors px-0.5"
                aria-label="下移"
              >
                ↓
              </button>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="text-pebble-300 hover:text-red-400 transition-colors text-lg leading-none ml-0.5"
                  aria-label="移除此題"
                >
                  ×
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={add}
        className={`self-start text-xs font-medium transition-colors ${paper ? "text-st-accent hover:underline" : "text-iris-600 hover:text-iris-700"}`}
      >
        + 新增問題
      </button>
    </div>
  );
}
