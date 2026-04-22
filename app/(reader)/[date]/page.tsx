import { BlockRenderer } from "@/components/reader/BlockRenderer";
import { getArticle, getArticles } from "@/lib/api";
import { VerseBlock } from "@/lib/types";
import { formatVerseRef } from "@/lib/utils";
import Image from "next/image";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

function formatDateTC(date: string): string {
  const [year, month, day] = date.split("-");
  return `${year}年${parseInt(month)}月${parseInt(day)}日`;
}

export async function generateStaticParams() {
  const articles = await getArticles();
  return articles.map((a) => ({ date: a.date }));
}

export const revalidate = process.env.NODE_ENV === "development" ? 0 : 86400;

export default async function DatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const article = await getArticle(date);
  const sortedBlocks = [...article.blocks].sort((a, b) => a.order - b.order);
  const coverUrl = article.coverImageUrl
    ? `${BASE}${article.coverImageUrl}`
    : null;

  function renderDailyVerseRange() {
    const mainDailyVerseBlock = sortedBlocks.find(
      (b) => b.type === "verse" && !b.subheading,
    ) as VerseBlock;
    return formatVerseRef(mainDailyVerseBlock.content.range);
  }

  return (
    <article>
      <div className="mx-auto max-w-2xl px-6 py-10">
        <header className="mb-8">
          <p className="text-sm sm:text-base text-muted mb-2">
            <span>{formatDateTC(article.date)} </span>
            <span>{renderDailyVerseRange()}</span>
          </p>
          {article.title && (
            <h1 className="text-2xl sm:text-4xl font-bold leading-snug text-foreground">
              {article.title}
            </h1>
          )}
          <hr className="mt-6 border-brand-secondary" />
        </header>

        {coverUrl && (
          <div className="relative max-w-[450px] aspect-square overflow-hidden mx-auto my-12">
            <Image
              src={coverUrl}
              alt={article.title ?? article.date}
              fill
              className="object-cover"
              priority
              unoptimized={process.env.NODE_ENV === "development"}
            />
          </div>
        )}

        <div>
          {sortedBlocks.map((block) => (
            <BlockRenderer key={block.id} block={block} />
          ))}
        </div>
      </div>
    </article>
  );
}
