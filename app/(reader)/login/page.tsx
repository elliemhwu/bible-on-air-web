"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { TextLink } from "@/components/ui/TextLink";
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
        <h1 className="text-xl font-semibold text-pebble-800 font-sans mb-8 text-center">登入</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="電子郵件" htmlFor="email">
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="密碼" htmlFor="password">
            <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && <p className="text-sm text-danger font-sans">{error}</p>}
          <Button type="submit" disabled={isLoading} className="mt-2">
            {isLoading ? "登入中…" : "登入"}
          </Button>
          <TextLink href="/forgot-password" tone="muted" className="text-center text-sm font-sans">
            忘記密碼？
          </TextLink>
        </form>
      </div>
    </main>
  );
}
