import type { VerseBlock as VerseBlockType } from "@/lib/types";
import { formatVerseRef } from "@/lib/utils";

export function VerseBlock({ block }: { block: VerseBlockType }) {
  return (
    <div className="my-8">
      {block.subheading && (
        <p className="text-sm font-semibold text-accent mb-3">
          {block.subheading}
        </p>
      )}
      <blockquote className="border-l-4 border-accent pl-5 py-1">
        <p className="italic text-foreground whitespace-pre-line leading1.9]">
          {block.content.cachedText}
        </p>
      </blockquote>
      <p className="text-right text-sm text-muted mt-2">
        ── {formatVerseRef(block.content.range)}
      </p>
    </div>
  );
}
