"use client";

import { getArticles, getAssignments, getPlans } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { ArticleSummary, Assignment, Team, WeekPlan } from "@/lib/types";
import { addDays, weekDays } from "@/lib/week";
import { useCallback, useEffect, useState } from "react";

export type DayInfo = {
  date: string;
  /** Passage of the day: the article's reading range, else the plan's */
  passage: string;
  article: ArticleSummary | null;
  assignees: Partial<Record<Team, Assignment>>;
};

export type WeekData = {
  plan: WeekPlan | null;
  days: DayInfo[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

type Loaded = {
  monday: string;
  plan: WeekPlan | null;
  articles: ArticleSummary[];
  assignments: Assignment[];
  error: string | null;
};

async function fetchWeek(token: string, monday: string): Promise<Loaded> {
  const saturday = addDays(monday, 5);
  try {
    const [plans, page, assigned] = await Promise.all([
      getPlans(token, monday, monday),
      getArticles({ dateFrom: monday, dateTo: saturday, pageSize: 7 }, token),
      getAssignments(token, monday, saturday),
    ]);
    return { monday, plan: plans[0] ?? null, articles: page.data, assignments: assigned, error: null };
  } catch {
    return { monday, plan: null, articles: [], assignments: [], error: "無法載入這週的資料" };
  }
}

/** Articles, plan and assignments of the Mon–Sat week starting on `monday` */
export function useWeek(monday: string): WeekData {
  const { token } = useAuth();
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  // Results are kept with the week they belong to, so a late answer for a
  // week the user already left is never shown
  useEffect(() => {
    if (!token) return;
    let live = true;
    fetchWeek(token, monday).then((result) => live && setLoaded(result));
    return () => {
      live = false;
    };
  }, [token, monday]);

  const reload = useCallback(async () => {
    if (token) setLoaded(await fetchWeek(token, monday));
  }, [token, monday]);

  const current = loaded?.monday === monday ? loaded : null;
  const plan = current?.plan ?? null;
  const articles = current?.articles ?? [];
  const assignments = current?.assignments ?? [];
  const error = current?.error ?? null;
  const isLoading = !current;

  const days = weekDays(monday).map((date, i): DayInfo => {
    const article = articles.find((a) => a.date === date) ?? null;
    const assignees: DayInfo["assignees"] = {};
    for (const a of assignments) if (a.date === date) assignees[a.team] = a;
    return {
      date,
      passage: article?.verseRange || plan?.days[i]?.ref || "",
      article,
      assignees,
    };
  });

  return { plan, days, isLoading, error, reload };
}

/** Writing progress of a day, as the studio shows it */
export function writingState(article: ArticleSummary | null): "none" | "drafting" | "submitted" {
  if (!article) return "none";
  return article.status === "draft" ? "drafting" : "submitted";
}

export function isReviewed(article: ArticleSummary | null): boolean {
  return article?.status === "approved" || article?.status === "published";
}
