import { redirect } from "next/navigation";

export const revalidate = 86400;

export default function HomePage() {
  const today = "2026-04-20";
  redirect(`/${today}`);
}
