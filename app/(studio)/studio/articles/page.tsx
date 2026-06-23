"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getArticles } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { ArticleSummary, ArticleQuery, PaginatedResponse, PaginationMeta } from "@/lib/types";
import ArticleListView from "@/components/studio/ArticleListView";
import ArticleCalendarView from "@/components/studio/ArticleCalendarView";

type Tab = "calendar" | "list";

const PAGE_SIZE = 20;

function parseTab(value: string | null): Tab {
  return value === "list" ? "list" : "calendar";
}

function monthBounds(year: number, month: number) {
  const mm = String(month).padStart(2, "0");
  const daysInMonth = new Date(year, month, 0).getDate();
  return {
    dateFrom: `${year}-${mm}-01`,
    dateTo: `${year}-${mm}-${String(daysInMonth).padStart(2, "0")}`,
  };
}

const EMPTY_PAGINATION: PaginationMeta = { page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 0 };

export default function ArticlesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("view"));
  const { token } = useAuth();

  // ── list state ────────────────────────────────────────────────────────────
  const [listArticles, setListArticles] = useState<ArticleSummary[]>([]);
  const [listPagination, setListPagination] = useState<PaginationMeta>(EMPTY_PAGINATION);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [listQuery, setListQuery] = useState<ArticleQuery>({ page: 1, pageSize: PAGE_SIZE });

  // ── calendar state ────────────────────────────────────────────────────────
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1);
  const [calArticles, setCalArticles] = useState<ArticleSummary[]>([]);
  const [calLoading, setCalLoading] = useState(false);

  // ── fetch list ────────────────────────────────────────────────────────────
  useEffect(() => {
    setListLoading(true);
    setListError(null);
    getArticles(listQuery)
      .then((res: PaginatedResponse<ArticleSummary>) => {
        setListArticles(res.data);
        setListPagination(res.pagination);
      })
      .catch(() => setListError("載入文章失敗"))
      .finally(() => setListLoading(false));
  }, [listQuery]);

  // ── fetch calendar ────────────────────────────────────────────────────────
  useEffect(() => {
    setCalLoading(true);
    const { dateFrom, dateTo } = monthBounds(calYear, calMonth);
    getArticles({ dateFrom, dateTo, pageSize: 31 })
      .then((res: PaginatedResponse<ArticleSummary>) => setCalArticles(res.data))
      .catch(() => {})
      .finally(() => setCalLoading(false));
  }, [calYear, calMonth]);

  function setTab(t: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", t);
    router.replace(`?${params.toString()}`);
  }

  function handleListQueryChange(patch: Partial<ArticleQuery>) {
    setListQuery((prev) => ({ ...prev, ...patch, page: "page" in patch ? patch.page! : 1 }));
  }

  function handleArticlesUpdated(updated: ArticleSummary[]) {
    setListArticles((prev) => {
      const map = new Map(prev.map((a) => [a.id, a]));
      for (const a of updated) map.set(a.id, a);
      return Array.from(map.values());
    });
  }

  function handleCalMonthChange(year: number, month: number) {
    setCalYear(year);
    setCalMonth(month);
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
      <div className={tab === "calendar" ? "" : "hidden"}>
        <ArticleCalendarView
          articles={calArticles}
          year={calYear}
          month={calMonth}
          loading={calLoading}
          onMonthChange={handleCalMonthChange}
        />
      </div>
      <div className={tab === "list" ? "" : "hidden"}>
        <ArticleListView
          articles={listArticles}
          pagination={listPagination}
          query={listQuery}
          loading={listLoading}
          error={listError}
          token={token}
          onQueryChange={handleListQueryChange}
          onArticlesUpdated={handleArticlesUpdated}
        />
      </div>
    </div>
  );
}
