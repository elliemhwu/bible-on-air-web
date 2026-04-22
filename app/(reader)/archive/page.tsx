import { getArticles } from "@/lib/api";
import Link from "next/link";

export const revalidate = 3600;

export default async function ArchivePage() {
  const articles = await getArticles();
  const published = articles.filter((a) => a.status === "published");

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">歷史靈修</h1>
      <ul className="space-y-2">
        {published.map((a) => (
          <li key={a.id}>
            <Link href={`/${a.date}`} className="text-blue-600 hover:underline">
              {a.date}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
