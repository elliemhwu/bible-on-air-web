import { BlockRenderer } from "@/components/reader/BlockRenderer";
import { getArticle, getArticles } from "@/lib/api";
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

  return (
    <article>
      {coverUrl && (
        <div className="relative w-full aspect-video max-h-[480px] overflow-hidden">
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
      <div className="mx-auto max-w-2xl px-6 py-10">
        <header className="mb-8">
          <p className="text-sm text-[#8b7355] mb-2">
            {formatDateTC(article.date)}
          </p>
          {article.title && (
            <h1 className="text-2xl font-bold leading-snug text-[#2c2c2c]">
              {article.title}
            </h1>
          )}
          <hr className="mt-6 border-[#e8e0d6]" />
        </header>
        <div>
          {sortedBlocks.map((block) => (
            <BlockRenderer key={block.id} block={block} />
          ))}
        </div>
      </div>
    </article>
  );
}
