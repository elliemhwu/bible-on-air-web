"use client";

import { StudioPage } from "@/components/studio/shell/StudioHeader";
import { getArticles, getAssignments, getPlans } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { stCard } from "@/lib/styles";
import type { ArticleSummary, Assignment, WeekPlan } from "@/lib/types";
import { addDays, dateRuns, md, mondayOf, today, weekday } from "@/lib/week";
import Link from "next/link";
import { useEffect, useState } from "react";

const HORIZON_DAYS = 180;

function chip(article: ArticleSummary | null): { label: string; cls: string } {
  switch (article?.status) {
    case "pending_review":
      return { label: "待校閱", cls: "bg-st-soft text-st-ink-2" };
    case "approved":
      return { label: "已校閱", cls: "bg-st-sage-soft text-st-sage-ink" };
    case "published":
      return { label: "已發布", cls: "bg-st-sage-soft text-st-sage-ink" };
    case "draft":
      return { label: "草稿 · 繼續寫", cls: "bg-st-gold-soft text-st-gold-soft-ink" };
    default:
      return { label: "開始寫", cls: "bg-st-primary text-st-on-primary" };
  }
}

/** 寫作同工首頁: the days I write this week, and what comes after */
export default function MyWork() {
  const { token, user } = useAuth();
  const [mine, setMine] = useState<Assignment[]>([]);
  const [articles, setArticles] = useState<Map<string, ArticleSummary>>(new Map());
  const [plans, setPlans] = useState<WeekPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const now = today();
  const monday = mondayOf(now);

  useEffect(() => {
    if (!token || !user) return;
    const until = addDays(monday, HORIZON_DAYS);
    (async () => {
      const assigned = (await getAssignments(token, monday, until, user.id)).filter((a) => a.team === "writer");
      setMine(assigned);
      const dates = assigned.map((a) => a.date);
      if (dates.length) {
        const [page, weekPlans] = await Promise.all([
          getArticles({ dateFrom: dates[0], dateTo: dates[dates.length - 1], pageSize: 100 }, token),
          getPlans(token, mondayOf(dates[0]), mondayOf(dates[dates.length - 1])),
        ]);
        setArticles(new Map(page.data.map((a) => [a.date, a])));
        setPlans(weekPlans);
      }
      setIsLoading(false);
    })().catch(() => setIsLoading(false));
  }, [token, user, monday]);

  // "This week" is the first week I have days in, so the page is useful between turns too
  const firstWeek = mine.length ? mondayOf(mine[0].date) : monday;
  const current = mine.filter((a) => mondayOf(a.date) === firstWeek);
  const later = mine.filter((a) => mondayOf(a.date) !== firstWeek);
  const plan = plans.find((p) => p.weekStart === firstWeek);
  const passageOf = (date: string) => {
    const i = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
    return articles.get(date)?.verseRange || plans.find((p) => p.weekStart === mondayOf(date))?.days[i]?.ref || "";
  };

  const sunday = addDays(firstWeek, 6);
  const heading = current.length
    ? firstWeek === monday
      ? `這週你負責 ${current.length} 天的靈修`
      : `下一次是 ${md(current[0].date)} 起的 ${current.length} 天`
    : "目前還沒有排到你";

  return (
    <StudioPage>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-7 px-4 py-9 sm:px-8">
        <div className="flex flex-col gap-1.5">
          <div className="text-sm text-st-gold-ink">
            {md(now)}（{weekday(now)}），{weekday(now) === "日" ? "主日平安" : "平安"}
          </div>
          <h1 className="m-0 font-serif text-[28px] font-semibold leading-snug">{isLoading ? "　" : heading}</h1>
          {plan?.sundayTheme && (
            <p className="m-0 text-st-ink-2">
              主日 {md(sunday)} 的信息是「{plan.sundayTheme}」{plan.sundayPassage ? `（${plan.sundayPassage}）` : ""}。
            </p>
          )}
        </div>

        {current.length > 0 && (
          <section className="flex flex-col gap-3" aria-label="這次的稿件">
            {current.map(({ date }) => {
              const article = articles.get(date) ?? null;
              const c = chip(article);
              const href = article ? `/studio/write/${date}/compose` : `/studio/write/${date}`;
              const passage = passageOf(date);
              return (
                <Link key={date} href={href} className={`${stCard} flex items-center gap-5 px-5 py-4 text-st-ink no-underline hover:border-st-accent`}>
                  <div className="flex w-16 shrink-0 flex-col items-center">
                    <div className="font-serif text-[32px] font-semibold leading-none tabular-nums">{Number(date.slice(8))}</div>
                    <div className="mt-1 text-xs text-st-muted">{Number(date.slice(5, 7))} 月 · {weekday(date)}</div>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className={`truncate font-serif text-lg ${article?.title ? "font-semibold" : "text-st-muted"}`}>
                      {article?.title || "還沒有標題"}
                    </div>
                    <div className="truncate text-sm text-st-muted">{passage || "這天還沒有安排經文"}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-sm ${c.cls}`}>{c.label}</span>
                </Link>
              );
            })}
          </section>
        )}

        <section className="flex flex-col gap-2.5">
          <h2 className="m-0 text-base font-medium text-st-ink-2">之後的安排</h2>
          {later.length === 0 ? (
            <p className="m-0 text-sm text-st-muted">{isLoading ? "載入中…" : `未來 ${HORIZON_DAYS / 30} 個月還沒有其他安排`}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {dateRuns(later.map((a) => a.date)).map((r) => (
                <span key={r.from} className="rounded-full border border-st-line bg-st-surface px-3.5 py-1.5 text-sm">
                  {r.from === r.to ? md(r.from) : `${md(r.from)} – ${md(r.to)}`} · {r.count} 天
                </span>
              ))}
            </div>
          )}
        </section>
      </main>
    </StudioPage>
  );
}
