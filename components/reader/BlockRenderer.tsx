import type { Block } from "@/lib/types";
import { formatVerseRef } from "@/lib/utils";
import { OutlineBlock } from "./OutlineBlock";
import { QuestionsBlock } from "./QuestionsBlock";
import { RichtextBlock } from "./RichtextBlock";
import { SectionHeading } from "./SectionHeading";
import { VerseBlock } from "./VerseBlock";

export function BlockRenderer({
  block,
  afterHeading,
}: {
  block: Block;
  /** Shown between a verse block's heading and its text (the cover, in the 背誦經文 card on phones) */
  afterHeading?: React.ReactNode;
}) {
  switch (block.type) {
    case "verse":
      return (
        <div>
          {block.subheading ? (
            <SectionHeading className="mb-6">{block.subheading}</SectionHeading>
          ) : (
            // The reading passage is headed by its reference, in the verse's own serif
            <h2 className="mb-4 font-serif text-base font-semibold text-primary">
              {formatVerseRef(block.content.ranges)}
            </h2>
          )}
          {afterHeading}

          <div className="py-2">
            {block.content.verses?.length ? (
              <VerseBlock
                verses={block.content.verses}
                ranges={block.content.ranges}
                displayMode={block.content.displayMode}
                className="text-primary"
              />
            ) : (
              <p className="text-sm text-pebble-500">經文暫時無法載入，請稍後再試。</p>
            )}
          </div>

          {block.subheading && (
            <p className="text-right text-sm text-primary mt-2">
              ── {formatVerseRef(block.content.ranges)}
            </p>
          )}
        </div>
      );
    case "questions":
      return <QuestionsBlock block={block} />;
    case "richtext":
      return <RichtextBlock block={block} />;
    case "outline":
      return <OutlineBlock block={block} />;
  }
}
