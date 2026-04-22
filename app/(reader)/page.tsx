import { redirect } from "next/navigation";

export const revalidate = 3600;

export default function HomePage() {
  const today = new Date().toISOString().split("T")[0];
  redirect(`/${today}`);
}
