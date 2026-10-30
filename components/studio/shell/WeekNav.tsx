import { addDays } from "@/lib/week";
import Link from "next/link";

const arrow =
  "flex h-9 w-9 items-center justify-center rounded-lg text-lg text-st-ink-2 no-underline hover:bg-st-surface hover:text-st-ink";

/** ‹ title › that steps a week at a time */
export default function WeekNav({
  monday,
  href,
  title,
}: {
  monday: string;
  href: (monday: string) => string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <Link href={href(addDays(monday, -7))} aria-label="上一週" className={arrow}>
        ‹
      </Link>
      <h1 className="m-0 px-1 font-serif text-2xl font-semibold">{title}</h1>
      <Link href={href(addDays(monday, 7))} aria-label="下一週" className={arrow}>
        ›
      </Link>
    </div>
  );
}
