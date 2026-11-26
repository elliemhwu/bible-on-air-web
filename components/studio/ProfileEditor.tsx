"use client";

import Avatar from "@/components/studio/shell/Avatar";
import { StudioPage } from "@/components/studio/shell/StudioHeader";
import { changePassword, updateMe, uploadImage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { stBtnGhost, stBtnPrimary, stBtnSecondary, stCard, stInput } from "@/lib/styles";
import { isAxiosError } from "axios";
import { useRef, useState } from "react";

type Status = { ok: boolean; text: string } | null;

function StatusText({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <span aria-live="polite" className={`text-sm ${status.ok ? "text-st-sage-ink" : "text-st-danger"}`}>
      {status.text}
    </span>
  );
}

/** 個人資料: one's own name, picture and password */
export default function ProfileEditor() {
  const { token, user, setAuth } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [nameStatus, setNameStatus] = useState<Status>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarStatus, setAvatarStatus] = useState<Status>(null);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<Status>(null);

  if (!token || !user) return null;
  const nameValue = name ?? user.name;
  const nameChanged = nameValue.trim() !== "" && nameValue.trim() !== user.name;

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !nameChanged) return;
    setSavingName(true);
    setNameStatus(null);
    try {
      setAuth(token, await updateMe(token, { name: nameValue.trim() }));
      setName(null);
      setNameStatus({ ok: true, text: "已儲存" });
    } catch {
      setNameStatus({ ok: false, text: "儲存失敗，請再試一次" });
    } finally {
      setSavingName(false);
    }
  }

  async function setAvatar(file: File | null) {
    if (!token) return;
    setUploading(true);
    setAvatarStatus(null);
    try {
      const avatarUrl = file ? await uploadImage(token, file) : null;
      setAuth(token, await updateMe(token, { avatarUrl }));
    } catch {
      setAvatarStatus({ ok: false, text: file ? "上傳失敗，請換一張圖片再試" : "移除失敗，請再試一次" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const passwordProblem =
    next && next.length < 8 ? "新密碼至少 8 個字元" : confirm && confirm !== next ? "兩次輸入的新密碼不一樣" : null;

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !current || !next || next !== confirm || passwordProblem) return;
    setSavingPassword(true);
    setPasswordStatus(null);
    try {
      await changePassword(token, current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setPasswordStatus({ ok: true, text: "密碼已更新" });
    } catch (err) {
      const wrong = isAxiosError(err) && err.response?.status === 400;
      setPasswordStatus({ ok: false, text: wrong ? "目前的密碼不對" : "更新失敗，請再試一次" });
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <StudioPage>
      <div className="border-b border-st-line bg-st-surface px-4 py-3.5 sm:px-8">
        <h1 className="m-0 text-base font-medium">個人資料</h1>
      </div>
      <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-6 sm:px-8">
        <section className={`${stCard} flex flex-col gap-5 p-6`}>
          <div className="flex items-center gap-5">
            <Avatar user={user} size="lg" />
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className={stBtnSecondary}>
                  {uploading ? "上傳中…" : user.avatarUrl ? "更換頭像" : "上傳頭像"}
                </button>
                {user.avatarUrl && (
                  <button type="button" onClick={() => setAvatar(null)} disabled={uploading} className={stBtnGhost}>
                    移除
                  </button>
                )}
              </div>
              <StatusText status={avatarStatus} />
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                aria-label="選擇頭像圖片"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setAvatar(file);
                }}
              />
            </div>
          </div>

          <form onSubmit={saveName} className="flex flex-col gap-1.5">
            <label htmlFor="profile-name" className="text-sm text-st-ink-2">名字</label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="profile-name"
                value={nameValue}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameStatus(null);
                }}
                maxLength={100}
                className={`${stInput} h-9 min-w-0 flex-1`}
              />
              <button type="submit" disabled={!nameChanged || savingName} className={stBtnPrimary}>
                {savingName ? "儲存中…" : "儲存"}
              </button>
            </div>
            <StatusText status={nameStatus} />
          </form>

          <div className="flex flex-col gap-1">
            <span className="text-sm text-st-ink-2">Email</span>
            <span className="text-sm">{user.email}</span>
          </div>
        </section>

        <form onSubmit={savePassword} className={`${stCard} flex flex-col gap-3 p-6`}>
          <h2 className="m-0 text-base font-medium">修改密碼</h2>
          <label className="flex flex-col gap-1.5 text-sm text-st-ink-2">
            目前的密碼
            <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={`${stInput} h-9`} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-st-ink-2">
            新密碼（至少 8 個字元）
            <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={`${stInput} h-9`} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-st-ink-2">
            再輸入一次新密碼
            <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={`${stInput} h-9`} />
          </label>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {passwordProblem ? <span className="mr-auto text-sm text-st-danger">{passwordProblem}</span> : <span className="mr-auto"><StatusText status={passwordStatus} /></span>}
            <button
              type="submit"
              disabled={savingPassword || !current || !next || next !== confirm || !!passwordProblem}
              className={stBtnPrimary}
            >
              {savingPassword ? "更新中…" : "更新密碼"}
            </button>
          </div>
        </form>
      </main>
    </StudioPage>
  );
}
