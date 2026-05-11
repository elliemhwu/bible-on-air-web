import { VerseResultResponse } from "@/lib/types";

type Props = Partial<VerseResultResponse> & {
  onAdd?: () => void;
  onRemove?: () => void;
};

export default function LookupVerseBlock({
  ranges: [range] = [],
  verses = [],
  onAdd,
  onRemove,
}: Props) {
  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 flex flex-col gap-2">
      <p className="text-xs font-medium text-blue-600">
        {range?.zh} {range?.chapterStart}:{range?.verseStart}
        {range?.verseEnd !== undefined
          ? `–${range.chapterEnd !== undefined && range.chapterEnd !== range.chapterStart ? `${range.chapterEnd}:` : ""}${range.verseEnd}`
          : ""}
      </p>
      {verses.map((v) => (
        <p key={`${v.chapter}-${v.verse}`} className="text-sm text-pebble-800">
          <span className="text-xs text-pebble-400 mr-1.5">
            {v.chapter}:{v.verse}
          </span>
          {v.text}
        </p>
      ))}

      <div className="flex gap-1.5">
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="self-start mt-1 rounded-md bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200 transition-colors"
          >
            + 加入此段
          </button>
        )}

        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="self-start mt-1 rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200 transition-colors"
          >
            x 移除此段
          </button>
        )}
      </div>
    </div>
  );
}
