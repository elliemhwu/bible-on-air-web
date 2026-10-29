"use client";

import StatusBadge from "@/components/studio/StatusBadge";
import { batchPublish, batchReview, batchSubmit, batchUnpublish } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { canEdit, canPublish, canReview } from "@/lib/roles";
import type { ArticleSummary } from "@/lib/types";
import { useState } from "react";

type Props = {
  article: Pick<ArticleSummary, "id" | "status">;
  onChanged: (status: ArticleSummary["status"]) => void;
};

/** Status badge plus the workflow buttons the signed-in user may use. */
export default function ArticleStatusActions({ article, onChanged }: Props) {
  const { token, user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: typeof batchSubmit) {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const [updated] = await action(token, [article.id]);
      if (updated) onChanged(updated.status);
    } catch {
      setError("更新狀態失敗");
    } finally {
      setBusy(false);
    }
  }

  const btn =
    "rounded-md border border-pebble-200 bg-white px-3 py-1 text-sm text-pebble-700 hover:border-iris-300 hover:text-iris-600 disabled:opacity-50 transition-colors";

  return (
    <div className="flex flex-wrap items-center gap-2 font-sans">
      <StatusBadge status={article.status} />
      {article.status === "draft" && canEdit(user) && (
        <button type="button" disabled={busy} onClick={() => run(batchSubmit)} className={btn}>
          送出校閱
        </button>
      )}
      {(article.status === "draft" || article.status === "pending_review") && canReview(user) && (
        <button type="button" disabled={busy} onClick={() => run(batchReview)} className={btn}>
          標記已校閱
        </button>
      )}
      {article.status !== "published" && canPublish(user) && (
        <button type="button" disabled={busy} onClick={() => run(batchPublish)} className={btn}>
          發布
        </button>
      )}
      {article.status === "published" && canPublish(user) && (
        <button type="button" disabled={busy} onClick={() => run(batchUnpublish)} className={btn}>
          取消發布
        </button>
      )}
      {error && <span className="text-sm text-red-500">{error}</span>}
    </div>
  );
}
