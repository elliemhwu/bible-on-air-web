"use client";

import { acceptInvite, apiError, getInvite, getReset, resetPassword } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { LoginResponse } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export const authInputCls =
  "w-full rounded-lg border border-pebble-200 bg-white px-3.5 py-2.5 text-sm text-pebble-900 font-sans outline-none focus:border-iris-400 focus:ring-2 focus:ring-iris-400/20 transition";

export const authButtonCls =
  "mt-2 rounded-lg bg-iris-500 px-4 py-2.5 text-sm font-semibold text-white font-sans hover:bg-iris-600 disabled:opacity-50 transition-colors";

type Kind = "invite" | "reset";

const COPY: Record<Kind, { invalid: string; invalidHint: string; submit: string }> = {
  invite: {
    invalid: "邀請連結無效或已過期",
    invalidHint: "請向邀請你的同工要一封新的邀請信。",
    submit: "設定密碼並登入",
  },
  reset: {
    invalid: "重設連結無效或已過期",
    invalidHint: "重設連結只能用一次，並在一小時後失效。",
    submit: "更新密碼並登入",
  },
};

/** Sets a password from an invitation or a reset link, then opens the studio */
export default function SetPasswordForm({ kind, token }: { kind: Kind; token: string }) {
  const router = useRouter();
  const { setAuth } = useAuth();
  const [info, setInfo] = useState<{ name?: string; email: string } | null | undefined>(undefined);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const copy = COPY[kind];

  useEffect(() => {
    (kind === "invite" ? getInvite(token) : getReset(token)).then(setInfo).catch(() => setInfo(null));
  }, [kind, token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("密碼至少要 8 個字元");
    if (password !== confirmation) return setError("兩次輸入的密碼不一樣");
    setError(null);
    setIsLoading(true);
    try {
      const session: LoginResponse =
        kind === "invite" ? await acceptInvite(token, password) : await resetPassword(token, password);
      setAuth(session.accessToken, session.user);
      router.push("/studio");
    } catch (err) {
      setError(apiError(err, "設定失敗，請再試一次"));
    } finally {
      setIsLoading(false);
    }
  }

  if (info === undefined) {
    return <main className="flex-1 px-6 py-16 text-center text-sm text-pebble-400 font-sans">載入中…</main>;
  }

  if (info === null) {
    return (
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm text-center font-sans">
          <h1 className="text-xl font-semibold text-pebble-800 mb-3">{copy.invalid}</h1>
          <p className="text-sm text-pebble-500">
            {copy.invalidHint}已經設定過密碼的話，可以直接<Link href="/login" className="text-iris-600">登入</Link>。
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-pebble-800 font-sans mb-2 text-center">
          {kind === "invite" ? `${info.name}，歡迎加入` : "設定新密碼"}
        </h1>
        <p className="text-sm text-pebble-500 font-sans mb-8 text-center">
          {kind === "invite" ? `設定密碼後，就能用 ${info.email} 登入後台。` : `帳號：${info.email}`}
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm text-pebble-600 font-sans">
              {kind === "invite" ? "密碼" : "新密碼"}（至少 8 個字元）
            </label>
            <input id="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={authInputCls} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmation" className="text-sm text-pebble-600 font-sans">再輸入一次</label>
            <input id="confirmation" type="password" autoComplete="new-password" required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className={authInputCls} />
          </div>
          {error && <p className="text-sm text-red-500 font-sans">{error}</p>}
          <button type="submit" disabled={isLoading} className={authButtonCls}>
            {isLoading ? "設定中…" : copy.submit}
          </button>
        </form>
      </div>
    </main>
  );
}
