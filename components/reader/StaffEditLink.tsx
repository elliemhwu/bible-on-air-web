"use client";

import { useAuth } from "@/lib/auth-context";
import { canEdit } from "@/lib/roles";
import Link from "next/link";

/** Shortcut from a reading page into the studio, shown to editors only. */
export function StaffEditLink({ href, label }: { href: string; label: string }) {
  const { user } = useAuth();
  if (!canEdit(user)) return null;
  return (
    <Link
      href={href}
      className="font-sans text-sm text-iris-600 hover:text-iris-700 print:hidden"
    >
      ✎ {label}
    </Link>
  );
}
