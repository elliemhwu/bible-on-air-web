"use client";

import { acceptInvite, apiError, getInvite } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const inputCls =
  "w-full rounded-lg border border-pebble-200 bg-white px-3.5 py-2.5 text-sm text-pebble-900 font-sans outline-none focus:border-iris-400 focus:ring-2 focus:ring-iris-400/20 transition";

/** Sets a password from an invitation link, then opens the studio */
export default function AcceptInvite({ inviteToken }: { inviteToken: string }) {
  const router = useRouter();
  const { setAuth } = useAuth();
  const [invite, setInvite] = useState<{ name: string; email: string } | null | undefined>(undefined);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    getInvite(inviteToken).then(setInvite).catch(() => setInvite(null));
  }, [inviteToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("密碼至少要 8 個字元");
    if (password !== confirmation) return setError("兩次輸入的密碼不一樣");
    setError(null);
    setIsLoading(true);
    try {
      const { accessToken, user } = await acceptInvite(inviteToken, password);
      setAuth(accessToken, user);
      router.push("/studio");
    } catch (err) {
      setError(apiError(err, "設定失敗，請再試一次"));
    } finally {
      setIsLoading(false);
    }
  }

  if (invite === undefined) {
    return <main className="flex-1 px-6 py-16 text-center text-sm text-pebble-400 font-sans">載入中…</main>;
  }

  if (invite === null) {
    return (
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm text-center font-sans">
          <h1 className="text-xl font-semibold text-pebble-800 mb-3">邀請連結無效或已過期</h1>
          <p className="text-sm text-pebble-500">請向邀請你的同工要一個新的連結。已經設定過密碼的話，可以直接<Link href="/login" className="text-iris-600">登入</Link>。</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-pebble-800 font-sans mb-2 text-center">{invite.name}，歡迎加入</h1>
        <p className="text-sm text-pebble-500 font-sans mb-8 text-center">設定密碼後，就能用 {invite.email} 登入後台。</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm text-pebble-600 font-sans">密碼（至少 8 個字元）</label>
            <input id="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmation" className="text-sm text-pebble-600 font-sans">再輸入一次</label>
            <input id="confirmation" type="password" autoComplete="new-password" required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className={inputCls} />
          </div>
          {error && <p className="text-sm text-red-500 font-sans">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 rounded-lg bg-iris-500 px-4 py-2.5 text-sm font-semibold text-white font-sans hover:bg-iris-600 disabled:opacity-50 transition-colors"
          >
            {isLoading ? "設定中…" : "設定密碼並登入"}
          </button>
        </form>
      </div>
    </main>
  );
}
