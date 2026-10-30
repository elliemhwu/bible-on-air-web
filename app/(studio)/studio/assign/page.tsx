import AssignBoard from "@/components/studio/manager/AssignBoard";
import { mondayOf } from "@/lib/week";

export const metadata = { title: "分派｜Bible On Air" };

export default async function AssignPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  return <AssignBoard from={from ? mondayOf(from) : undefined} />;
}
