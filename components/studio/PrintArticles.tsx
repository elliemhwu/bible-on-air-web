"use client";

import { ArticleView } from "@/components/reader/ArticleView";
import { getArticleById, getArticles } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { btnPrimaryCls, inputCls } from "@/lib/styles";
import type { Article } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 31;

function thisWeek(): { from: string; to: string } {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  const from = d.toISOString().slice(0, 10);
  d.setUTCDate(d.getUTCDate() + 6);
  return { from, to: d.toISOString().slice(0, 10) };
}

/**
 * Print-friendly view of a day or a week. The browser's print dialog saves it
 * as PDF, which keeps the Chinese web fonts without a server-side PDF engine.
 */
export default function PrintArticles({ from, to }: { from?: string; to?: string }) {
  const router = useRouter();
  const { token } = useAuth();
  const fallback = thisWeek();
  const range = {
    from: from && DATE_RE.test(from) ? from : fallback.from,
    to: to && DATE_RE.test(to) ? to : from && DATE_RE.test(from) ? from : fallback.to,
  };

  const [fromInput, setFromInput] = useState(range.from);
  const [toInput, setToInput] = useState(range.to);
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [withCover, setWithCover] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setArticles(null);
    setError(null);
    getArticles({ dateFrom: range.from, dateTo: range.to, pageSize: MAX_DAYS }, token)
      .then(({ data }) =>
        Promise.all([...data].reverse().map((a) => getArticleById(token, a.id))),
      )
      .then(setArticles)
      .catch(() => setError("載入文章失敗"));
  }, [token, range.from, range.to]);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    router.replace(`/studio/print?from=${fromInput}&to=${toInput < fromInput ? fromInput : toInput}`);
  }

  return (
    <div>
      <form
        onSubmit={apply}
        className="print:hidden sticky top-0 z-30 flex flex-wrap items-end gap-3 border-b border-pebble-200 bg-pebble-50/95 px-6 py-3 font-sans text-sm backdrop-blur"
      >
        <label className="flex flex-col gap-1 text-pebble-500">
          從
          <input type="date" value={fromInput} onChange={(e) => setFromInput(e.target.value)} className={`${inputCls} !w-auto !py-1.5`} />
        </label>
        <label className="flex flex-col gap-1 text-pebble-500">
          到
          <input type="date" value={toInput} onChange={(e) => setToInput(e.target.value)} className={`${inputCls} !w-auto !py-1.5`} />
        </label>
        <button type="submit" className="rounded-lg border border-pebble-200 bg-white px-4 py-2 text-pebble-700 hover:border-iris-300">
          套用
        </button>
        <label className="flex items-center gap-2 py-2 text-pebble-600">
          <input type="checkbox" checked={withCover} onChange={(e) => setWithCover(e.target.checked)} />
          包含圖片
        </label>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={!articles?.length}
          className={`${btnPrimaryCls} ml-auto`}
        >
          列印 / 存成 PDF
        </button>
      </form>

      <div className="mx-auto max-w-2xl px-6 py-8 print:max-w-none print:p-0">
        {error && <p className="text-sm text-red-500 font-sans">{error}</p>}
        {!articles && !error && <p className="text-sm text-pebble-400 font-sans">載入中…</p>}
        {articles?.length === 0 && <p className="text-sm text-pebble-500 font-sans">這段期間沒有文章。</p>}
        {articles?.map((article) => (
          <article key={article.id} className="mb-16 break-after-page print:mb-0">
            <ArticleView article={article} showCover={withCover} />
          </article>
        ))}
      </div>
    </div>
  );
}
