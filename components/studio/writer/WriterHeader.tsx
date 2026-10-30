import { stSegment, stSegmentItem } from "@/lib/styles";
import Link from "next/link";

/** Top bar of reading / writing mode: back to my work, save state, mode switch, actions */
export default function WriterHeader({
  date,
  mode,
  status,
  children,
}: {
  date: string;
  mode: "read" | "write";
  status: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-st-line bg-st-surface px-4 py-3 sm:px-7">
      <Link href="/studio/my" className="text-st-ink-2 no-underline">‹ 我的稿件</Link>
      <span className="flex-1 text-[13px] text-st-muted" aria-live="polite">{status}</span>
      <div role="group" aria-label="模式" className={stSegment}>
        {mode === "read" ? (
          <span aria-current="page" className={stSegmentItem(true)}>讀經</span>
        ) : (
          <Link href={`/studio/write/${date}`} className={`${stSegmentItem(false)} no-underline`}>讀經</Link>
        )}
        {mode === "write" ? (
          <span aria-current="page" className={stSegmentItem(true)}>寫作</span>
        ) : (
          <Link href={`/studio/write/${date}/compose`} className={`${stSegmentItem(false)} no-underline`}>寫作</Link>
        )}
      </div>
      {children}
    </header>
  );
}
