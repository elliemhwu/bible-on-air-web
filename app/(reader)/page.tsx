import { getArticleDates } from "@/lib/api";
import { redirect } from "next/navigation";

// "Today" changes every day, so never cache this redirect
export const dynamic = "force-dynamic";

/** Today's date in Taiwan, independent of the server's time zone. */
function todayInTaipei(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(
    new Date(),
  );
}

export default async function HomePage() {
  const today = todayInTaipei();
  const dates = await getArticleDates().catch(() => [] as string[]);
  // Today's devotional, or the latest one published before today
  const target = dates.find((d) => d <= today) ?? dates[0];
  redirect(target ? `/${target}` : "/about");
}
