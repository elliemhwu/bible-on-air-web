import { formatDateTC } from "@/components/reader/ArticleView";
import MonthCalendar from "@/components/calendar/MonthCalendar";
import { getArticles } from "@/lib/api";
import { today } from "@/lib/week";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 300;

export async function generateStaticParams() {
  return [];
}

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
        <MonthCalendar
          month={month}
          today={today()}
          items={articles.map((a) => ({
            date: a.date,
            title: a.title ?? formatDateTC(a.date),
            verseRange: a.verseRange,
            coverImageUrl: a.coverImageUrl,
            href: `/${a.date}`,
          }))}
        />
      )}
    </main>
  );
}
