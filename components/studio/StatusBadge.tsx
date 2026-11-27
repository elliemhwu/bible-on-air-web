import type { ArticleSummary } from "@/lib/types";

const STATUS_LABEL: Record<ArticleSummary["status"], string> = {
  draft: "草稿",
  pending_review: "待校閱",
  approved: "待發布",
  published: "已發布",
};

const STATUS_COLOR: Record<ArticleSummary["status"], string> = {
  draft: "bg-st-sunken text-st-muted",
  pending_review: "bg-st-gold-soft text-st-gold-soft-ink",
  approved: "bg-st-soft text-st-accent",
  published: "bg-st-sage-soft text-st-sage-ink",
};

export default function StatusBadge({
  status,
}: {
  status: ArticleSummary["status"];
}) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLOR[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
