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

/** Articles, plan and assignments of the Mon–Sat week starting on `monday` */
export function useWeek(monday: string): WeekData {
  const { token } = useAuth();
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!token) return;
    const saturday = addDays(monday, 5);
    try {
      const [plans, page, assigned] = await Promise.all([
        getPlans(token, monday, monday),
        getArticles({ dateFrom: monday, dateTo: saturday, pageSize: 7 }, token),
        getAssignments(token, monday, saturday),
      ]);
      setPlan(plans[0] ?? null);
      setArticles(page.data);
      setAssignments(assigned);
      setError(null);
    } catch {
      setError("無法載入這週的資料");
    } finally {
      setLoadedFor(monday);
    }
  }, [token, monday]);

  useEffect(() => {
    reload();
  }, [reload]);

  const isLoading = loadedFor !== monday;

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
