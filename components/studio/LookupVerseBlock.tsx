import { VerseResultResponse } from "@/lib/types";
import { formatVerseRef } from "@/lib/utils";
import { VerseBlock } from "../reader/VerseBlock";

type Props = Partial<VerseResultResponse> & {
  onRemove?: () => void;
};

export default function LookupVerseBlock({
  ranges: [range] = [],
  verses = [],
  onRemove,
}: Props) {
  return (
    <div>
      <div className="mb-4 flex justify-between align-center">
        <h6 className="text-xs font-semibold text-primary">
          {formatVerseRef([range])}
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
