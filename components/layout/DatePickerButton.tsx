"use client";

import { ChevronDown } from "@/components/icons/ChevronDown";
import type { ArticleSummary } from "@/lib/types";
import { toDateStr } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DatePicker, type DatePickerHandle } from "./DatePicker";

export function DatePickerButton({ articles }: { articles: ArticleSummary[] }) {
  const router = useRouter();
  const params = useParams();
  const currentDate =
    typeof params.date === "string" ? params.date : toDateStr(new Date());

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<DatePickerHandle>(null);

  const articleDateSet = new Set(articles.map((a) => a.date));

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        datePickerRef.current?.close();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleSelect(date: string | undefined) {
    if (!date || !articleDateSet.has(date)) return;
    router.push(`/${date}`);
  }

  return (
    <div ref={containerRef} className="relative font-sans">
      <button
        onClick={() => (open ? datePickerRef.current?.close() : setOpen(true))}
        className="flex items-center gap-1 text-sm text-pebble-600 hover:text-pebble-900 transition-colors"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span>每日靈修</span>
        <ChevronDown className="mt-0.5" />
      </button>

      {open && (
        <DatePicker
          ref={datePickerRef}
          date={currentDate}
          onSelect={handleSelect}
          onOpenChange={setOpen}
          isDateDisabled={(date) => !articleDateSet.has(toDateStr(date))}
        />
      )}
    </div>
  );
}
