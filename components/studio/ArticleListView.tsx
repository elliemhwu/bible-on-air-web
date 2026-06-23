"use client";

import {
  batchPublish,
  batchReview,
  batchSubmit,
  batchUnpublish,
} from "@/lib/api";
import { getBibleBooks } from "@/lib/api";
import type { ArticleQuery, ArticleSummary, BibleBook, PaginationMeta } from "@/lib/types";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import StatusBadge from "@/components/studio/StatusBadge";

type SortKey = "date" | "title" | "status" | "updatedAt" | "publishedAt";
type SortDir = "asc" | "desc";

function SortTh({
  label,
  col,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  col: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (col: SortKey) => void;
}) {
  const active = sortKey === col;
  return (
    <th
      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap"
      onClick={() => onSort(col)}
    >
      {label}
      <span className="ml-1 text-gray-300">
        {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </th>
  );
}

function BookFilter({
  books,
  selected,
  onChange,
}: {
  books: BibleBook[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(abbr: string) {
    if (selected.includes(abbr)) onChange(selected.filter((v) => v !== abbr));
    else onChange([...selected, abbr]);
  }

  const label =
    selected.length === 0
      ? "全部書卷"
      : selected.length === 1
      ? books.find((b) => b.abbrZh === selected[0])?.zh ?? selected[0]
      : `${selected.length} 本書卷`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`border rounded px-3 py-1.5 text-sm transition-colors flex items-center gap-1 ${
          selected.length > 0
            ? "border-blue-400 text-blue-700 bg-blue-50"
            : "border-gray-300 text-gray-700 hover:bg-gray-50"
        }`}
      >
        {label}
        <span className="text-gray-400 text-xs ml-1">▾</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 left-0 w-36 max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg py-1">
          {books.map((b) => (
            <label
              key={b.abbrZh}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(b.abbrZh)}
                onChange={() => toggle(b.abbrZh)}
                className="rounded"
              />
              {b.zh}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return iso.slice(0, 16).replace("T", " ");
}

type Props = {
  articles: ArticleSummary[];
  pagination: PaginationMeta;
  query: ArticleQuery;
  loading: boolean;
  error: string | null;
  token: string | null;
  onQueryChange: (patch: Partial<ArticleQuery>) => void;
  onArticlesUpdated: (updated: ArticleSummary[]) => void;
};

export default function ArticleListView({
  articles,
  pagination,
  query,
  loading,
  error,
  token,
  onQueryChange,
  onArticlesUpdated,
}: Props) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [books, setBooks] = useState<BibleBook[]>([]);

  useEffect(() => {
    getBibleBooks().then(setBooks).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return articles.filter(
      (a) => !q || (a.title ?? "").toLowerCase().includes(q),
    );
  }, [articles, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av = "";
      let bv = "";
      if (sortKey === "date") { av = a.date; bv = b.date; }
      else if (sortKey === "title") { av = a.title ?? ""; bv = b.title ?? ""; }
      else if (sortKey === "status") { av = a.status; bv = b.status; }
      else if (sortKey === "updatedAt") { av = a.updatedAt; bv = b.updatedAt; }
      else if (sortKey === "publishedAt") { av = a.publishedAt ?? ""; bv = b.publishedAt ?? ""; }
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  function toggleAll() {
    if (selected.size === sorted.length) setSelected(new Set());
    else setSelected(new Set(sorted.map((a) => a.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const selectedArticles = sorted.filter((a) => selected.has(a.id));

  async function runBatch(
    fn: (token: string, ids: string[]) => Promise<ArticleSummary[]>,
  ) {
    if (!token) return;
    const ids = Array.from(selected);
    setBatchLoading(true);
    setBatchError(null);
    try {
      const updated = await fn(token, ids);
      onArticlesUpdated(updated);
      setSelected(new Set());
    } catch {
      setBatchError("操作失敗，請再試一次");
    } finally {
      setBatchLoading(false);
    }
  }

  const statuses = new Set(selectedArticles.map((a) => a.status));
  const batchButtons: { label: string; onClick: () => void }[] = [];
  if (statuses.has("draft"))
    batchButtons.push({ label: "提交校閱", onClick: () => runBatch(batchSubmit) });
  if (statuses.has("pending_review"))
    batchButtons.push({ label: "標記已校閱", onClick: () => runBatch(batchReview) });
  if (statuses.has("approved"))
    batchButtons.push({ label: "發布", onClick: () => runBatch(batchPublish) });
  if (statuses.has("published"))
    batchButtons.push({ label: "下架", onClick: () => runBatch(batchUnpublish) });

  const { page, totalPages, total } = pagination;

  return (
    <div className="flex flex-col gap-3">
      {/* filters toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* title search */}
        <input
          type="text"
          placeholder="搜尋標題…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        {/* status filter */}
        <select
          value={query.status ?? ""}
          onChange={(e) =>
            onQueryChange({
              status: (e.target.value as ArticleQuery["status"]) || undefined,
            })
          }
          className="border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">全部狀態</option>
          <option value="draft">草稿</option>
          <option value="pending_review">待校閱</option>
          <option value="approved">待發布</option>
          <option value="published">已發布</option>
        </select>

        {/* date range */}
        <input
          type="date"
          value={query.dateFrom ?? ""}
          onChange={(e) => onQueryChange({ dateFrom: e.target.value || undefined })}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <span className="text-gray-400 text-sm">—</span>
        <input
          type="date"
          value={query.dateTo ?? ""}
          onChange={(e) => onQueryChange({ dateTo: e.target.value || undefined })}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        {/* book filter */}
        {books.length > 0 && (
          <BookFilter
            books={books}
            selected={query.book ?? []}
            onChange={(values: string[]) => onQueryChange({ book: values.length ? values : undefined })}
          />
        )}

        {/* batch actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <span className="text-sm text-gray-500">已選 {selected.size} 筆</span>
            {batchError && (
              <span className="text-sm text-red-500">{batchError}</span>
            )}
            {batchButtons.map((btn) => (
              <button
                key={btn.label}
                onClick={() => btn.onClick()}
                disabled={batchLoading}
                className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {batchLoading ? "處理中…" : btn.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* table */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 w-8">
                  <input
                    type="checkbox"
                    checked={sorted.length > 0 && selected.size === sorted.length}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
                <SortTh label="日期" col="date" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label="標題" col="title" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  讀經範圍
                </th>
                <SortTh label="狀態" col="status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label="更新時間" col="updatedAt" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label="發布時間" col="publishedAt" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-gray-400">
                    載入中…
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-red-400">
                    {error}
                  </td>
                </tr>
              )}
              {!loading && !error && sorted.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-gray-400">
                    沒有符合的文章
                  </td>
                </tr>
              )}
              {!loading && !error && sorted.map((article) => (
                <tr
                  key={article.id}
                  className={selected.has(article.id) ? "bg-blue-50" : "hover:bg-gray-50"}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(article.id)}
                      onChange={() => toggleOne(article.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-gray-700">
                    {formatDate(article.date)}
                  </td>
                  <td className="px-3 py-2 max-w-xs truncate text-gray-800">
                    {article.title ?? (
                      <span className="text-gray-400 italic">（無標題）</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600 text-xs">
                    {article.verseRange ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={article.status} />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500 text-xs">
                    {formatDateTime(article.updatedAt)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500 text-xs">
                    {formatDateTime(article.publishedAt)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/studio/articles/${article.id}/edit`}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        編輯
                      </Link>
                      <Link
                        href={`/${article.date}`}
                        target="_blank"
                        className="text-gray-500 hover:underline text-xs"
                      >
                        查看
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* pagination */}
      {!loading && !error && totalPages > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>共 {total} 筆</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onQueryChange({ page: page - 1 })}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              上一頁
            </button>
            <span className="px-1">
              第 {page} / {totalPages} 頁
            </span>
            <button
              onClick={() => onQueryChange({ page: page + 1 })}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              下一頁
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
