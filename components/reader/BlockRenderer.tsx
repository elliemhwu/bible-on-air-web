import type { Block } from "@/lib/types";
import { VerseBlock } from "./VerseBlock";
import { QuestionsBlock } from "./QuestionsBlock";
import { RichtextBlock } from "./RichtextBlock";

export function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case "verse":
      return <VerseBlock block={block} />;
    case "questions":
      return <QuestionsBlock block={block} />;
    case "richtext":
      return <RichtextBlock block={block} />;
  }
}
