import EditArticleForm from "@/components/studio/EditArticleForm";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditArticleForm articleId={id} />;
}
