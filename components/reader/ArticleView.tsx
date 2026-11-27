import { BlockRenderer } from "@/components/reader/BlockRenderer";
import type { Article, Block } from "@/lib/types";
import { isEmptyOutline } from "@/lib/outline";
import { formatVerseRef } from "@/lib/utils";
import Image from "next/image";

export function formatDateTC(date: string): string {
  const [year, month, day] = date.split("-");
  return `${year}年${parseInt(month)}月${parseInt(day)}日`;
}

export function isEmptyBlock(block: Block): boolean {
  switch (block.type) {
    case "verse":
      return !block.content.ranges?.length;
    case "questions":
      return !block.content.items?.some((q) => q.trim());
    case "richtext":
      return !block.content.html?.replace(/<[^>]*>/g, "").trim();
    case "outline":
      return isEmptyOutline(block.content);
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

export const isMemoryBlock = (b: Block) =>
  b.type === "verse" && !!b.subheading?.includes("背誦");

function CoverImage({ src, alt, className }: { src: string; alt: string; className: string }) {
  return (
    <div className={`relative max-w-[450px] aspect-square overflow-hidden mx-auto ${className}`}>
      <Image src={src} alt={alt} fill className="object-cover" priority />
    </div>
  );
}

/** On phones, the opening and each section are a page that scrolling settles on */
function Page({
  paged,
  opening = false,
  children,
}: {
  paged: boolean;
  opening?: boolean;
  children: React.ReactNode;
}) {
  if (!paged) return <div>{children}</div>;
  return <section className={`reader-page ${opening ? "reader-opening" : ""}`}>{children}</section>;
}

/** Full article layout shared by the reader, review mode and print view. */
export function ArticleView({
  article,
  showCover = true,
  paged = false,
}: {
  article: Article;
  showCover?: boolean;
  /** On phones, the opening and each section become a page that scrolling snaps to */
  paged?: boolean;
}) {
  const blocks = [...article.blocks]
    .sort((a, b) => a.order - b.order)
    .filter((b) => !isEmptyBlock(b));
  const ref = readingRef(article);
  const cover = showCover && article.coverImageUrl ? article.coverImageUrl : null;
  // On phones the cover moves into the 背誦經文 card, between its heading and the verse
  const memory = paged && cover ? blocks.find(isMemoryBlock) : undefined;

  return (
    <>
      <Page paged={paged} opening>
        <header className="mb-8">
          <p className="text-sm sm:text-base text-primary mb-2">
            <span className="pr-2">{formatDateTC(article.date)} </span>
            {ref && <span>{ref}</span>}
          </p>
          {article.title && (
            <h1 className="text-2xl sm:text-3xl font-semibold leading-snug tracking-[0.08em] text-pebble-800">
              {article.title}
            </h1>
          )}
          <hr className="mt-6 border-pebble-300" />
        </header>

        {cover && (
          <CoverImage
            src={cover}
            alt={article.title ?? article.date}
            className={`my-12 ${memory ? "max-sm:hidden" : ""}`}
          />
        )}
      </Page>

      {/* Sections are spaced by the layout, not by each block; pages need no gap */}
      <div className={`flex flex-col gap-36 ${paged ? "max-sm:gap-0" : ""}`}>
        {blocks.map((block) => (
          <Page key={block.id} paged={paged}>
            <BlockRenderer
              block={block}
              afterHeading={
                cover && block === memory ? (
                  <CoverImage src={cover} alt={article.title ?? article.date} className="mb-6 sm:hidden" />
                ) : undefined
              }
            />
          </Page>
        ))}
      </div>
    </>
  );
}
