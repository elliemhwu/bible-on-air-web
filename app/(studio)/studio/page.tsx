import StudioHome from "@/components/studio/StudioHome";
import { mondayOf } from "@/lib/week";

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { week } = await searchParams;
  return <StudioHome week={week ? mondayOf(week) : undefined} />;
}
