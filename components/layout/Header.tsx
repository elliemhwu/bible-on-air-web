import { getArticles } from "@/lib/api";
import Link from "next/link";
import { DatePickerButton } from "./DatePickerButton";

export async function Header() {
  const articles = await getArticles();

  return (
    <header className="relative sticky top-0 z-40 border-b border-pebble-200">
      <div aria-hidden className="absolute inset-0 bg-pebble-50/90 backdrop-blur-sm" />
      <div className="relative mx-auto max-w-2xl px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="text-sm font-semibold text-pebble-800 hover:text-pebble-900 font-sans tracking-wide transition-colors"
        >
          Bible On Air
        </Link>
        <nav className="flex items-center gap-5">
          <DatePickerButton articles={articles} />
          <Link
            href="/about"
            className="text-sm text-pebble-500 hover:text-pebble-800 transition-colors font-sans"
          >
            關於
          </Link>
        </nav>
      </div>
    </header>
  );
}
