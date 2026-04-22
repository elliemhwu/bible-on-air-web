import type { VerseBlock as VerseBlockType } from "@/lib/types";
import { formatVerseRef } from "@/lib/utils";

export function VerseBlock({ block }: { block: VerseBlockType }) {
  return (
    <div className="my-8">
      {block.subheading && (
        <p className="font-sans text-sm font-semibold text-primary mb-3">
          {block.subheading}
        </p>
      )}
      <blockquote className="relative pl-5 py-1">
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-iris-300" />

        <p className="italic text-iris-600 whitespace-pre-line leading-[1.9]">
          {block.content.cachedText}
        </p>
      </blockquote>
      <p className="text-right text-sm text-primary mt-2">
        ── {formatVerseRef(block.content.range)}
      </p>
    </div>
  );
}
