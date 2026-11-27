"use client";

import RichtextBlockEditor from "@/components/studio/RichtextBlockEditor";
import { getPublication, updatePublication } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { canPublish } from "@/lib/roles";
import { StudioPage } from "@/components/studio/shell/StudioHeader";
import { stBtnPrimary, stCard, stInput } from "@/lib/styles";
import Link from "next/link";
import { useEffect, useState } from "react";

/** Studio editor for the public /about page (stored on the publication). */
export default function AboutEditor() {
  const { token, user } = useAuth();
  const [summary, setSummary] = useState("");
  const [about, setAbout] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getPublication()
      .then((p) => {
        setSummary(p.summary ?? "");
        setAbout(p.about ?? "");
      })
      .catch(() => setMessage("無法載入關於頁內容"))
      .finally(() => setLoaded(true));
  }, []);

  async function save() {
    if (!token) return;
    setSaving(true);
    setMessage(null);
    try {
      await updatePublication(token, { summary, about });
      setDirty(false);
      setMessage("已儲存");
    } catch {
      setMessage("儲存失敗，請再試一次");
    } finally {
      setSaving(false);
    }
  }

  const editable = canPublish(user);

  return (
    <StudioPage>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-b border-st-line bg-st-surface px-4 py-3.5 sm:px-8">
        <h1 className="m-0 text-base font-medium">關於頁</h1>
        <Link href="/about" className="text-sm text-st-muted no-underline hover:text-st-ink">
          查看前台 ↗
        </Link>
        <span className="flex-1" />
        {message && <span className="text-sm text-st-muted">{message}</span>}
        <button type="button" onClick={save} disabled={!editable || !dirty || saving} className={stBtnPrimary}>
          {saving ? "儲存中…" : "儲存"}
        </button>
      </div>

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-5 sm:px-8">
        {!editable && <p className="m-0 text-sm text-st-muted">只有事工主理人（manager）可以修改關於頁。</p>}
        {!loaded && <p className="m-0 text-sm text-st-muted">載入中…</p>}

        {loaded && (
          <div className={`${stCard} flex flex-col gap-5 p-5 sm:p-6`}>
            <label className="flex flex-col gap-1.5 text-sm text-st-ink-2">
              一句話介紹
              <input
                type="text"
                value={summary}
                maxLength={500}
                disabled={!editable}
                onChange={(e) => {
                  setSummary(e.target.value);
                  setDirty(true);
                }}
                className={`${stInput} w-full py-2`}
              />
            </label>

            <div className="flex flex-col gap-1.5 text-sm text-st-ink-2">
              內容
              <div
                className={`rounded-lg border border-st-line-strong px-3.5 py-2 transition focus-within:border-st-accent focus-within:ring-2 focus-within:ring-st-accent/20 ${editable ? "" : "pointer-events-none opacity-70"}`}
              >
                <RichtextBlockEditor
                  html={about}
                  appearance="paper"
                  onChange={(html) => {
                    setAbout(html);
                    setDirty(true);
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </StudioPage>
  );
}
