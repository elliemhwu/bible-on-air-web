"use client";

import RichtextBlockEditor from "@/components/studio/RichtextBlockEditor";
import { getPublication, updatePublication } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { canPublish } from "@/lib/roles";
import { btnPrimaryCls, inputCls } from "@/lib/styles";
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
    <main className="mx-auto w-full max-w-3xl px-6 py-8 font-sans">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-pebble-900">關於頁</h1>
        <div className="flex gap-4 text-sm">
          <Link href="/about" className="text-iris-600 hover:text-iris-700">
            查看前台
          </Link>
          <Link href="/studio" className="text-pebble-500 hover:text-pebble-800">
            回後台
          </Link>
        </div>
      </div>

      {!editable && (
        <p className="mb-4 text-sm text-pebble-500">只有事工主理人（manager）可以修改關於頁。</p>
      )}

      {loaded && (
        <div className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5 text-sm text-pebble-600">
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
              className={inputCls}
            />
          </label>

          <div className="flex flex-col gap-1.5 text-sm text-pebble-600">
            內容
            <div className={editable ? "" : "pointer-events-none opacity-70"}>
              <RichtextBlockEditor
                html={about}
                onChange={(html) => {
                  setAbout(html);
                  setDirty(true);
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={!editable || !dirty || saving}
              className={btnPrimaryCls}
            >
              {saving ? "儲存中…" : "儲存"}
            </button>
            {message && <span className="text-sm text-pebble-600">{message}</span>}
          </div>
        </div>
      )}
    </main>
  );
}
