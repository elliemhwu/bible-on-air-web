import WeekPlanner from "@/components/studio/manager/WeekPlanner";
import { mondayOf } from "@/lib/week";

export const metadata = { title: "單週安排｜Bible On Air" };

export default async function WeekPlanPage({ params }: { params: Promise<{ weekStart: string }> }) {
  const { weekStart } = await params;
  return <WeekPlanner monday={mondayOf(weekStart)} />;
}
