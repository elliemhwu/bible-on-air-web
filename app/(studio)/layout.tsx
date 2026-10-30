"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { getMe } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token, isLoading, setAuth, clearAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !token) {
      router.replace("/login");
    }
  }, [isLoading, token, router]);

  // Roles and teams can change while signed in; a disabled account is signed out
  useEffect(() => {
    if (!token) return;
    getMe(token)
      .then((me) => setAuth(token, me))
      .catch((e) => {
        if (isAxiosError(e) && e.response?.status === 401) clearAuth();
      });
  }, [token, setAuth, clearAuth]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-pebble-400 font-sans">載入中…</p>
      </div>
    );
  }

  if (!token) return null;

  return <>{children}</>;
}
