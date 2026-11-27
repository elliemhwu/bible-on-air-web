"use client";

import { getArticleById, getArticles } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PrintArticle } from "@/components/studio/PrintArticle";
import { StudioPage } from "@/components/studio/shell/StudioHeader";
import { stBtnPrimary, stBtnSecondary, stInput } from "@/lib/styles";
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
  const [loaded, setLoaded] = useState<{ key: string; articles: Article[] } | null>(null);
  const [withCover, setWithCover] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const key = `${range.from}~${range.to}`;
  // Results and errors only count for the range they were loaded for
  const articles = loaded?.key === key ? loaded.articles : null;
  const error = failed === key ? "載入文章失敗" : null;

  useEffect(() => {
    if (!token) return;
    const key = `${range.from}~${range.to}`;
    getArticles({ dateFrom: range.from, dateTo: range.to, pageSize: MAX_DAYS }, token)
      .then(({ data }) =>
        Promise.all([...data].reverse().map((a) => getArticleById(token, a.id))),
      )
      .then((list) => setLoaded({ key, articles: list }))
      .catch(() => setFailed(key));
  }, [token, range.from, range.to]);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    router.replace(`/studio/print?from=${fromInput}&to=${toInput < fromInput ? fromInput : toInput}`);
  }

  return (
    <StudioPage>
      <form
        onSubmit={apply}
        className="sticky top-0 z-30 flex flex-wrap items-center gap-x-4 gap-y-2.5 border-b border-st-line bg-st-surface px-4 py-3.5 print:hidden sm:px-8"
      >
        <h1 className="m-0 text-base font-medium">列印 / PDF</h1>
        <label className="flex items-center gap-2 text-sm text-st-muted">
          從
          <input type="date" value={fromInput} onChange={(e) => setFromInput(e.target.value)} className={stInput} />
        </label>
        <label className="flex items-center gap-2 text-sm text-st-muted">
          到
          <input type="date" value={toInput} onChange={(e) => setToInput(e.target.value)} className={stInput} />
        </label>
        <button type="submit" className={stBtnSecondary}>
          套用
        </button>
        <label className="flex items-center gap-2 text-sm text-st-ink-2">
          <input type="checkbox" className="rounded" checked={withCover} onChange={(e) => setWithCover(e.target.checked)} />
          包含圖片
        </label>
        <span className="flex-1" />
        <span className="text-xs text-st-muted">列印時請在「更多設定」取消勾選「頁首和頁尾」</span>
        <button type="button" onClick={() => window.print()} disabled={!articles?.length} className={stBtnPrimary}>
          列印 / 存成 PDF
        </button>
      </form>

      <main className="mx-auto flex w-full max-w-[calc(210mm+4rem)] flex-col gap-5 px-4 py-5 sm:px-8 print:max-w-none print:gap-0 print:p-0">
        {error && <p className="m-0 text-sm text-st-danger print:hidden">{error}</p>}
        {!articles && !error && <p className="m-0 text-sm text-st-muted print:hidden">載入中…</p>}
        {articles?.length === 0 && <p className="m-0 text-sm text-st-muted print:hidden">這段期間沒有文章。</p>}
        {articles?.map((article) => (
          <PrintArticle key={article.id} article={article} withCover={withCover} />
        ))}
      </main>
    </StudioPage>
  );
}
