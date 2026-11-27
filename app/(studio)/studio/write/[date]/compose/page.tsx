import ComposeMode from "@/components/studio/writer/ComposeMode";

export const metadata = { title: "寫作｜Bible On Air" };

export default async function ComposePage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  return <ComposeMode date={date} />;
}
