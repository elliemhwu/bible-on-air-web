"use client";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { TextLink } from "@/components/ui/TextLink";
import { forgotPassword } from "@/lib/api";
import { useState } from "react";

/** Asks for an email address and sends a reset link to it */
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch {
      setError("送出失敗，請稍後再試");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm font-sans">
        <h1 className="text-xl font-semibold text-pebble-800 mb-2 text-center">忘記密碼</h1>
        {sent ? (
          <div className="text-center" role="status">
            <p className="text-sm text-pebble-600 mb-6">
              如果 {email.trim()} 有後台帳號，我們已經寄出重設密碼的信。請在一小時內點信中的連結。
            </p>
            <TextLink href="/login" className="text-sm">回到登入</TextLink>
          </div>
        ) : (
          <>
            <p className="text-sm text-pebble-500 mb-8 text-center">輸入登入用的 Email，我們會寄一個重設密碼的連結給你。</p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Field label="電子郵件" htmlFor="email">
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button type="submit" disabled={isLoading} className="mt-2">
                {isLoading ? "寄送中…" : "寄出重設連結"}
              </Button>
              <TextLink href="/login" tone="muted" className="text-center text-sm">回到登入</TextLink>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
