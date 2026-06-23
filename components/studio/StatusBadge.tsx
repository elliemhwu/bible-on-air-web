import type { ArticleSummary } from "@/lib/types";

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
