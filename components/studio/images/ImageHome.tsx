"use client";

import { StudioPage } from "@/components/studio/shell/StudioHeader";
import { getAssignments } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { isManager } from "@/lib/roles";
import { stCard } from "@/lib/styles";
import { useWeek } from "@/lib/useWeek";
import { addDays, md, mondayOf, today, weekLabel } from "@/lib/week";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const HORIZON_DAYS = 180;

/** 圖片同工首頁: how many images my week still needs, and my next weeks */
export default function ImageHome() {
  const { token, user } = useAuth();
  const thisWeek = mondayOf(today());
  const [assignedWeeks, setWeeks] = useState<string[] | null>(null);
  const weeks = isManager(user) ? [] : assignedWeeks;

  useEffect(() => {
    if (!token || !user || isManager(user)) return;
    getAssignments(token, thisWeek, addDays(thisWeek, HORIZON_DAYS), user.id)
      .then((list) => setWeeks([...new Set(list.filter((a) => a.team === "image").map((a) => mondayOf(a.date)))]))
      .catch(() => setWeeks([]));
  }, [token, user, thisWeek]);

  // Managers (and anyone between turns) see this week
  const focus = weeks?.[0] ?? thisWeek;
  const later = (weeks ?? []).slice(1);
  const { days, isLoading } = useWeek(focus);
  const withArticle = days.filter((d) => d.article);
  const missing = withArticle.filter((d) => !d.article?.coverImageUrl).length;
  const done = days.filter((d) => d.article?.coverImageUrl).length;

  const heading = isLoading || weeks === null
    ? "　"
    : missing
      ? `${focus === thisWeek ? "這週" : `${weekLabel(focus)} 那週`}還差 ${missing} 張圖片`
      : withArticle.length
        ? `${focus === thisWeek ? "這週" : weekLabel(focus)}的圖片都齊了`
        : `${focus === thisWeek ? "這週" : weekLabel(focus)}還沒有稿件`;

  return (
    <StudioPage>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-7 px-4 py-9 sm:px-8">
        <h1 className="m-0 font-serif text-[28px] font-semibold">{heading}</h1>

        <Link href={`/studio/images/${focus}`} className={`${stCard} flex flex-col gap-4 px-5 py-4 text-st-ink no-underline hover:border-st-accent`}>
          <div className="flex items-baseline justify-between">
            <span className="font-medium">{weekLabel(focus)}</span>
            <span className="text-sm text-st-muted tabular-nums">{done} / 6</span>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {days.map((d) => (
              <div key={d.date} className="flex flex-col items-center gap-1.5">
                {d.article?.coverImageUrl ? (
                  <span className="relative aspect-square w-full overflow-hidden rounded-lg">
                    <Image src={d.article.coverImageUrl} alt={`${md(d.date)} 的圖片`} fill unoptimized className="object-cover" />
                  </span>
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center rounded-lg border-2 border-dashed border-st-line-strong text-xl text-st-muted">
                    {d.article ? "＋" : ""}
                  </div>
                )}
                <span className="text-xs text-st-muted">{md(d.date)}</span>
              </div>
            ))}
          </div>
        </Link>

        {later.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <h2 className="m-0 text-base font-medium text-st-ink-2">之後的安排</h2>
            <div className="flex flex-wrap gap-2">
              {later.map((w) => (
                <Link key={w} href={`/studio/images/${w}`} className="rounded-full border border-st-line bg-st-surface px-3.5 py-1.5 text-sm text-st-ink no-underline">
                  {weekLabel(w)}
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </StudioPage>
  );
}
