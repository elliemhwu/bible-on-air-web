import { stSegment, stSegmentItem } from "@/lib/styles";
import Link from "next/link";

const arrow =
  "flex h-8 w-8 items-center justify-center rounded-lg text-lg text-st-ink-2 no-underline hover:bg-st-sunken hover:text-st-ink";

const VIEWS = [
  { key: "sermons", label: "講道主題", href: "/studio/plan/sermons" },
  { key: "days", label: "每日經文", href: "/studio/plan" },
] as const;

/** 進度安排 toolbar: the year, and the two views of it (sermon themes, then daily passages) */
export default function PlanToolbar({
  view,
  year,
  children,
}: {
  view: (typeof VIEWS)[number]["key"];
  year: number;
  children?: React.ReactNode;
}) {
  const href = VIEWS.find((v) => v.key === view)!.href;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-b border-st-line bg-st-surface px-4 py-3.5 sm:px-8">
      <h1 className="m-0 text-base font-medium">進度安排</h1>
      <nav aria-label="檢視方式" className={stSegment}>
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={`${v.href}?year=${year}`}
            aria-current={v.key === view ? "page" : undefined}
            className={`${stSegmentItem(v.key === view)} no-underline`}
          >
            {v.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center">
        <Link href={`${href}?year=${year - 1}`} aria-label="上一年" className={arrow}>‹</Link>
        <span className="px-1 font-serif text-lg font-semibold tabular-nums">{year} 年</span>
        <Link href={`${href}?year=${year + 1}`} aria-label="下一年" className={arrow}>›</Link>
      </div>
      <span className="flex-1" />
      {children}
    </div>
  );
}
