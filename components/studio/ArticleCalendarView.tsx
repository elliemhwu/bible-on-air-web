"use client";

import MonthCalendar from "@/components/calendar/MonthCalendar";
import StatusBadge from "@/components/studio/StatusBadge";
import { stBtnGhost, stBtnSecondary } from "@/lib/styles";
import type { ArticleSummary } from "@/lib/types";
import { today } from "@/lib/week";

type Props = {
  articles: ArticleSummary[];
  year: number;
  month: number;
  loading: boolean;
  onMonthChange: (year: number, month: number) => void;
};

/** 文章管理 月曆: the reader's history calendar, with status badges and links to edit / create */
export default function ArticleCalendarView({ articles, year, month, loading, onMonthChange }: Props) {
  const todayStr = today();
  const thisYear = +todayStr.slice(0, 4);
  const thisMonth = +todayStr.slice(5, 7);
  const isCurrentMonth = year === thisYear && month === thisMonth;
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

  function shift(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    onMonthChange(d.getFullYear(), d.getMonth() + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => shift(-1)} aria-label="上個月" className={stBtnGhost}>
          ‹
        </button>
        <span className="min-w-28 text-center font-serif text-lg font-semibold text-st-ink">
          {year} 年 {month} 月
        </span>
        <button type="button" onClick={() => shift(1)} aria-label="下個月" className={stBtnGhost}>
          ›
        </button>
        {!isCurrentMonth && (
          <button type="button" onClick={() => onMonthChange(thisYear, thisMonth)} className={`${stBtnSecondary} ml-1 h-8`}>
            回到本月
          </button>
        )}
        {loading && <span className="ml-2 text-xs text-st-muted">載入中…</span>}
      </div>

      <MonthCalendar
        variant="studio"
        month={monthKey}
        today={todayStr}
        items={articles.map((a) => ({
          date: a.date,
          title: a.title,
          verseRange: a.verseRange,
          coverImageUrl: a.coverImageUrl,
          href: `/studio/articles/${a.id}/edit`,
          badge: <StatusBadge status={a.status} />,
        }))}
        emptyHref={(date) => `/studio/articles/new?date=${date}`}
      />
    </div>
  );
}
