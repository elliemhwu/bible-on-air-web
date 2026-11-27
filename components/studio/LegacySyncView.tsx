"use client";

import { gapLabel } from "@/components/studio/LegacySyncPanel";
import { getLegacyMonthStatus, getLegacyMonths, syncLegacyDates } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { StudioPage } from "@/components/studio/shell/StudioHeader";
import { stBtnGhost, stBtnPrimary, stCard, stInput } from "@/lib/styles";
import { weekday } from "@/lib/week";
import type { LegacyMonth, LegacyMonthStatus, LegacySyncItem, LegacySyncResult } from "@/lib/types";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

// Days per request; each new day downloads a cover image from the old site
const CHUNK_SIZE = 5;

const STATE_LABEL: Record<LegacySyncItem["state"], { text: string; cls: string }> = {
  missing: { text: "尚未匯入", cls: "bg-st-gold-soft text-st-gold-soft-ink" },
  incomplete: { text: "缺少部分內容", cls: "bg-st-soft text-st-accent" },
  synced: { text: "已同步", cls: "bg-st-sage-soft text-st-sage-ink" },
};

const ACTION_LABEL: Record<LegacySyncResult["action"], string> = {
  created: "已新增並發布",
  updated: "已補齊",
  unchanged: "無變更",
  failed: "失敗",
};

