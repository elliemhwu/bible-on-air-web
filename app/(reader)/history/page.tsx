import { getArticleDates } from "@/lib/api";
import Link from "next/link";

export const revalidate = 300;

export const metadata = { title: "歷史靈修｜Bible On Air" };

export default async function HistoryPage() {
  const dates = await getArticleDates().catch(() => [] as string[]);

  // "YYYY-MM" → article count, newest month first
  const months = new Map<string, number>();
  for (const date of dates) {
    const month = date.slice(0, 7);
    months.set(month, (months.get(month) ?? 0) + 1);
  }
  const byYear = new Map<string, [string, number][]>();
  for (const [month, count] of months) {
    const year = month.slice(0, 4);
    byYear.set(year, [...(byYear.get(year) ?? []), [month, count]]);
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold text-pebble-800 mb-8">歷史靈修</h1>
      {byYear.size === 0 && (
        <p className="text-sm text-pebble-500 font-sans">目前還沒有靈修內容。</p>
      )}
      {[...byYear].map(([year, list]) => (
        <section key={year} className="mb-10">
          <h2 className="font-sans text-sm font-semibold text-primary mb-3">{year} 年</h2>
          <ul className="grid grid-cols-3 sm:grid-cols-4 gap-3 font-sans">
            {list.map(([month, count]) => (
              <li key={month}>
                <Link
                  href={`/history/${month}`}
                  className="flex flex-col items-center rounded-lg border border-pebble-200 bg-white px-3 py-3 hover:border-iris-300 transition-colors"
                >
                  <span className="text-base text-pebble-800">
                    {parseInt(month.slice(5))} 月
                  </span>
                  <span className="text-xs text-pebble-400">{count} 篇</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
