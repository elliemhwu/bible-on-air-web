"use client";

import DayImageSlot from "@/components/studio/DayImageSlot";
import { getArticles } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { ArticleSummary } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function getCurrentMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

type Props = {
  weekStart: string;
};

export default function WeekImageUploader({ weekStart }: Props) {
  const router = useRouter();
  const { token } = useAuth();
  const [articleMap, setArticleMap] = useState<Map<string, ArticleSummary>>(
    new Map(),
  );
  const [isLoading, setIsLoading] = useState(true);

  const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    getArticles()
      .then((articles) => {
        const map = new Map(articles.map((a) => [a.date, a]));
        setArticleMap(map);
      })
      .finally(() => setIsLoading(false));
  }, []);

  function prevWeek() {
    router.push(`/studio/images/${addDays(weekStart, -7)}`);
  }

  function nextWeek() {
    router.push(`/studio/images/${addDays(weekStart, 7)}`);
  }

  function goToThisWeek() {
    router.push(`/studio/images/${getCurrentMonday()}`);
  }

  function handleArticleUpdate(updated: ArticleSummary) {
    setArticleMap((prev) => new Map(prev).set(updated.date, updated));
  }

  return (
    <main className="min-h-screen lg:px-48 px-6 py-12 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <h1 className="text-2xl font-semibold text-pebble-800">封面圖片上傳</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={prevWeek}
            className="px-3 py-1.5 rounded-lg border border-pebble-200 text-pebble-600 hover:border-pebble-300 transition-colors text-sm"
          >
            ←
          </button>
          <span className="text-sm text-pebble-500 w-24 text-center">{weekStart}</span>
          <button
            onClick={nextWeek}
            className="px-3 py-1.5 rounded-lg border border-pebble-200 text-pebble-600 hover:border-pebble-300 transition-colors text-sm"
          >
            →
          </button>
          {weekStart !== getCurrentMonday() && (
            <button
              onClick={goToThisWeek}
              className="px-3 py-1.5 rounded-lg border border-pebble-200 text-pebble-600 hover:border-pebble-300 transition-colors text-sm"
            >
              本週
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-pebble-400">載入中…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {days.map((date) => (
            <DayImageSlot
              key={date}
              date={date}
              article={articleMap.get(date) ?? null}
              token={token ?? ""}
              onUpdated={handleArticleUpdate}
            />
          ))}
        </div>
      )}
    </main>
  );
}
