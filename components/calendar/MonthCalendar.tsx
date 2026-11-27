import Link from "next/link";
import type { ReactNode } from "react";

export type CalendarItem = {
  date: string;
  title: string | null;
  verseRange: string | null;
  coverImageUrl: string | null;
  href: string;
  /** Shown over the cover (grid) or at the row's end (list), e.g. a status badge */
  badge?: ReactNode;
};

type Variant = "reader" | "studio";

const THEME: Record<
  Variant,
  { card: string; addRow: string; empty: string; ink: string; muted: string; accent: string; today: string; plain: string }
> = {
  reader: {
    card: "border-pebble-200 bg-white group-hover:border-iris-300",
    addRow: "border-pebble-300 hover:border-iris-300",
    empty: "bg-pebble-100/60",
    ink: "text-pebble-800",
    muted: "text-pebble-400",
    accent: "text-primary",
    today: "bg-primary text-white",
    plain: "text-pebble-500",
  },
  studio: {
    card: "border-st-line bg-st-surface group-hover:border-st-accent",
    addRow: "border-st-line-strong hover:border-st-accent",
    empty: "bg-st-sunken",
    ink: "text-st-ink",
    muted: "text-st-muted",
    accent: "text-st-accent",
    today: "bg-st-primary text-st-on-primary",
    plain: "text-st-muted",
  },
};

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function weekdayOf(date: string) {
  return new Date(`${date}T00:00:00`).getDay();
}

function Cover({ item, className, theme }: { item: CalendarItem; className: string; theme: (typeof THEME)[Variant] }) {
  return item.coverImageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={item.coverImageUrl} alt="" loading="lazy" className={`${className} object-cover`} />
  ) : (
    <div className={`${className} flex items-center justify-center p-1 text-center text-[11px] leading-tight ${theme.accent}`}>
      {item.verseRange ?? ""}
    </div>
  );
}

/**
 * A month of daily devotions: a Sunday-first grid of covers on wider screens,
 * a list of cards on phones. Sundays have no devotion and stay empty.
 */
export default function MonthCalendar({
  month,
  items,
  today,
  variant = "reader",
  emptyHref,
}: {
  /** "YYYY-MM" */
  month: string;
  items: CalendarItem[];
  /** "YYYY-MM-DD", highlighted */
  today: string;
  variant?: Variant;
  /** Where an empty weekday links to (e.g. creating that day's article); none = not clickable */
  emptyHref?: (date: string) => string;
}) {
  const theme = THEME[variant];
  const byDate = new Map(items.map((i) => [i.date, i]));
  const lastDay = new Date(+month.slice(0, 4), +month.slice(5), 0).getDate();
  const days = Array.from({ length: lastDay }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
  const cells: (string | null)[] = [...Array(weekdayOf(`${month}-01`)).fill(null), ...days];
  while (cells.length % 7) cells.push(null);

  const dayBadge = (date: string, onImage: boolean) => (
    <span
      className={`absolute left-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] leading-none ${
        date === today ? theme.today : onImage ? "bg-white/85 text-pebble-700" : theme.plain
      }`}
    >
      {parseInt(date.slice(8))}
    </span>
  );

  // Phones: every devotion as a card; studio also lists empty weekdays to fill
  const listDays = days.filter((d) => byDate.has(d) || (emptyHref && weekdayOf(d) !== 0));

  return (
    <div className="font-sans">
      {/* ── phones: card list ─────────────────────────────────────────── */}
      <ul className="m-0 flex list-none flex-col gap-2 p-0 sm:hidden">
        {listDays.length === 0 && <li className={`py-6 text-center text-sm ${theme.muted}`}>這個月沒有靈修內容。</li>}
        {listDays.map((date) => {
          const item = byDate.get(date);
          const dateCol = (
            <div className="w-10 shrink-0 text-center">
              <div
                className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-base tabular-nums ${
                  date === today ? theme.today : theme.ink
                }`}
              >
                {parseInt(date.slice(8))}
              </div>
              <div className={`text-[11px] ${theme.muted}`}>週{WEEKDAYS[weekdayOf(date)]}</div>
            </div>
          );
          if (!item) {
            return (
              <li key={date}>
                <Link
                  href={emptyHref!(date)}
                  className={`flex items-center gap-3 rounded-xl border border-dashed px-3 py-2 no-underline ${theme.addRow}`}
                >
                  {dateCol}
                  <span className={`text-sm ${theme.muted}`}>＋ 新增</span>
                </Link>
              </li>
            );
          }
          return (
            <li key={date}>
              <Link href={item.href} className={`group flex items-center gap-3 rounded-xl border p-2 pr-3 no-underline ${theme.card}`}>
                {dateCol}
                <Cover item={item} theme={theme} className="h-14 w-14 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <div className={`truncate font-serif text-[15px] leading-snug ${theme.ink}`}>{item.title ?? "無標題"}</div>
                  {item.verseRange && <div className={`text-xs ${theme.accent}`}>{item.verseRange}</div>}
                </div>
                {item.badge}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* ── wider screens: Sunday-first grid ──────────────────────────── */}
      <div className="hidden sm:block">
        <div className="grid grid-cols-7 gap-3 pb-2">
          {WEEKDAYS.map((w) => (
            <div key={w} className={`text-center text-xs ${theme.muted}`}>
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-3">
          {cells.map((date, i) => {
            if (!date) return <div key={i} />;
            const item = byDate.get(date);
            if (!item) {
              const canAdd = emptyHref && weekdayOf(date) !== 0;
              const box = (
                <div className={`group relative aspect-square rounded-lg ${theme.empty}`}>
                  {dayBadge(date, false)}
                  {canAdd && (
                    <span className={`absolute inset-0 flex items-center justify-center text-2xl opacity-0 transition group-hover:opacity-100 ${theme.muted}`}>
                      +
                    </span>
                  )}
                </div>
              );
              return canAdd ? (
                <Link key={date} href={emptyHref(date)} aria-label={`新增 ${date}`} className="no-underline">
                  {box}
                </Link>
              ) : (
                <div key={date}>{box}</div>
              );
            }
            return (
              <Link key={date} href={item.href} title={item.title ?? undefined} className="group flex min-w-0 flex-col gap-1 no-underline">
                <div className={`relative aspect-square overflow-hidden rounded-lg border transition group-hover:shadow-sm ${theme.card}`}>
                  <Cover item={item} theme={theme} className="h-full w-full" />
                  {dayBadge(date, !!item.coverImageUrl)}
                  {item.badge && <span className="absolute right-1.5 top-1.5">{item.badge}</span>}
                </div>
                <span className={`line-clamp-2 text-xs leading-snug ${theme.ink}`}>{item.title ?? "無標題"}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
