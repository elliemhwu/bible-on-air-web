"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuthButton } from "./AuthButton";

const itemCls = "block rounded-lg px-3 py-2 text-sm text-pebble-700 hover:bg-pebble-100 font-sans";

/** Phone-only menu for the reader header: the links that don't fit beside the brand */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close after navigating (the header stays mounted across pages)
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
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative sm:hidden">
      <button
        type="button"
        aria-label="選單"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="-mr-2 flex h-9 w-9 items-center justify-center rounded-lg text-pebble-600 hover:bg-pebble-100"
      >
        <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
          <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 flex w-40 flex-col rounded-xl border border-pebble-200 bg-white p-1.5 shadow-lg [&_a]:block [&_a]:rounded-lg [&_a]:px-3 [&_a]:py-2 [&_a:hover]:bg-pebble-100 [&_button]:w-full [&_button]:rounded-lg [&_button]:px-3 [&_button]:py-2 [&_button]:text-left [&_button:hover]:bg-pebble-100">
          <Link href="/history" className={itemCls}>歷史</Link>
          <Link href="/about" className={itemCls}>關於</Link>
          <div className="my-1 border-t border-pebble-100" />
          <AuthButton />
        </div>
      )}
    </div>
  );
}
