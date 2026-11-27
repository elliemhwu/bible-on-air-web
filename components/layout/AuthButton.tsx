"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function AuthButton() {
  const { user, isLoading, clearAuth } = useAuth();

  if (isLoading) return null;

  // Signed-in staff see the page as readers do (登出 in place of 登入);
  // the way into the studio is the floating pencil menu
  if (user) {
    return (
      <button
        type="button"
        onClick={clearAuth}
        className="text-sm text-pebble-500 hover:text-pebble-800 transition-colors font-sans"
        title={user.email}
      >
        登出
      </button>
    );
  }

  return (
    <Link
      href="/login"
      className="text-sm text-pebble-500 hover:text-pebble-800 transition-colors font-sans"
    >
      登入
    </Link>
  );
}
