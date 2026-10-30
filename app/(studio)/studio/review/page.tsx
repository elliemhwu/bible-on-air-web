import ReviewWeek from "@/components/studio/review/ReviewWeek";
import { mondayOf } from "@/lib/week";

export const metadata = { title: "校閱｜Bible On Air" };

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ week?: string; date?: string }> }) {
  const { week, date } = await searchParams;
  return <ReviewWeek week={week ? mondayOf(week) : undefined} date={date} />;
}
