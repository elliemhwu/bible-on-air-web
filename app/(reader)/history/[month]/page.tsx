import { formatDateTC } from "@/components/reader/ArticleView";
import { getArticles } from "@/lib/api";
import { today } from "@/lib/week";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 300;

export async function generateStaticParams() {
  return [];
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function monthLabel(month: string) {
  return `${month.slice(0, 4)}年${parseInt(month.slice(5))}月`;
}

function shiftMonth(month: string, delta: number): string {
  const d = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5) - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ month: string }>;
}): Promise<Metadata> {
  const { month } = await params;
  return { title: `${monthLabel(month)}靈修｜Bible On Air` };
}

export default async function MonthPage({
  params,
}: {
  params: Promise<{ month: string }>;
}) {
  const { month } = await params;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) notFound();

  const lastDay = new Date(+month.slice(0, 4), +month.slice(5), 0).getDate();
  const { data: articles } = await getArticles({
    dateFrom: `${month}-01`,
    dateTo: `${month}-${lastDay}`,
    pageSize: 31,
  }).catch(() => ({ data: [] }));

  const byDate = new Map(articles.map((a) => [a.date, a]));
  // Sunday-first grid: blanks before the 1st, then every day, padded to full weeks.
  // Sundays have no devotion (a link to the Lord's Day sermon may go there later).
  const lead = new Date(`${month}-01T00:00:00`).getDay();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= lastDay; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);
  const todayStr = today();

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <nav className="mb-6 flex items-center justify-between font-sans text-sm">
        <Link href={`/history/${shiftMonth(month, -1)}`} className="text-pebble-500 hover:text-pebble-800">
          ← 上個月
        </Link>
        <Link href="/history" className="text-pebble-500 hover:text-pebble-800">
          所有月份
        </Link>
        <Link href={`/history/${shiftMonth(month, 1)}`} className="text-pebble-500 hover:text-pebble-800">
          下個月 →
        </Link>
      </nav>

      <h1 className="text-2xl font-bold text-pebble-800 mb-6">{monthLabel(month)}</h1>

      {articles.length === 0 ? (
        <p className="text-sm text-pebble-500 font-sans">這個月沒有靈修內容。</p>
      ) : (
        <div className="font-sans">
          <div className="grid grid-cols-7 gap-1.5 sm:gap-3 pb-2">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-xs text-pebble-400">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
            {cells.map((date, i) => {
              if (!date) return <div key={i} />;
              const a = byDate.get(date);
              const day = parseInt(date.slice(8));
              const isToday = date === todayStr;
              const dayBadge = (
                <span
                  className={`absolute left-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] leading-none sm:left-1.5 sm:top-1.5 ${
                    isToday ? "bg-primary text-white" : a?.coverImageUrl ? "bg-white/85 text-pebble-700" : "text-pebble-500"
                  }`}
                >
                  {day}
                </span>
              );
              if (!a) {
                return (
                  <div key={date} className="relative aspect-square rounded-lg bg-pebble-100/60">
                    {dayBadge}
                  </div>
                );
              }
              return (
                <Link key={date} href={`/${date}`} title={a.title ?? formatDateTC(date)} className="group flex min-w-0 flex-col gap-1 no-underline">
                  <div className="relative aspect-square overflow-hidden rounded-lg border border-pebble-200 bg-white transition group-hover:border-iris-300 group-hover:shadow-sm">
                    {a.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.coverImageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center p-1 text-center text-[11px] leading-tight text-primary">
                        {a.verseRange ?? ""}
                      </div>
                    )}
                    {dayBadge}
                  </div>
                  <span className="hidden text-xs leading-snug text-pebble-700 line-clamp-2 group-hover:text-pebble-900 sm:block">
                    {a.title ?? formatDateTC(date)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
