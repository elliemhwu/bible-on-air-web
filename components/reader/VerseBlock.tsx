import type { VerseBlock as VerseBlockType, VerseDisplayMode } from "@/lib/types";
import { formatVerseRef } from "@/lib/utils";

export function VerseBlock({
  block,
  mode = "ordered",
}: {
  block: VerseBlockType;
  mode?: VerseDisplayMode;
}) {
  const verses = block.content.verses;

  return (
    <div className="my-8">
      {block.subheading && (
        <p className="font-sans text-sm font-semibold text-primary mb-3">
          {block.subheading}
        </p>
      )}
      <blockquote className="relative pl-5 py-1">
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-iris-300" />

        {mode === "ordered" && (
          <ul className="italic text-iris-600 leading-[1.9] space-y-1 list-none pl-0">
            {verses.map((verse) => (
              <li key={verse.verse} className="flex gap-2">
                <span className="shrink-0 tabular-nums">
                  {verse.verse}.
                </span>
                <span>{verse.text}</span>
              </li>
            ))}
          </ul>
        )}

        {mode === "inline" && (
          <p className="italic text-iris-600 leading-[1.9]">
            {verses.map((v) => v.text).join(" ")}
          </p>
        )}

        {mode === "inline-numbered" && (
          <p className="italic text-iris-600 leading-[1.9]">
            {verses.map((verse, idx) => (
              <span key={verse.verse}>
                {idx > 0 && " "}
                <sup className="not-italic text-iris-400">{verse.verse}</sup>
                {verse.text}
              </span>
            ))}
          </p>
        )}
      </blockquote>
      <p className="text-right text-sm text-primary mt-2">
        ── {formatVerseRef(block.content.ranges)}
      </p>
    </div>
  );
}
