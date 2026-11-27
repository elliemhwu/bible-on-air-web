"use client";

import { useAuth } from "@/lib/auth-context";
import { canEdit } from "@/lib/roles";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";

type EditTarget = { href: string; label: string };

const EditTargetContext = createContext<(t: EditTarget | null) => void>(() => {});

/**
 * Staff see reader pages exactly as readers do, plus one floating pencil button
 * (bottom right) whose menu holds the page's edit link and the way into the studio
 * (登出 stays in the header, where 登入 is for readers).
 */
export function StaffFabProvider({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<EditTarget | null>(null);
  return (
    <EditTargetContext.Provider value={setTarget}>
      {children}
      <StaffFab target={target} />
    </EditTargetContext.Provider>
  );
}

/** Rendered by a reader page to offer its own "edit" item in the staff menu */
export function StaffEditTarget({ href, label }: EditTarget) {
  const setTarget = useContext(EditTargetContext);
  useEffect(() => {
    setTarget({ href, label });
    return () => setTarget(null);
  }, [href, label, setTarget]);
  return null;
}

const itemCls =
  "block w-full rounded-lg px-3 py-2 text-left text-sm text-pebble-700 no-underline hover:bg-pebble-100 font-sans";

function StaffFab({ target }: { target: EditTarget | null }) {
  const { user, isLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const [shownFor, setShownFor] = useState(pathname);
  if (shownFor !== pathname) {
    setShownFor(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Staff roles only; future reader accounts will have none
  if (isLoading || !user || user.roles.length === 0) return null;

  return (
    <div ref={ref} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 print:hidden sm:bottom-8 sm:right-8">
      {open && (
        <div role="menu" className="flex w-44 flex-col rounded-xl border border-pebble-200 bg-white p-1.5 shadow-lg">
          {target && canEdit(user) && (
            <Link role="menuitem" href={target.href} className={itemCls}>
              {target.label}
            </Link>
          )}
          <Link role="menuitem" href="/studio" className={itemCls}>
            進入後台
          </Link>
        </div>
      )}
      <button
        type="button"
        aria-label="編輯選單"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-[0_2px_6px_rgba(0,0,0,0.2),0_6px_16px_rgba(0,0,0,0.18)] transition hover:shadow-[0_4px_10px_rgba(0,0,0,0.22),0_10px_24px_rgba(0,0,0,0.2)] active:scale-95"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path
            d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-4-4L4 16v4Z M13.5 6.5l4 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
