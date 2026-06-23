"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { ArticleSummary } from "@/lib/types";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

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

export default function ArticleCalendarView({
  articles,
}: {
  articles: ArticleSummary[];
}) {
  const router = useRouter();
  const today = new Date();
  const todayStr = toDateStr(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate(),
  );
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const articleByDate = useMemo(() => {
    const map = new Map<string, ArticleSummary>();
    for (const a of articles) map.set(a.date, a);
    return map;
  }, [articles]);

  const cells = buildCalendarDays(year, month);

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  }

  function goToToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
  }

  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1;

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
          className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 text-sm transition-colors"
        >
          ←
        </button>
        <button
          onClick={nextMonth}
          className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 text-sm transition-colors"
        >
          →
        </button>
        <span className="text-base font-semibold text-gray-800">
          {year} 年 {month} 月
        </span>
        {!isCurrentMonth && (
          <button
            onClick={goToToday}
            className="ml-1 px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 text-sm text-gray-500 transition-colors"
          >
            回到今天
          </button>
        )}
      </div>

      {/* calendar grid */}
      <div className="rounded-lg border border-gray-200 overflow-hidden w-full">
        {/* weekday header */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="py-3 text-center text-xs font-medium text-gray-500"
            >
              {w}
            </div>
          ))}
        </div>

        {/* day cells — fixed height rows so grid fills width */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (day === null) {
              return (
                <div
                  key={i}
                  className="h-32 bg-gray-50 border-t border-l border-gray-100"
                />
              );
            }

            const dateStr = toDateStr(year, month, day);
            const article = articleByDate.get(dateStr);
            const isToday = dateStr === todayStr;
            const coverUrl = article?.coverImageUrl
              ? article.coverImageUrl.startsWith("http")
                ? article.coverImageUrl
                : `${BASE}${article.coverImageUrl}`
              : null;

            return (
              <div
                key={dateStr}
                onClick={() => handleDayClick(day)}
                className="relative h-32 cursor-pointer group overflow-hidden border-t border-l border-gray-100"
              >
                {/* background */}
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
                  <div className="absolute inset-0 bg-white" />
                )}

                {/* hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors" />

                {/* day number */}
                <span
                  className={`absolute top-2 left-2.5 text-xs font-semibold leading-none select-none ${
                    isToday
                      ? "bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center"
                      : coverUrl
                      ? "text-white drop-shadow"
                      : "text-gray-500"
                  }`}
                >
                  {day}
                </span>

                {/* article title */}
                {article?.title && (
                  <span
                    className={`absolute bottom-2 left-2 right-2 text-[11px] leading-tight line-clamp-2 select-none ${
                      coverUrl ? "text-white drop-shadow" : "text-gray-600"
                    }`}
                  >
                    {article.title}
                  </span>
                )}

                {/* no article: plus icon on hover */}
                {!article && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-2xl text-gray-400 leading-none">+</span>
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
