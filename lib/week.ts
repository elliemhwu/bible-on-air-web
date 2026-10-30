/**
 * Date helpers for the studio's week-based screens. All dates are
 * "YYYY-MM-DD" strings; arithmetic runs in UTC so the local time zone never
 * shifts a day. A devotion week runs Monday to Saturday.
 */

export const WEEKDAYS = ["一", "二", "三", "四", "五", "六"] as const;
const ZH_DAY = ["日", "一", "二", "三", "四", "五", "六"];

function utc(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

/** Today in Taipei, where the church is */
export function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
}

/** The Taipei calendar day of a timestamp, e.g. a comment's createdAt */
export function localDay(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date(iso));
}

export function addDays(date: string, days: number): string {
  const d = utc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing `date` (a Sunday belongs to the week before it) */
export function mondayOf(date: string): string {
  return addDays(date, -((utc(date).getUTCDay() + 6) % 7));
}

/** The six devotion days (Mon–Sat) of the week starting on `monday` */
export function weekDays(monday: string): string[] {
  return WEEKDAYS.map((_, i) => addDays(monday, i));
}

/** "10/26" */
export function md(date: string): string {
  const d = utc(date);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

/** "五" */
export function weekday(date: string): string {
  return ZH_DAY[utc(date).getUTCDay()];
}

/** "10/26 – 10/31" (Mon–Sat) */
export function weekLabel(monday: string, days = 6): string {
  return `${md(monday)} – ${md(addDays(monday, days - 1))}`;
}

/** "10 月 30 日（五）" */
export function longDate(date: string): string {
  const d = utc(date);
  return `${d.getUTCMonth() + 1} 月 ${d.getUTCDate()} 日（${weekday(date)}）`;
}

/** "2026 年 10 月 30 日" */
export function fullDate(date: string): string {
  const d = utc(date);
  return `${d.getUTCFullYear()} 年 ${d.getUTCMonth() + 1} 月 ${d.getUTCDate()} 日`;
}

/** Mondays of every week whose Monday falls in `year` */
export function mondaysOfYear(year: number): string[] {
  let monday = mondayOf(`${year}-01-01`);
  if (monday < `${year}-01-01`) monday = addDays(monday, 7);
  const out: string[] = [];
  for (; monday.startsWith(String(year)); monday = addDays(monday, 7)) out.push(monday);
  return out;
}

/** Group sorted dates into runs of consecutive devotion days ("12/7 – 12/9 · 3 天") */
export function dateRuns(dates: string[]): { from: string; to: string; count: number }[] {
  const runs: { from: string; to: string; count: number }[] = [];
  for (const date of [...dates].sort()) {
    const last = runs[runs.length - 1];
    // Sunday has no devotion, so Saturday → Monday still counts as consecutive
    const next = last && (addDays(last.to, 1) === date || (weekday(last.to) === "六" && addDays(last.to, 2) === date));
    if (next) {
      last.to = date;
      last.count += 1;
    } else {
      runs.push({ from: date, to: date, count: 1 });
    }
  }
  return runs;
}
