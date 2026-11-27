import { formatDateTC, isEmptyBlock } from "@/components/reader/ArticleView";
import { OutlineBlock } from "@/components/reader/OutlineBlock";
import { VerseBlock } from "@/components/reader/VerseBlock";
import type { Article, Block } from "@/lib/types";
import { formatVerseRef } from "@/lib/utils";
import { weekday } from "@/lib/week";

/** The reading passage has no subheading; the others are named (背誦經文…) */
const isReading = (b: Block) => b.type === "verse" && !b.subheading;
const isMemory = (b: Block) => b.type === "verse" && !!b.subheading?.includes("背誦");

function Body({ block }: { block: Block }) {
  switch (block.type) {
    case "verse":
      return block.content.verses?.length ? (
        <VerseBlock verses={block.content.verses} ranges={block.content.ranges} displayMode={block.content.displayMode} />
      ) : (
        <p>（經文暫時無法載入）</p>
      );
    case "questions":
      return (
        <ol className="ps-questions">
          {block.content.items.filter((q) => q.trim()).map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ol>
      );
    case "richtext":
      return <div className="ps-prose" dangerouslySetInnerHTML={{ __html: block.content.html }} />;
    case "outline":
      return (
        <div className="ps-outline">
          <OutlineBlock block={{ ...block, subheading: null }} />
        </div>
      );
  }
}

/**
 * One day on A4 paper. Printers are greyscale, so sections are told apart by
 * rules and bold labels rather than colour or smaller type.
 */
export function PrintArticle({ article, withCover }: { article: Article; withCover: boolean }) {
  const blocks = [...article.blocks].sort((a, b) => a.order - b.order).filter((b) => !isEmptyBlock(b));
  const reading = blocks.find(isReading);
  const ref = reading?.type === "verse" ? formatVerseRef(reading.content.ranges) : null;
  const cover = withCover && article.coverImageUrl ? article.coverImageUrl : null;
  // The picture is the memory verse, so it sits in that box; without one it closes the day
  const coverInMemory = !!cover && blocks.some(isMemory);
  // eslint-disable-next-line @next/next/no-img-element -- printed as-is
  const img = cover && <img src={cover} alt={article.title ?? article.date} className="ps-cover" />;

  return (
    <article className="print-sheet">
      <header className="ps-head">
        <p className="ps-meta">
          {formatDateTC(article.date)} 星期{weekday(article.date)}
          {ref && <span>｜{ref}</span>}
        </p>
        {article.title && <h1 className="ps-title">{article.title}</h1>}
      </header>

      {blocks.map((block) => {
        const memory = isMemory(block);
        const label = block.subheading || (isReading(block) ? "經文" : null);
        return (
          <section key={block.id} className={`ps-section ${memory ? "ps-memory" : ""}`}>
            {label && <h2 className="ps-label">{label}</h2>}
            {memory && coverInMemory && img}
            <Body block={block} />
            {block.type === "verse" && !isReading(block) && (
              <p className="ps-ref">── {formatVerseRef(block.content.ranges)}</p>
            )}
          </section>
        );
      })}

      {cover && !coverInMemory && <section className="ps-section">{img}</section>}
    </article>
  );
}
