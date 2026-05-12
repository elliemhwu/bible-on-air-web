import { VerseResultResponse } from "@/lib/types";
import { formatVerseRef } from "@/lib/utils";
import { VerseBlock } from "../reader/VerseBlock";

type Props = Partial<VerseResultResponse> & {
  onRemove?: () => void;
};

export default function LookupVerseBlock({
  ranges = [],
  verses = [],
  onRemove,
}: Props) {
  return (
    <div className="rounded-lg bg-iris-50 p-4">
      <div className="mb-2 flex justify-between align-center">
        <h6 className="text-xs font-semibold text-primary">
          {formatVerseRef(ranges)}
        </h6>

        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 text-xs text-primary hover:text-accent transition-colors"
          >
            移除
          </button>
        )}
      </div>

      <VerseBlock verses={verses} textSize="xs" />
    </div>
  );
}
