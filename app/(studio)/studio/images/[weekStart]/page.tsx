import WeekImages from "@/components/studio/images/WeekImages";
import { mondayOf } from "@/lib/week";

export const metadata = { title: "本週圖片｜Bible On Air" };

export default async function WeekImagesPage({ params }: { params: Promise<{ weekStart: string }> }) {
  const { weekStart } = await params;
  return <WeekImages monday={mondayOf(weekStart)} />;
}
