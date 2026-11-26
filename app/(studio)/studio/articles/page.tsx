"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getArticles } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { ArticleSummary, ArticleQuery, PaginatedResponse, PaginationMeta } from "@/lib/types";
import ArticleListView from "@/components/studio/ArticleListView";
import ArticleCalendarView from "@/components/studio/ArticleCalendarView";
import { StudioPage } from "@/components/studio/shell/StudioHeader";
import { stBtnPrimary, stSegment, stSegmentItem } from "@/lib/styles";

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
  const [listLoadedFor, setListLoadedFor] = useState<ArticleQuery | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [listQuery, setListQuery] = useState<ArticleQuery>({ page: 1, pageSize: PAGE_SIZE });

  // ── calendar state ────────────────────────────────────────────────────────
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1);
  const [calArticles, setCalArticles] = useState<ArticleSummary[]>([]);
  const [calLoadedFor, setCalLoadedFor] = useState<string | null>(null);

  // ── fetch list ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    getArticles(listQuery, token)
      .then((res: PaginatedResponse<ArticleSummary>) => {
        setListArticles(res.data);
        setListPagination(res.pagination);
        setListError(null);
      })
      .catch(() => setListError("載入文章失敗"))
      .finally(() => setListLoadedFor(listQuery));
  }, [listQuery, token]);
  const listLoading = listLoadedFor !== listQuery;

  // ── fetch calendar ────────────────────────────────────────────────────────
  const calKey = `${calYear}-${calMonth}`;
  useEffect(() => {
    if (!token) return;
    const { dateFrom, dateTo } = monthBounds(calYear, calMonth);
    getArticles({ dateFrom, dateTo, pageSize: 31 }, token)
      .then((res: PaginatedResponse<ArticleSummary>) => setCalArticles(res.data))
      .catch(() => {})
      .finally(() => setCalLoadedFor(`${calYear}-${calMonth}`));
  }, [calYear, calMonth, token]);
  const calLoading = calLoadedFor !== calKey;

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
    <StudioPage>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-b border-st-line bg-st-surface px-4 py-3.5 sm:px-8">
        <h1 className="m-0 text-base font-medium">文章管理</h1>
        <div role="tablist" aria-label="檢視方式" className={stSegment}>
          {(["calendar", "list"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={stSegmentItem(tab === t)}
            >
              {t === "calendar" ? "月曆" : "列表"}
            </button>
          ))}
        </div>
        <span className="flex-1" />
        <Link href="/studio/articles/new" className={`${stBtnPrimary} no-underline`}>
          ＋ 新增文章
        </Link>
      </div>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-8">
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
      </main>
    </StudioPage>
  );
}
