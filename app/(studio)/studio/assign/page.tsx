import AssignBoard from "@/components/studio/manager/AssignBoard";
import { today } from "@/lib/week";

export const metadata = { title: "分派｜Bible On Air" };

export default async function AssignPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const { year } = await searchParams;
  return <AssignBoard year={Number(year) || Number(today().slice(0, 4))} />;
}
