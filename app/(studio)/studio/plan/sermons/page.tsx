import SermonPlan from "@/components/studio/manager/SermonPlan";
import { today } from "@/lib/week";

export const metadata = { title: "講道主題｜Bible On Air" };

export default async function SermonPlanPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const { year } = await searchParams;
  return <SermonPlan year={Number(year) || Number(today().slice(0, 4))} />;
}
