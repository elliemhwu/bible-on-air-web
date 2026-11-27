import { SectionHeading } from "@/components/reader/SectionHeading";
import type { QuestionsBlock as QuestionsBlockType } from "@/lib/types";

export function QuestionsBlock({ block }: { block: QuestionsBlockType }) {
  return (
    <div>
      {block.subheading && (
        <SectionHeading>{block.subheading}</SectionHeading>
      )}
      <ol className="list-decimal pl-6 space-y-3 font-sans">
        {block.content.items.map((item, i) => (
          <li key={i} className="leading-[1.9]">
            {item}
          </li>
        ))}
      </ol>
    </div>
  );
}
