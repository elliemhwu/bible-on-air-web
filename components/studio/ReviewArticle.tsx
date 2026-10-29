"use client";

import { ArticleView } from "@/components/reader/ArticleView";
import ArticleStatusActions from "@/components/studio/ArticleStatusActions";
import { getArticleById, getArticles } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { canReview } from "@/lib/roles";
import type { Article, ArticleSummary } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

/** Reading view of an unpublished article with the review / publish actions. */
export default function ReviewArticle({ articleId }: { articleId: string }) {
  const { token, user } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [queue, setQueue] = useState<ArticleSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getArticleById(token, articleId)
      .then(setArticle)
      .catch(() => setError("無法載入文章"));
  }, [token, articleId]);

  // What the user would review next: pending review for reviewers, approved for managers
  const queueStatus = canReview(user) && !user?.roles.includes("manager") ? "pending_review" : "approved";
  useEffect(() => {
    if (!token) return;
    getArticles({ status: queueStatus, pageSize: 50 }, token)
      .then((res) => setQueue(res.data))
      .catch(() => setQueue([]));
  }, [token, queueStatus]);

  if (error) return <p className="px-6 py-12 text-sm text-red-500 font-sans">{error}</p>;
  if (!article) return <p className="px-6 py-12 text-sm text-pebble-400 font-sans">載入中…</p>;

  const next = queue.filter((a) => a.id !== article.id).sort((a, b) => a.date.localeCompare(b.date))[0];

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-30 border-b border-pebble-200 bg-pebble-50/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 px-6 py-3 font-sans text-sm">
          <ArticleStatusActions
            article={article}
            onChanged={(status) => setArticle({ ...article, status })}
          />
          <div className="flex gap-4">
            <Link href={`/studio/articles/${article.id}/edit`} className="text-iris-600 hover:text-iris-700">
              編輯
            </Link>
            {next && (
              <Link href={`/studio/articles/${next.id}/review`} className="text-iris-600 hover:text-iris-700">
                下一篇 {next.date.slice(5)} →
              </Link>
            )}
            <Link href="/studio" className="text-pebble-500 hover:text-pebble-800">
              後台
            </Link>
          </div>
        </div>
      </div>
      <article className="mx-auto w-full max-w-2xl px-6 py-10">
        <ArticleView article={article} />
      </article>
    </div>
  );
}
