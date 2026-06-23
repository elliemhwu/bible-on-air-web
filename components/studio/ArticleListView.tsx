"use client";

import {
  batchPublish,
  batchReview,
  batchSubmit,
  batchUnpublish,
} from "@/lib/api";
import type { ArticleSummary } from "@/lib/types";
import Link from "next/link";
import { useMemo, useState } from "react";

const STATUS_LABEL: Record<ArticleSummary["status"], string> = {
  draft: "草稿",
  pending_review: "待校閱",
  approved: "待發布",
  published: "已發布",
};

const STATUS_COLOR: Record<ArticleSummary["status"], string> = {
  draft: "bg-gray-100 text-gray-600",
  pending_review: "bg-yellow-100 text-yellow-700",
  approved: "bg-blue-100 text-blue-700",
  published: "bg-green-100 text-green-700",
};

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

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return iso.slice(0, 16).replace("T", " ");
}

export default function ArticleListView({
  articles,
  token,
  onArticlesUpdated,
}: {
  articles: ArticleSummary[];
  token: string | null;
  onArticlesUpdated: (updated: ArticleSummary[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

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
      if (sortKey === "date") {
        av = a.date;
        bv = b.date;
      } else if (sortKey === "title") {
        av = a.title ?? "";
        bv = b.title ?? "";
      } else if (sortKey === "status") {
        av = a.status;
        bv = b.status;
      } else if (sortKey === "updatedAt") {
        av = a.updatedAt;
        bv = b.updatedAt;
      } else if (sortKey === "publishedAt") {
        av = a.publishedAt ?? "";
        bv = b.publishedAt ?? "";
      }
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function toggleAll() {
    if (selected.size === sorted.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sorted.map((a) => a.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
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

  return (
    <div className="flex flex-col gap-3">
      {/* toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          placeholder="搜尋標題…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
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
                    checked={
                      sorted.length > 0 && selected.size === sorted.length
                    }
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
              {sorted.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-gray-400"
                  >
                    沒有符合的文章
                  </td>
                </tr>
              )}
              {sorted.map((article) => (
                <tr
                  key={article.id}
                  className={
                    selected.has(article.id) ? "bg-blue-50" : "hover:bg-gray-50"
                  }
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
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600 text-xs">
                    {article.verseRange ?? "—"}
                  </td>
                  <td className="px-3 py-2 max-w-xs truncate text-gray-800">
                    {article.title ?? (
                      <span className="text-gray-400 italic">（無標題）</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[article.status]}`}
                    >
                      {STATUS_LABEL[article.status]}
                    </span>
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
    </div>
  );
}

