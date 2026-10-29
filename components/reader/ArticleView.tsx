import { BlockRenderer } from "@/components/reader/BlockRenderer";
import type { Article, Block } from "@/lib/types";
import { formatVerseRef } from "@/lib/utils";
import Image from "next/image";

export function formatDateTC(date: string): string {
  const [year, month, day] = date.split("-");
  return `${year}年${parseInt(month)}月${parseInt(day)}日`;
}

function isEmptyBlock(block: Block): boolean {
  switch (block.type) {
    case "verse":
      return !block.content.ranges?.length;
    case "questions":
      return !block.content.items?.some((q) => q.trim());
    case "richtext":
      return !block.content.html?.replace(/<[^>]*>/g, "").trim();
  }
}

/** The reading passage of a daily devotional; book overviews have none. */
export function readingRef(article: Article): string | null {
  const reading = article.blocks.find(
    (b) => b.type === "verse" && !b.subheading,
  );
  return reading?.type === "verse" && reading.content.ranges.length
    ? formatVerseRef(reading.content.ranges)
    : null;
}

/** Full article layout shared by the reader, review mode and print view. */
export function ArticleView({
  article,
  showCover = true,
}: {
  article: Article;
  showCover?: boolean;
}) {
  const blocks = [...article.blocks]
    .sort((a, b) => a.order - b.order)
    .filter((b) => !isEmptyBlock(b));
  const ref = readingRef(article);

  return (
    <>
      <header className="mb-8">
        <p className="text-sm sm:text-base text-primary mb-2">
          <span className="pr-2">{formatDateTC(article.date)} </span>
          {ref && <span>{ref}</span>}
        </p>
        {article.title && (
          <h1 className="text-2xl sm:text-4xl font-bold leading-snug text-pebble-800">
            {article.title}
          </h1>
        )}
        <hr className="mt-6 border-pebble-300" />
      </header>

      {showCover && article.coverImageUrl && (
        <div className="relative max-w-[450px] aspect-square overflow-hidden mx-auto my-12">
          <Image
            src={article.coverImageUrl}
            alt={article.title ?? article.date}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      <div>
        {blocks.map((block) => (
          <BlockRenderer key={block.id} block={block} />
        ))}
      </div>
    </>
  );
}
