import type { Block } from "@/lib/types";
import { formatVerseRef } from "@/lib/utils";
import { QuestionsBlock } from "./QuestionsBlock";
import { RichtextBlock } from "./RichtextBlock";
import { VerseBlock } from "./VerseBlock";

export function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case "verse":
      return (
        <div className="my-8">
          {block.subheading && (
            <h6 className="font-sans text-sm font-semibold text-primary mb-4">
              {block.subheading}
            </h6>
          )}

          <div className="relative pl-5 pt-2 py-2">
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-iris-300" />
            <VerseBlock
              verses={block.content.verses}
              displayMode={block.content.displayMode}
              className="text-iris-600 italic"
            />
          </div>

          <p className={`text-right text-sm text-primary mt-2`}>
            ── {formatVerseRef(block.content.ranges)}
          </p>
        </div>
      );
    case "questions":
      return <QuestionsBlock block={block} />;
    case "richtext":
      return <RichtextBlock block={block} />;
  }
}
