import { VerseResultResponse } from "@/lib/types";

type Props = Partial<VerseResultResponse> & {
  onRemove?: () => void;
};

export default function LookupVerseBlock({
  ranges: [range] = [],
  verses = [],
  onRemove,
}: Props) {
  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-blue-600">
          {range?.zh} {range?.chapterStart}:{range?.verseStart}
          {range?.verseEnd !== undefined
            ? `–${range.chapterEnd !== undefined && range.chapterEnd !== range.chapterStart ? `${range.chapterEnd}:` : ""}${range.verseEnd}`
            : ""}
        </p>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 text-xs text-pebble-400 hover:text-pebble-600 transition-colors"
          >
            移除
          </button>
        )}
      </div>
      {verses.map((v) => (
        <p key={`${v.chapter}-${v.verse}`} className="text-sm text-pebble-800">
          <span className="text-xs text-pebble-400 mr-1.5">
            {v.chapter}:{v.verse}
          </span>
          {v.text}
        </p>
      ))}
    </div>
  );
}
