import { getArticle, getArticles } from "@/lib/api";

export async function generateStaticParams() {
  const articles = await getArticles();
  return articles.map((a) => ({ date: a.date }));
}

export const revalidate = 3600;

export default async function DatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const article = await getArticle(date);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <p className="text-sm text-gray-500">{article.date}</p>
    </main>
  );
}
