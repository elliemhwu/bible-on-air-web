import type { QuestionsBlock as QuestionsBlockType } from "@/lib/types";

export function QuestionsBlock({ block }: { block: QuestionsBlockType }) {
  return (
    <div className="my-8">
      {block.subheading && (
        <p className="font-sans text-sm font-semibold text-primary mb-3">
          {block.subheading}
        </p>
      )}
      <ol className="list-decimal pl-6 space-y-3">
        {block.content.items.map((item, i) => (
          <li key={i} className="leading-[1.9]">
            {item}
          </li>
        ))}
      </ol>
    </div>
  );
}
