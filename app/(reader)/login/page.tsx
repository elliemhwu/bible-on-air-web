"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const { accessToken, user } = await login(email, password);
      setAuth(accessToken, user);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登入失敗");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-pebble-800 font-sans mb-8 text-center">
          登入
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm text-pebble-600 font-sans">
              電子郵件
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-pebble-200 bg-white px-3.5 py-2.5 text-sm text-pebble-900 font-sans outline-none focus:border-iris-400 focus:ring-2 focus:ring-iris-400/20 transition"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm text-pebble-600 font-sans">
              密碼
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-pebble-200 bg-white px-3.5 py-2.5 text-sm text-pebble-900 font-sans outline-none focus:border-iris-400 focus:ring-2 focus:ring-iris-400/20 transition"
            />
          </div>
          {error && (
            <p className="text-sm text-red-500 font-sans">{error}</p>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 rounded-lg bg-iris-500 px-4 py-2.5 text-sm font-semibold text-white font-sans hover:bg-iris-600 disabled:opacity-50 transition-colors"
          >
            {isLoading ? "登入中…" : "登入"}
          </button>
        </form>
      </div>
    </main>
  );
}
