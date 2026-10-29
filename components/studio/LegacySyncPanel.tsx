"use client";

import { getLegacyMonthStatus, syncLegacyDates } from "@/lib/api";
import type { LegacyGap, LegacySyncItem } from "@/lib/types";
import { useState } from "react";

export function gapLabel(gap: LegacyGap): string {
  if (gap === "article") return "整篇文章";
  if (gap === "cover") return "封面圖片";
  if (gap === "title") return "標題";
  return gap.slice("block:".length);
}

type Props = {
  token: string;
  date: string;
  /** Unsaved edits would be overwritten by the reload after syncing */
  disabled: boolean;
  onSynced: () => void;
};

/** Edit-page panel: compare this day with the old Google Site and fill what is empty. */
export default function LegacySyncPanel({ token, date, disabled, onSynced }: Props) {
  const [item, setItem] = useState<LegacySyncItem | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function check() {
    setBusy(true);
    setMessage(null);
    try {
      const status = await getLegacyMonthStatus(token, date.slice(0, 7), true);
      setItem(status.items.find((i) => i.date === date) ?? null);
    } catch {
      setMessage("無法讀取舊網站，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  async function sync() {
    setBusy(true);
    setMessage(null);
    try {
      const [result] = await syncLegacyDates(token, [date]);
      if (result.action === "failed") {
        setMessage(`補齊失敗：${result.error}`);
      } else {
        setMessage(
          result.filled.length
            ? `已補齊：${result.filled.map(gapLabel).join("、")}`
            : "沒有需要補齊的內容",
        );
        setItem((prev) => prev && { ...prev, state: "synced", gaps: [] });
        onSynced();
      }
    } catch {
      setMessage("補齊失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-pebble-300 bg-pebble-50 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-pebble-600">舊網站（Google Site）</span>
        {item === undefined && (
          <button
            type="button"
            onClick={check}
            disabled={busy}
            className="text-iris-600 hover:text-iris-700 disabled:opacity-50"
          >
            {busy ? "檢查中…" : "檢查是否有缺少的內容"}
          </button>
        )}
      </div>

      {item === null && (
        <p className="mt-2 text-pebble-500">舊網站沒有這一天的內容。</p>
      )}

      {item && item.gaps.length === 0 && !message && (
        <p className="mt-2 text-pebble-500">內容完整，不需要補齊。</p>
      )}

      {item && item.gaps.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-pebble-700">
            舊網站有、這裡是空的：{item.gaps.map(gapLabel).join("、")}
          </span>
          <button
            type="button"
            onClick={sync}
            disabled={busy || disabled}
            title={disabled ? "請先儲存目前的修改" : undefined}
            className="rounded-md bg-iris-500 px-3 py-1 text-white hover:bg-iris-600 disabled:opacity-50"
          >
            {busy ? "補齊中…" : "從舊網站補齊"}
          </button>
          {disabled && <span className="text-xs text-pebble-400">請先儲存目前的修改</span>}
        </div>
      )}

      {item?.warnings.map((w) => (
        <p key={w} className="mt-1 text-xs text-amber-700">⚠ {w}</p>
      ))}
      {message && <p className="mt-2 text-pebble-700">{message}</p>}
    </div>
  );
}
