import YearPlan from "@/components/studio/manager/YearPlan";
import { today } from "@/lib/week";

export const metadata = { title: "進度安排｜Bible On Air" };

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const { year } = await searchParams;
  return <YearPlan year={Number(year) || Number(today().slice(0, 4))} />;
}
