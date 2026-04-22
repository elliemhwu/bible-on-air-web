import { redirect } from "next/navigation";

export const revalidate = 86400;

export default function HomePage() {
  const today =
    process.env.NODE_ENV === "development"
      ? "2026-04-21"
      : new Date().toISOString().split("T")[0];
  redirect(`/${today}`);
}
