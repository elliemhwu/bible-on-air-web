import { ArticleView, formatDateTC } from "@/components/reader/ArticleView";
import { StaffEditLink } from "@/components/reader/StaffEditLink";
import { getArticle, getArticleDates } from "@/lib/api";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

// Pages are rendered on first visit and refreshed in the background, so
// published edits show up within a few minutes.
export const revalidate = 300;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>;
}): Promise<Metadata> {
  const { date } = await params;
  const article = await getArticle(date).catch(() => null);
  return {
    title: article
      ? `${article.title ?? formatDateTC(date)}｜Bible On Air`
      : "Bible On Air",
  };
}

export default async function DatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const [article, dates] = await Promise.all([
    getArticle(date),
    getArticleDates().catch(() => [] as string[]),
  ]);
  if (!article) notFound();

  // dates are newest first
  const index = dates.indexOf(article.date);
  const newer = index > 0 ? dates[index - 1] : null;
  const older = index >= 0 && index < dates.length - 1 ? dates[index + 1] : null;

  return (
    <article>
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-4 flex justify-end empty:hidden">
          <StaffEditLink href={`/studio/articles/${article.id}/edit`} label="編輯這篇" />
        </div>
        <ArticleView article={article} />

        <nav className="mt-12 flex justify-between border-t border-pebble-200 pt-6 font-sans text-sm">
          {older ? (
            <Link href={`/${older}`} className="text-pebble-500 hover:text-pebble-800">
              ← {formatDateTC(older)}
            </Link>
          ) : (
            <span />
          )}
          {newer && (
            <Link href={`/${newer}`} className="text-pebble-500 hover:text-pebble-800">
              {formatDateTC(newer)} →
            </Link>
          )}
        </nav>
      </div>
    </article>
  );
}
