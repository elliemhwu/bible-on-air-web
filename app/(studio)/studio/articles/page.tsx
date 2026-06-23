"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getArticles } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { ArticleSummary } from "@/lib/types";
import ArticleListView from "@/components/studio/ArticleListView";
import ArticleCalendarView from "@/components/studio/ArticleCalendarView";

type Tab = "calendar" | "list";

function parseTab(value: string | null): Tab {
  return value === "list" ? "list" : "calendar";
}

export default function ArticlesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("view"));
  const { token } = useAuth();

  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getArticles()
      .then(setArticles)
      .catch(() => setError("載入文章失敗"))
      .finally(() => setLoading(false));
  }, []);

  function setTab(t: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", t);
    router.replace(`?${params.toString()}`);
  }

  function handleArticlesUpdated(updated: ArticleSummary[]) {
    setArticles((prev) => {
      const map = new Map(prev.map((a) => [a.id, a]));
      for (const a of updated) map.set(a.id, a);
      return Array.from(map.values());
    });
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-6 flex flex-col gap-5">
      {/* page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">文章管理</h1>
        <Link
          href="/studio/articles/new"
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
        >
          + 新增文章
        </Link>
      </div>

      {/* tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(["calendar", "list"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "calendar" ? "月曆" : "列表"}
          </button>
        ))}
      </div>

      {/* content */}
      {loading && (
        <p className="text-sm text-gray-400 py-8 text-center">載入中…</p>
      )}
      {error && (
        <p className="text-sm text-red-500 py-8 text-center">{error}</p>
      )}
      {!loading && !error && (
        <>
          <div className={tab === "calendar" ? "" : "hidden"}>
            <ArticleCalendarView articles={articles} />
          </div>
          <div className={tab === "list" ? "" : "hidden"}>
            <ArticleListView
              articles={articles}
              token={token}
              onArticlesUpdated={handleArticlesUpdated}
            />
          </div>
        </>
      )}
    </div>
  );
}
