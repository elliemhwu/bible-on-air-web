"use client";

import StatusBadge from "@/components/studio/StatusBadge";
import { batchPublish, getArticles } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { canEdit, canPublish, canReview, canUploadImages } from "@/lib/roles";
import type { ArticleSummary } from "@/lib/types";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const UPCOMING_DAYS = 14;

function taipeiDate(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(d);
}

function mondayOf(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const diff = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

function ArticleRows({ articles, href }: { articles: ArticleSummary[]; href: (a: ArticleSummary) => string }) {
  if (articles.length === 0) return <p className="px-4 py-3 text-sm text-pebble-400">沒有項目</p>;
  return (
    <ul className="divide-y divide-pebble-100">
      {articles.map((a) => (
        <li key={a.id}>
          <Link href={href(a)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-pebble-50">
            <span className="w-24 shrink-0 tabular-nums text-pebble-500">{a.date}</span>
            <span className="min-w-0 flex-1 truncate text-pebble-800">{a.title ?? "（無標題）"}</span>
            <span className="hidden text-xs text-pebble-400 sm:inline">{a.verseRange}</span>
            <StatusBadge status={a.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Card({ title, count, action, children }: { title: string; count?: number; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-pebble-200 bg-white">
      <div className="flex items-center justify-between border-b border-pebble-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-pebble-800">
          {title}
          {count !== undefined && <span className="ml-2 font-normal text-pebble-400">{count}</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function StudioDashboard() {
  const { token, user } = useAuth();
  const [drafts, setDrafts] = useState<ArticleSummary[]>([]);
  const [pending, setPending] = useState<ArticleSummary[]>([]);
  const [approved, setApproved] = useState<ArticleSummary[]>([]);
  const [upcoming, setUpcoming] = useState<ArticleSummary[]>([]);
  const [totals, setTotals] = useState({ draft: 0, pending_review: 0, approved: 0 });
  const [publishing, setPublishing] = useState(false);

  const today = taipeiDate();
  const upcomingDates = Array.from({ length: UPCOMING_DAYS }, (_, i) => taipeiDate(i));

  const load = useCallback(async () => {
    if (!token) return;
    const list = (status: "draft" | "pending_review" | "approved") =>
      getArticles({ status, pageSize: 10 }, token).catch(() => ({ data: [], pagination: { total: 0 } }));
    const [d, p, a, u] = await Promise.all([
      list("draft"),
      list("pending_review"),
      list("approved"),
      getArticles(
        { dateFrom: taipeiDate(), dateTo: taipeiDate(UPCOMING_DAYS - 1), pageSize: UPCOMING_DAYS },
        token,
      ).catch(() => ({ data: [] })),
    ]);
    setDrafts(d.data);
    setPending(p.data);
    setApproved(a.data);
    setUpcoming(u.data);
    setTotals({ draft: d.pagination.total, pending_review: p.pagination.total, approved: a.pagination.total });
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function publishAllApproved() {
    if (!token || approved.length === 0) return;
    if (!confirm(`確定要發布 ${approved.length} 篇已校閱的文章嗎？`)) return;
    setPublishing(true);
    try {
      await batchPublish(token, approved.map((a) => a.id));
      await load();
    } finally {
      setPublishing(false);
    }
  }

  const byDate = new Map(upcoming.map((a) => [a.date, a]));
  const missingArticle = upcomingDates.filter((d) => !byDate.has(d));
  const missingCover = upcoming.filter((a) => !a.coverImageUrl);

  const links = [
    { href: "/studio/articles", label: "文章管理", show: true },
    { href: "/studio/articles/new", label: "新增文章", show: canEdit(user) },
    { href: "/studio/images", label: "上傳圖片", show: canUploadImages(user) },
    { href: "/studio/sync", label: "從舊網站同步", show: canEdit(user) },
    { href: "/studio/print", label: "列印 / PDF", show: true },
    { href: "/", label: "前台", show: true },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-8 font-sans">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold text-pebble-800">後台</h1>
        <span className="text-sm text-pebble-500">
          {user?.name}，今天是 {today}
        </span>
      </div>

      <nav className="mb-8 flex flex-wrap gap-2">
        {links
          .filter((l) => l.show)
          .map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg border border-pebble-200 bg-white px-4 py-2 text-sm text-pebble-700 hover:border-iris-300 hover:text-iris-600 transition"
            >
              {l.label}
            </Link>
          ))}
      </nav>

      <div className="flex flex-col gap-6">
        {(canEdit(user) || canUploadImages(user)) && (
          <Card title={`未來 ${UPCOMING_DAYS} 天`}>
            <div className="grid gap-4 px-4 py-3 text-sm sm:grid-cols-2">
              {canEdit(user) && (
                <div>
                  <div className="mb-1 text-pebble-500">還沒有文章（{missingArticle.length}）</div>
                  <div className="flex flex-wrap gap-1.5">
                    {missingArticle.length === 0 && <span className="text-pebble-400">都已安排</span>}
                    {missingArticle.map((d) => (
                      <Link
                        key={d}
                        href={`/studio/articles/new?date=${d}`}
                        className="rounded bg-amber-50 px-2 py-0.5 tabular-nums text-amber-800 hover:bg-amber-100"
                      >
                        {d.slice(5)}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {canUploadImages(user) && (
                <div>
                  <div className="mb-1 text-pebble-500">還沒有圖片（{missingCover.length}）</div>
                  <div className="flex flex-wrap gap-1.5">
                    {missingCover.length === 0 && <span className="text-pebble-400">都已上傳</span>}
                    {missingCover.map((a) => (
                      <Link
                        key={a.id}
                        href={`/studio/images/${mondayOf(a.date)}`}
                        className="rounded bg-sky-50 px-2 py-0.5 tabular-nums text-sky-800 hover:bg-sky-100"
                      >
                        {a.date.slice(5)}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {canEdit(user) && (
          <Card title="草稿" count={totals.draft}>
            <ArticleRows articles={drafts} href={(a) => `/studio/articles/${a.id}/edit`} />
          </Card>
        )}

        {canReview(user) && (
          <Card title="待校閱" count={totals.pending_review}>
            <ArticleRows articles={pending} href={(a) => `/studio/articles/${a.id}/review`} />
          </Card>
        )}

        {canPublish(user) && (
          <Card
            title="已校閱、待發布"
            count={totals.approved}
            action={
              approved.length > 0 && (
                <button
                  type="button"
                  onClick={publishAllApproved}
                  disabled={publishing}
                  className="rounded-md bg-iris-500 px-3 py-1 text-xs font-semibold text-white hover:bg-iris-600 disabled:opacity-50"
                >
                  {publishing ? "發布中…" : `發布這 ${approved.length} 篇`}
                </button>
              )
            }
          >
            <ArticleRows articles={approved} href={(a) => `/studio/articles/${a.id}/review`} />
          </Card>
        )}
      </div>
    </main>
  );
}
