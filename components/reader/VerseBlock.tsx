import type { Verse, VerseDisplayMode, VerseRange } from "@/lib/types";

export function VerseBlock({
  verses,
  ranges = [],
  displayMode = "ordered",
  textSize = "md",
  className = "",
}: {
  verses: Verse[];
  /** The block's ranges, for full book names in headings */
  ranges?: VerseRange[];
  displayMode?: VerseDisplayMode;
  textSize?: "xs" | "sm" | "md";
  className?: string;
}) {
  // Passages from several books or chapters ("申6:1-5；利19:9-18") get a heading at each change
  const place = (v: Verse) => `${v.abbrZh}${v.chapter}`;
  const headed = new Set(verses.map(place)).size > 1;
  const bookName = (v: Verse) => ranges.find((r) => r.abbrZh === v.abbrZh)?.zh || v.zh || v.abbrZh;
  const startsPlace = (idx: number) => headed && (idx === 0 || place(verses[idx]) !== place(verses[idx - 1]));

  return (
    <blockquote className={`text-${textSize} ${className}`}>
      {displayMode === "ordered" && (
        <ul className="leading-[1.9] space-y-1 list-none pl-0">
          {verses.map((verse, idx) => (
            <li key={`${verse.abbrEn}${verse.chapter}_${verse.verse}`}>
              {startsPlace(idx) && (
                <p className={`font-sans text-xs font-semibold tracking-wide ${idx > 0 ? "mt-4" : ""} mb-1`}>
                  {bookName(verse)} {verse.chapter}
                </p>
              )}
              <div className={`flex gap-${textSize === "md" ? 2 : 0}`}>
                <span className="shrink-0 tabular-nums">{verse.verse}.</span>
                <span>{verse.text}</span>
              </div>
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
            <span key={`${verse.abbrEn}${verse.chapter}_${verse.verse}`}>
              {idx > 0 && " "}
              {startsPlace(idx) && <span className="font-semibold">（{verse.abbrZh}{verse.chapter}）</span>}
              <sup className="text-iris-400">{verse.verse}</sup>
              {verse.text}
            </span>
          ))}
        </p>
      )}
    </blockquote>
  );
}
