"use client";

import type { ArticleSummary } from "@/lib/types";
import { toDate, toDateStr } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { zhTW } from "react-day-picker/locale";
import "react-day-picker/style.css";
import "./DatePickerButton.css";

export function DatePickerButton({ articles }: { articles: ArticleSummary[] }) {
  const router = useRouter();
  const params = useParams();
  const currentDate =
    typeof params.date === "string" ? params.date : toDateStr(new Date());

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const todayStr = toDateStr(new Date());
  const articleDateSet = new Set(articles.map((a) => a.date));

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleSelect(date: Date | undefined) {
    if (!date) return;
    const str = toDateStr(date);
    if (articleDateSet.has(str)) {
      router.push(`/${str}`);
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative font-sans">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-sm text-pebble-600 hover:text-pebble-900 transition-colors"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span>每日靈修</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="currentColor"
          className="mt-0.5"
          aria-hidden
        >
          <path d="M5 7 L1 3 L9 3 Z" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="選擇日期"
          className="date-picker-popover absolute top-full mt-2 right-0 z-50 bg-pebble-50 border border-pebble-200 rounded-xl shadow-lg p-3"
        >
          <div className="flex justify-between items-center mb-1 pb-2 border-b border-pebble-200">
            <span className="text-xs text-pebble-500">選擇日期</span>
            <button
              onClick={() => {
                router.push(`/${todayStr}`);
                setOpen(false);
              }}
              className="text-xs text-primary hover:opacity-70 font-medium transition-opacity"
            >
              今日
            </button>
          </div>
          <DayPicker
            locale={zhTW}
            mode="single"
            selected={toDate(currentDate)}
            onSelect={handleSelect}
            defaultMonth={toDate(currentDate)}
            disabled={(date) => !articleDateSet.has(toDateStr(date))}
          />
        </div>
      )}
    </div>
  );
}
