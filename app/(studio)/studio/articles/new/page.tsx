import CreateArticleForm from "@/components/studio/CreateArticleForm";

export default async function NewArticlePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  return (
    <CreateArticleForm
      initialDate={date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined}
    />
  );
}
