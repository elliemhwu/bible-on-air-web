"use client";

import { useAuth } from "@/lib/auth-context";
import { canEdit, canPublish, isImageEditor, isManager, isReviewer, isWriter, leadTeams } from "@/lib/roles";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef } from "react";

type NavItem = { href: string; label: string };

function navFor(user: ReturnType<typeof useAuth>["user"]): { main: NavItem[]; more: NavItem[] } {
  const more: NavItem[] = [{ href: "/studio/articles", label: "文章管理" }];
  if (isManager(user)) {
    more.push(
      { href: "/studio/my", label: "我的稿件" },
      { href: "/studio/images", label: "圖片" },
    );
  }
  if (canEdit(user)) more.push({ href: "/studio/sync", label: "從舊網站同步" });
  more.push({ href: "/studio/print", label: "列印 / PDF" });
  if (canPublish(user)) more.push({ href: "/studio/about", label: "關於頁" });

  if (isManager(user)) {
    return {
      main: [
        { href: "/studio/plan", label: "進度安排" },
        { href: "/studio/assign", label: "分派" },
        { href: "/studio/review", label: "校閱" },
        { href: "/studio/users", label: "同工" },
      ],
      more,
    };
  }
  // A volunteer with one role only needs their own home; several roles get a link each
  const own: NavItem[] = [];
  if (isWriter(user)) own.push({ href: "/studio/my", label: "我的稿件" });
  if (isReviewer(user)) own.push({ href: "/studio/review", label: "校閱" });
  if (isImageEditor(user)) own.push({ href: "/studio/images", label: "圖片" });
  // A team lead also schedules and manages their team
  if (leadTeams(user).length) {
    own.push({ href: "/studio/assign", label: "分派" }, { href: "/studio/users", label: "同工" });
  }
  return { main: own.length > 1 ? own : [], more };
}

/** Top bar of the studio screens: brand, role-based navigation and the account menu */
export default function StudioHeader() {
  const { user, clearAuth } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const { main, more } = navFor(user);
  const closeMenu = () => menuRef.current?.removeAttribute("open");

  return (
    <header className="flex flex-wrap items-center justify-between print:hidden gap-x-7 gap-y-1 border-b border-st-line bg-st-surface px-4 py-2.5 md:flex-nowrap md:justify-start sm:px-8 md:py-3">
      <Link href="/" className="whitespace-nowrap font-serif text-lg font-semibold text-st-ink no-underline">
        Bible On Air
      </Link>
      {/* Phones: the nav takes its own row under the brand and avatar */}
      <nav className="order-last -mx-2 flex w-full flex-wrap gap-0.5 md:order-none md:mx-0 md:w-auto md:flex-1 md:gap-1" aria-label="後台">
        {[{ href: "/studio", label: "Studio" }, ...main].map((item) => {
          const active = item.href === "/studio" ? pathname === "/studio" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`whitespace-nowrap rounded-lg px-2 py-2 text-sm no-underline transition sm:px-3 ${active ? "bg-st-soft font-medium text-st-ink" : "text-st-ink-2 hover:bg-st-sunken hover:text-st-ink"}`}
            >
              {item.label}
            </Link>
          );
        })}
        <details ref={menuRef} className="relative">
          <summary className="cursor-pointer list-none whitespace-nowrap rounded-lg px-2 py-2 text-sm text-st-ink-2 hover:bg-st-sunken hover:text-st-ink sm:px-3 [&::-webkit-details-marker]:hidden">
            更多 ▾
          </summary>
          <div className="absolute right-0 z-50 md:left-0 md:right-auto mt-1 flex min-w-40 flex-col rounded-xl border border-st-line bg-st-surface py-1.5 shadow-lg">
            {more.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className="px-4 py-2 text-sm text-st-ink no-underline hover:bg-st-sunken"
              >
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => {
                closeMenu();
                clearAuth();
                router.replace("/login");
              }}
              className="px-4 py-2 text-left text-sm text-st-muted hover:bg-st-sunken"
            >
              登出
            </button>
          </div>
        </details>
      </nav>
      <div className="flex items-center gap-2.5 text-sm text-st-ink-2" title={user?.email}>
        <span className="hidden whitespace-nowrap md:inline">{user?.name}</span>
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-st-primary text-[13px] text-st-on-primary"
        >
          {user?.name.slice(0, 1)}
        </span>
      </div>
    </header>
  );
}

/** Page frame for studio screens: palette, header, and a column for the page body */
export function StudioPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="studio flex min-h-screen flex-col bg-st-bg text-st-ink print:bg-white">
      <StudioHeader />
      {children}
    </div>
  );
}
