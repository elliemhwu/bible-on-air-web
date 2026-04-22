import type { Article, ArticleSummary } from "@/lib/types";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
const PUB = "bible-on-air";

export async function getArticles(): Promise<ArticleSummary[]> {
  const res = await fetch(`${BASE}/api/v1/magazines/${PUB}/articles`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error("Failed to fetch articles");
  return res.json();
}

export async function getArticle(date: string): Promise<Article> {
  const res = await fetch(`${BASE}/api/v1/magazines/${PUB}/articles/${date}`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`Failed to fetch article: ${date}`);
  return res.json();
}
