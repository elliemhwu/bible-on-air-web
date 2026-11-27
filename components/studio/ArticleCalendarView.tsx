"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { ArticleSummary } from "@/lib/types";
import StatusBadge from "@/components/studio/StatusBadge";


const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

type Props = {
  articles: ArticleSummary[];
  year: number;
  month: number;
  loading: boolean;
  onMonthChange: (year: number, month: number) => void;
};

export default function ArticleCalendarView({
  articles,
  year,
  month,
  loading,
  onMonthChange,
}: Props) {
  const router = useRouter();
  const today = new Date();
  const todayStr = toDateStr(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate(),
  );
  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1;

  const articleByDate = useMemo(() => {
    const map = new Map<string, ArticleSummary>();
    for (const a of articles) map.set(a.date, a);
    return map;
  }, [articles]);

  const cells = buildCalendarDays(year, month);

  function prevMonth() {
    if (month === 1) onMonthChange(year - 1, 12);
    else onMonthChange(year, month - 1);
  }

  function nextMonth() {
    if (month === 12) onMonthChange(year + 1, 1);
    else onMonthChange(year, month + 1);
  }

  function handleDayClick(day: number) {
    const dateStr = toDateStr(year, month, day);
    const article = articleByDate.get(dateStr);
    if (article) {
      router.push(`/studio/articles/${article.id}/edit`);
    } else {
      router.push(`/studio/articles/new?date=${dateStr}`);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* month navigator */}
      <div className="flex items-center gap-3">
        <button
          onClick={prevMonth}
          className="px-3 py-1.5 rounded border border-st-line-strong hover:bg-st-soft text-sm transition-colors"
        >
          ←
        </button>
        <button
          onClick={nextMonth}
          className="px-3 py-1.5 rounded border border-st-line-strong hover:bg-st-soft text-sm transition-colors"
        >
          →
        </button>
        <span className="text-base font-semibold text-st-ink">
          {year} 年 {month} 月
        </span>
        {!isCurrentMonth && (
          <button
            onClick={() => onMonthChange(today.getFullYear(), today.getMonth() + 1)}
            className="ml-1 px-3 py-1.5 rounded border border-st-line-strong hover:bg-st-soft text-sm text-st-muted transition-colors"
          >
            回到今天
          </button>
        )}
        {loading && (
          <span className="text-xs text-st-muted ml-2">載入中…</span>
        )}
      </div>

      {/* calendar grid */}
      <div className="rounded-[14px] border border-st-line bg-st-surface overflow-hidden w-full">
        {/* weekday header */}
        <div className="grid grid-cols-7 bg-st-sunken border-b border-st-line">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="py-3 text-center text-xs font-medium text-st-muted"
            >
              {w}
            </div>
          ))}
        </div>

        {/* day cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (day === null) {
              return (
                <div
                  key={i}
                  className="h-32 bg-st-sunken border-t border-l border-st-line"
                />
              );
            }

            const dateStr = toDateStr(year, month, day);
            const article = articleByDate.get(dateStr);
            const isToday = dateStr === todayStr;
            const coverUrl = article?.coverImageUrl ?? null;

            return (
              <div
                key={dateStr}
                onClick={() => handleDayClick(day)}
                className="relative h-32 cursor-pointer group overflow-hidden border-t border-l border-st-line"
              >
                {coverUrl ? (
                  <Image
                    src={coverUrl}
                    alt={article?.title ?? dateStr}
                    fill
                    sizes="14vw"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 bg-st-surface" />
                )}

                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors" />

                <span
                  className={`absolute top-2 left-2.5 text-xs font-semibold leading-none select-none ${
                    isToday
                      ? "bg-st-primary text-st-on-primary rounded-full w-5 h-5 flex items-center justify-center"
                      : coverUrl
                      ? "text-white drop-shadow"
                      : "text-st-muted"
                  }`}
                >
                  {day}
                </span>

                {article && (
                  <span className="absolute top-2 right-2 select-none">
                    <StatusBadge status={article.status} />
                  </span>
                )}

                {article?.title && (
                  <span
                    className={`absolute bottom-2 left-2 right-2 text-[11px] leading-tight line-clamp-2 select-none ${
                      coverUrl ? "text-white drop-shadow" : "text-st-ink-2"
                    }`}
                  >
                    {article.title}
                  </span>
                )}

                {!article && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-2xl text-st-muted leading-none">+</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
