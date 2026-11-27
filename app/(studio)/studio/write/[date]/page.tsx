import ReadingMode from "@/components/studio/writer/ReadingMode";

export const metadata = { title: "讀經｜Bible On Air" };

export default async function ReadingPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  return <ReadingMode date={date} />;
}
