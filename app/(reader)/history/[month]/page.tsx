import { formatDateTC } from "@/components/reader/ArticleView";
import { getArticles } from "@/lib/api";
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

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
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

      <h1 className="text-2xl font-bold text-pebble-800 mb-8">{monthLabel(month)}</h1>

      {articles.length === 0 ? (
        <p className="text-sm text-pebble-500 font-sans">這個月沒有靈修內容。</p>
      ) : (
        <ul className="divide-y divide-pebble-200 border-y border-pebble-200">
          {articles.map((a) => (
            <li key={a.id}>
              <Link href={`/${a.date}`} className="flex gap-4 py-4 hover:bg-pebble-100/60 transition-colors">
                <div className="w-14 shrink-0 text-center font-sans">
                  <div className="text-xl text-pebble-800">{parseInt(a.date.slice(8))}</div>
                  <div className="text-xs text-pebble-400">
                    週{WEEKDAYS[new Date(`${a.date}T00:00:00`).getDay()]}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-base text-pebble-800 leading-snug">
                    {a.title ?? formatDateTC(a.date)}
                  </div>
                  {a.verseRange && (
                    <div className="text-sm text-primary font-sans">{a.verseRange}</div>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
