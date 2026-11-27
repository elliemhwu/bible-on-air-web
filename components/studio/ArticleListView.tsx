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

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

const SORTS: [SortKey, string][] = [
  ["date", "日期"],
  ["title", "標題"],
  ["status", "狀態"],
  ["updatedAt", "更新"],
  ["publishedAt", "發布"],
];

function SortBtn({
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
    <button
      type="button"
      onClick={() => onSort(col)}
      className={`rounded px-1.5 py-0.5 ${active ? "bg-st-surface font-medium text-st-ink shadow-sm" : "hover:text-st-ink"}`}
    >
      {label}
      {active && <span className="ml-0.5">{sortDir === "asc" ? "↑" : "↓"}</span>}
    </button>
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
        className={`border rounded-lg px-3 py-1.5 text-sm transition-colors flex items-center gap-1 ${
          selected.length > 0
            ? "border-st-accent text-st-accent bg-st-soft"
            : "border-st-line-strong text-st-ink-2 hover:bg-st-soft"
        }`}
      >
        {label}
        <span className="text-st-muted text-xs ml-1">▾</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 left-0 w-36 max-h-72 overflow-y-auto rounded-lg border border-st-line bg-st-surface shadow-lg py-1">
          {books.map((b) => (
            <label
              key={b.abbrZh}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-st-ink-2 hover:bg-st-soft cursor-pointer"
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
          className="border border-st-line-strong rounded-lg px-3 py-1.5 text-sm w-44 outline-none focus:border-st-accent focus:ring-2 focus:ring-st-accent/20"
        />

        {/* status filter */}
        <select
          value={query.status ?? ""}
          onChange={(e) =>
            onQueryChange({
              status: (e.target.value as ArticleQuery["status"]) || undefined,
            })
          }
          className="border border-st-line-strong rounded-lg px-3 py-1.5 text-sm text-st-ink-2 outline-none focus:border-st-accent focus:ring-2 focus:ring-st-accent/20"
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
          className="border border-st-line-strong rounded-lg px-2 py-1.5 text-sm text-st-ink-2 outline-none focus:border-st-accent focus:ring-2 focus:ring-st-accent/20"
        />
        <span className="text-st-muted text-sm">—</span>
        <input
          type="date"
          value={query.dateTo ?? ""}
          onChange={(e) => onQueryChange({ dateTo: e.target.value || undefined })}
          className="border border-st-line-strong rounded-lg px-2 py-1.5 text-sm text-st-ink-2 outline-none focus:border-st-accent focus:ring-2 focus:ring-st-accent/20"
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
            <span className="text-sm text-st-muted">已選 {selected.size} 筆</span>
            {batchError && (
              <span className="text-sm text-st-danger">{batchError}</span>
            )}
            {batchButtons.map((btn) => (
              <button
                key={btn.label}
                onClick={() => btn.onClick()}
                disabled={batchLoading}
                className="px-3 py-1.5 text-sm rounded border border-st-line-strong hover:bg-st-soft disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {batchLoading ? "處理中…" : btn.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* list: reads like the reader's history, with status and batch selection */}
      <div className="rounded-[14px] border border-st-line bg-st-surface overflow-hidden">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-st-line bg-st-sunken px-4 py-2 text-xs text-st-muted">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sorted.length > 0 && selected.size === sorted.length}
              onChange={toggleAll}
              className="rounded"
            />
            全選
          </label>
          <span className="flex-1" />
          <span>排序</span>
          {SORTS.map(([col, label]) => (
            <SortBtn key={col} label={label} col={col} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
          ))}
        </div>
        {loading && <p className="m-0 px-4 py-8 text-center text-sm text-st-muted">載入中…</p>}
        {!loading && error && <p className="m-0 px-4 py-8 text-center text-sm text-st-danger">{error}</p>}
        {!loading && !error && sorted.length === 0 && (
          <p className="m-0 px-4 py-8 text-center text-sm text-st-muted">沒有符合的文章</p>
        )}
        {!loading && !error && sorted.length > 0 && (
          <ul className="m-0 list-none divide-y divide-st-line p-0">
            {sorted.map((article) => (
              <li
                key={article.id}
                title={`更新 ${formatDateTime(article.updatedAt)}${article.publishedAt ? ` · 發布 ${formatDateTime(article.publishedAt)}` : ""}`}
                className={`group flex items-center gap-3 px-4 py-3 ${selected.has(article.id) ? "bg-st-soft" : "hover:bg-st-soft/60"}`}
              >
                <input
                  type="checkbox"
                  aria-label={`選取 ${article.date}`}
                  checked={selected.has(article.id)}
                  onChange={() => toggleOne(article.id)}
                  className="rounded"
                />
                <div className="w-14 shrink-0 text-center">
                  <div className="text-xs tabular-nums text-st-muted">{article.date.slice(0, 7).replace("-", "/")}</div>
                  <div className="font-serif text-xl leading-tight tabular-nums text-st-ink">{parseInt(article.date.slice(8))}</div>
                  <div className="text-xs text-st-muted">週{WEEKDAYS[new Date(`${article.date}T00:00:00`).getDay()]}</div>
                </div>
                <Link
                  href={`/studio/articles/${article.id}/edit`}
                  className="min-w-0 flex-1 no-underline"
                >
                  <div className="truncate font-serif text-base leading-snug text-st-ink group-hover:text-st-accent">
                    {article.title ?? <span className="italic text-st-muted">無標題</span>}
                  </div>
                  <div className="text-sm text-st-accent">{article.verseRange ?? "—"}</div>
                </Link>
                <StatusBadge status={article.status} />
                <Link
                  href={`/${article.date}`}
                  target="_blank"
                  className="shrink-0 text-xs text-st-muted hover:text-st-ink hover:underline"
                >
                  查看
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* pagination */}
      {!loading && !error && totalPages > 0 && (
        <div className="flex items-center justify-between text-sm text-st-muted">
          <span>共 {total} 筆</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onQueryChange({ page: page - 1 })}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded border border-st-line-strong hover:bg-st-soft disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              上一頁
            </button>
            <span className="px-1">
              第 {page} / {totalPages} 頁
            </span>
            <button
              onClick={() => onQueryChange({ page: page + 1 })}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded border border-st-line-strong hover:bg-st-soft disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              下一頁
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
