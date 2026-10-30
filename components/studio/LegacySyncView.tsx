"use client";

import { gapLabel } from "@/components/studio/LegacySyncPanel";
import { getLegacyMonthStatus, getLegacyMonths, syncLegacyDates } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { btnPrimaryCls, selectCls } from "@/lib/styles";
import type { LegacyMonth, LegacyMonthStatus, LegacySyncItem, LegacySyncResult } from "@/lib/types";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

// Days per request; each new day downloads a cover image from the old site
const CHUNK_SIZE = 5;

const STATE_LABEL: Record<LegacySyncItem["state"], { text: string; cls: string }> = {
  missing: { text: "尚未匯入", cls: "bg-amber-100 text-amber-800" },
  incomplete: { text: "缺少部分內容", cls: "bg-sky-100 text-sky-800" },
  synced: { text: "已同步", cls: "bg-green-100 text-green-700" },
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

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-8 font-sans">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-pebble-900">從舊網站同步</h1>
        <Link href="/studio" className="text-sm text-pebble-500 hover:text-pebble-800">
          回後台
        </Link>
      </div>
      <p className="mb-6 text-sm text-pebble-500">
        比對舊的 Google Site 與目前的資料。尚未匯入的日子會直接新增並發布；已存在的文章只會補上空白的部分，不會覆蓋已編輯的內容。
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={month}
          onChange={(e) => {
            setMonth(e.target.value);
            setResults(new Map());
            setError(null);
          }}
          className={`${selectCls} !w-auto`}
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
          className="text-sm text-iris-600 hover:text-iris-700 disabled:opacity-50"
        >
          重新讀取舊網站
        </button>
        {status && (
          <a href={status.url} target="_blank" rel="noreferrer" className="text-sm text-pebble-500 hover:text-pebble-800">
            開啟舊網站月份頁 ↗
          </a>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {status && (
        <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-pebble-600">
          <span>共 {status.items.length} 天</span>
          <span>尚未匯入 {counts.missing}</span>
          <span>缺少部分內容 {counts.incomplete}</span>
          <span>已同步 {counts.synced}</span>
          <div className="ml-auto flex items-center gap-3">
            {progress && (
              <span className="text-pebble-500">
                同步中 {progress.done}/{progress.total}…
              </span>
            )}
            <button
              type="button"
              onClick={syncSelected}
              disabled={syncing || loading || selected.size === 0}
              className={btnPrimaryCls}
            >
              同步選取的 {selected.size} 天
            </button>
          </div>
        </div>
      )}

      {loading && !status && <p className="text-sm text-pebble-400">讀取中…</p>}

      {status && (
        <div className="overflow-x-auto rounded-lg border border-pebble-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-pebble-50 text-left text-xs text-pebble-500">
              <tr>
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label="全選需要同步的日子"
                    checked={
                      status.items.some((i) => i.state !== "synced") &&
                      status.items.filter((i) => i.state !== "synced").every((i) => selected.has(i.date))
                    }
                    onChange={(e) =>
                      setSelected(
                        new Set(
                          e.target.checked
                            ? status.items.filter((i) => i.state !== "synced").map((i) => i.date)
                            : [],
                        ),
                      )
                    }
                  />
                </th>
                <th className="px-3 py-2">日期</th>
                <th className="px-3 py-2">標題</th>
                <th className="px-3 py-2">狀態</th>
                <th className="px-3 py-2">結果</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pebble-100">
              {status.items.map((item) => {
                const result = results.get(item.date);
                return (
                  <tr key={item.date} className={loading ? "opacity-60" : ""}>
                    <td className="px-3 py-2 align-top">
                      <input
                        type="checkbox"
                        aria-label={`選取 ${item.date}`}
                        checked={selected.has(item.date)}
                        disabled={item.state === "synced" || syncing}
                        onChange={() => toggle(item.date)}
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-top tabular-nums text-pebble-700">
                      {item.date}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="text-pebble-900">
                        {item.articleId ? (
                          <Link href={`/studio/articles/${item.articleId}/edit`} className="hover:text-iris-600">
                            {item.title}
                          </Link>
                        ) : (
                          item.title
                        )}
                        {item.kind === "overview" && (
                          <span className="ml-2 rounded bg-pebble-100 px-1.5 py-0.5 text-xs text-pebble-500">鳥瞰</span>
                        )}
                      </div>
                      <div className="text-xs text-pebble-400">{item.heading}</div>
                      {item.warnings.map((w) => (
                        <div key={w} className="text-xs text-amber-700">⚠ {w}</div>
                      ))}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${STATE_LABEL[item.state].cls}`}>
                        {STATE_LABEL[item.state].text}
                      </span>
                      {item.state === "incomplete" && (
                        <div className="mt-1 text-xs text-pebble-500">
                          缺：{item.gaps.map(gapLabel).join("、")}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top text-xs">
                      {result && (
                        <span className={result.action === "failed" ? "text-red-600" : "text-pebble-600"}>
                          {ACTION_LABEL[result.action]}
                          {result.error && `：${result.error}`}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
