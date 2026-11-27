import { StudioPage } from "@/components/studio/shell/StudioHeader";
import ReviewArticle from "@/components/studio/ReviewArticle";

export default async function ReviewArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <StudioPage>
      <ReviewArticle articleId={id} />
    </StudioPage>
  );
}
