import type { VerseBlock as VerseBlockType } from "@/lib/types";
import { formatVerseRef } from "@/lib/utils";

export function VerseBlock({ block }: { block: VerseBlockType }) {
  return (
    <div className="my-8">
      {block.subheading && (
        <p className="text-sm font-semibold text-[#8b6f47] mb-3">
          {block.subheading}
        </p>
      )}
      <blockquote className="border-l-4 border-[#8b6f47] pl-5 py-1">
        <p className="italic text-[#2c2c2c] whitespace-pre-line leading-[1.9]">
          {block.content.cachedText}
        </p>
      </blockquote>
      <p className="text-right text-sm text-[#8b7355] mt-2">
        ── {formatVerseRef(block.content.range)}
      </p>
    </div>
  );
}