export default function LegacySyncView() {
  const { token } = useAuth();
  const [months, setMonths] = useState<LegacyMonth[]>([]);
  const [month, setMonth] = useState<string>("");
  const [status, setStatus] = useState<LegacyMonthStatus | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [results, setResults] = useState<Map<string, LegacySyncResult>>(new Map());

  useEffect(() => {
    if (!token) return;
    getLegacyMonths(token)
      .then((list) => {
        setMonths(list);
        setMonth((m) => m || list[0]?.month || "");
      })
      .catch(() => setError("無法連線到舊網站，請稍後再試"));
  }, [token]);

  const loadStatus = useCallback(
    async (refresh: boolean) => {
      if (!token || !month) return;
      setRefreshing(true);
      setError(null);
      try {
        const s = await getLegacyMonthStatus(token, month, refresh);
        setStatus(s);
        setSelected(new Set(s.items.filter((i) => i.state !== "synced").map((i) => i.date)));
      } catch {
        setError("讀取舊網站內容失敗");
        setStatus(null);
      } finally {
        setRefreshing(false);
      }
    },
    [token, month],
  );

  useEffect(() => {
    if (!token || !month) return;
    let live = true;
    getLegacyMonthStatus(token, month, false)
      .then((s) => {
        if (!live) return;
        setStatus(s);
        setSelected(new Set(s.items.filter((i) => i.state !== "synced").map((i) => i.date)));
      })
      .catch(() => {
        if (!live) return;
        setError("讀取舊網站內容失敗");
        setStatus(null);
      });
    return () => {
      live = false;
    };
  }, [token, month]);

  // A month is loading until its status (or an error) arrives
  const loading = refreshing || (!!month && status?.month !== month && !error);

  const counts = useMemo(() => {
    const c = { missing: 0, incomplete: 0, synced: 0 };
    status?.items.forEach((i) => c[i.state]++);
    return c;
  }, [status]);

  function toggle(date: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  async function syncSelected() {
    if (!token || selected.size === 0) return;
    const dates = [...selected].sort();
    setProgress({ done: 0, total: dates.length });
    const collected = new Map(results);
    for (let i = 0; i < dates.length; i += CHUNK_SIZE) {
      const chunk = dates.slice(i, i + CHUNK_SIZE);
      try {
        for (const r of await syncLegacyDates(token, chunk)) collected.set(r.date, r);
      } catch {
        for (const date of chunk) {
          collected.set(date, { date, action: "failed", filled: [], error: "連線失敗" });
        }
      }
      setResults(new Map(collected));
      setProgress({ done: Math.min(i + CHUNK_SIZE, dates.length), total: dates.length });
    }
    setProgress(null);
    await loadStatus(false);
  }

  const syncing = progress !== null;
  const pending = status?.items.filter((i) => i.state !== "synced") ?? [];
  const allSelected = pending.length > 0 && pending.every((i) => selected.has(i.date));

  return (
    <StudioPage>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-b border-st-line bg-st-surface px-4 py-3.5 sm:px-8">
        <h1 className="m-0 text-base font-medium">從舊網站同步</h1>
        <select
          value={month}
          onChange={(e) => {
            setMonth(e.target.value);
            setResults(new Map());
            setError(null);
          }}
          className={stInput}
          disabled={syncing}
          aria-label="月份"
        >
          {months.map((m) => (
            <option key={m.month} value={m.month}>
              {m.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => loadStatus(true)}
          disabled={loading || syncing || !month}
          className={stBtnGhost}
        >
          ↻ 重新讀取
        </button>
        {status && (
          <a href={status.url} target="_blank" rel="noreferrer" className="text-sm text-st-muted no-underline hover:text-st-ink">
            開啟舊網站 ↗
          </a>
        )}
        <span className="flex-1" />
        {progress && (
          <span className="text-sm tabular-nums text-st-muted">
            同步中 {progress.done}/{progress.total}…
          </span>
        )}
        <button
          type="button"
          onClick={syncSelected}
          disabled={syncing || loading || selected.size === 0}
          className={stBtnPrimary}
        >
          同步選取的 {selected.size} 天
        </button>
      </div>

      <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-5 sm:px-8">
        <p className="m-0 text-sm text-st-muted">
          比對舊的 Google Site 與目前的資料。尚未匯入的日子會直接新增並發布；已存在的文章只會補上空白的部分，不會覆蓋已編輯的內容。
        </p>

        {error && <p className="m-0 text-sm text-st-danger">{error}</p>}

        {status && (
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full border border-st-line bg-st-surface px-3 py-1 text-st-ink-2">共 {status.items.length} 天</span>
            {(["missing", "incomplete", "synced"] as const).map((state) => (
              <span key={state} className={`rounded-full px-3 py-1 ${STATE_LABEL[state].cls}`}>
                {STATE_LABEL[state].text} {counts[state]}
              </span>
            ))}
          </div>
        )}

        <div className={`${stCard} overflow-hidden`}>
          <div className="flex items-center gap-3 border-b border-st-line bg-st-sunken px-4 py-2 text-xs text-st-muted">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="rounded"
                aria-label="全選需要同步的日子"
                checked={allSelected}
                disabled={!pending.length || syncing}
                onChange={(e) => setSelected(new Set(e.target.checked ? pending.map((i) => i.date) : []))}
              />
              全選需要同步的日子
            </label>
          </div>

          {loading && !status && <p className="m-0 px-4 py-8 text-center text-sm text-st-muted">讀取中…</p>}
          {!loading && !status && !error && (
            <p className="m-0 px-4 py-8 text-center text-sm text-st-muted">選擇月份開始比對</p>
          )}

          {status && (
            <ul className={`m-0 list-none divide-y divide-st-line p-0 ${loading ? "opacity-60" : ""}`}>
              {status.items.map((item) => {
                const result = results.get(item.date);
                const checkable = item.state !== "synced";
                return (
                  <li
                    key={item.date}
                    className={`flex items-start gap-3 px-4 py-3 ${selected.has(item.date) ? "bg-st-soft" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 rounded"
                      aria-label={`選取 ${item.date}`}
                      checked={selected.has(item.date)}
                      disabled={!checkable || syncing}
                      onChange={() => toggle(item.date)}
                    />
                    <div className="w-12 shrink-0 text-center">
                      <div className="font-serif text-xl leading-tight tabular-nums text-st-ink">{Number(item.date.slice(8))}</div>
                      <div className="text-xs text-st-muted">週{weekday(item.date)}</div>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="font-serif text-base leading-snug text-st-ink">
                        {item.articleId ? (
                          <Link href={`/studio/articles/${item.articleId}/edit`} className="text-st-ink no-underline hover:text-st-accent">
                            {item.title}
                          </Link>
                        ) : (
                          item.title
                        )}
                        {item.kind === "overview" && (
                          <span className="ml-2 rounded-full bg-st-soft px-2 py-px align-middle font-sans text-xs text-st-ink-2">書卷鳥瞰</span>
                        )}
                      </div>
                      {item.heading && <div className="text-sm text-st-muted">{item.heading}</div>}
                      {item.state === "incomplete" && (
                        <div className="text-xs text-st-muted">缺：{item.gaps.map(gapLabel).join("、")}</div>
                      )}
                      {item.warnings.map((w) => (
                        <div key={w} className="text-xs text-st-gold-ink">⚠ {w}</div>
                      ))}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATE_LABEL[item.state].cls}`}>
                        {STATE_LABEL[item.state].text}
                      </span>
                      {result && (
                        <span className={`text-xs ${result.action === "failed" ? "text-st-danger" : "text-st-muted"}`}>
                          {ACTION_LABEL[result.action]}
                          {result.error && `：${result.error}`}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </StudioPage>
  );
}
