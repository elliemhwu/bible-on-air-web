import PrintArticles from "@/components/studio/PrintArticles";

export const metadata = { title: "列印 / PDF｜Bible On Air" };

export default async function PrintPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  return <PrintArticles from={from} to={to} />;
}
