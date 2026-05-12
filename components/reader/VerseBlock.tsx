import type { Verse, VerseDisplayMode } from "@/lib/types";

export function VerseBlock({
  verses,
  displayMode = "ordered",
  textSize = "md",
  className = "",
}: {
  verses: Verse[];
  displayMode?: VerseDisplayMode;
  textSize?: "xs" | "sm" | "md";
  className?: string;
}) {
  return (
    <blockquote className={`text-${textSize} ${className}`}>
      {displayMode === "ordered" && (
        <ul className="leading-[1.9] space-y-1 list-none pl-0">
          {verses.map((verse) => (
            <li
              key={`${verse.abbrEn}${verse.chapter}_${verse.verse}`}
              className={`flex gap-${textSize === "md" ? 2 : 0}`}
            >
              <span className="shrink-0 tabular-nums">{verse.verse}.</span>
              <span>{verse.text}</span>
            </li>
          ))}
        </ul>
      )}

      {displayMode === "inline" && (
        <p className="leading-[1.9]">{verses.map((v) => v.text).join(" ")}</p>
      )}

      {displayMode === "inline-numbered" && (
        <p className="leading-[1.9]">
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
  );
}
