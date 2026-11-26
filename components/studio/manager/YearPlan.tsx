"use client";

import PlanToolbar from "@/components/studio/manager/PlanToolbar";
import { StudioPage } from "@/components/studio/shell/StudioHeader";
import { getPlans, savePlan } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { stBtnPrimary, stBtnSecondary, stCard } from "@/lib/styles";
import { parseSheet } from "@/lib/plan-sheet";
import type { WeekPlan } from "@/lib/types";
import { addDays, md, mondayOf, mondaysOfYear, today, WEEKDAYS, yearWeekLabel } from "@/lib/week";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

function ImportDialog({ year, onDone, onClose }: { year: number; onDone: () => void; onClose: () => void }) {
  const { token } = useAuth();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rows = parseSheet(text, year);

  async function save() {
    if (!token || rows.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      for (const { weekStart, ...plan } of rows) await savePlan(token, weekStart, plan);
      onDone();
    } catch {
      setError("匯入失敗，請檢查經文格式後再試一次");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="import-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className={`${stCard} flex w-full max-w-2xl flex-col gap-3 p-6`}>
        <h2 id="import-title" className="m-0 font-serif text-lg font-semibold">匯入試算表</h2>
        <p className="m-0 text-sm text-st-ink-2">
          從「靈修講道進度」試算表選取整頁（含標題列「主題、日期、禮拜幾、經文」）複製後貼上，每列一天；
          主日那列的主題與經文會成為該週的主日信息，「加拉太書鳥瞰」這類經文代表書卷鳥瞰。
          也可以每列一週：日期、主日主題、主日經文、週一到週六的經文。已有的週會被覆蓋。
        </p>
        <label htmlFor="sheet" className="sr-only">試算表內容</label>
        <textarea
          id="sheet"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={"主題\t日期\t禮拜幾\t經文\n\t1月5日\t星期一\t路4:16-19\n…\n福音是什麼2-恩典的宣告\t1月11日\t星期日\t路4:15-21"}
          className="rounded-lg border border-st-line-strong bg-st-surface p-3 font-mono text-xs text-st-ink outline-none focus:border-st-accent"
        />
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex-1 text-sm text-st-muted">{rows.length
              ? `讀到 ${rows.length} 週：${rows[0].weekStart.replaceAll("-", "/")} – ${addDays(rows[rows.length - 1].weekStart, 6).replaceAll("-", "/")}`
              : "還沒有讀到日期"}</span>
          {error && <span className="text-sm text-st-danger">{error}</span>}
          <button type="button" onClick={onClose} className={stBtnSecondary}>取消</button>
          <button type="button" onClick={save} disabled={saving || rows.length === 0} className={stBtnPrimary}>
            {saving ? "匯入中…" : "匯入"}
          </button>
        </div>
      </div>
    </div>
  );
}

export async function fetchYear(token: string, year: number): Promise<Map<string, WeekPlan>> {
  const weeks = mondaysOfYear(year);
  const list = await getPlans(token, weeks[0], weeks[weeks.length - 1]);
  return new Map(list.map((p) => [p.weekStart, p]));
}

/** 進度安排・年度: every week of the year with its passages */
export default function YearPlan({ year }: { year: number }) {
  const { token } = useAuth();
  const [plans, setPlans] = useState<Map<string, WeekPlan>>(new Map());
  const [importing, setImporting] = useState(false);
  const thisWeek = mondayOf(today());
  const currentRow = useRef<HTMLAnchorElement>(null);
  const mondays = mondaysOfYear(year);

  useEffect(() => {
    if (!token) return;
    let live = true;
    fetchYear(token, year).then((plans) => live && setPlans(plans));
    return () => {
      live = false;
    };
  }, [token, year]);

  const reload = async () => {
    if (token) setPlans(await fetchYear(token, year));
  };

  useEffect(() => {
    currentRow.current?.scrollIntoView({ block: "center" });
  }, [plans]);

  return (
    <StudioPage>
      <PlanToolbar view="days" year={year}>
        <button type="button" onClick={() => setImporting(true)} className={stBtnSecondary}>匯入試算表</button>
      </PlanToolbar>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-8">

        <section className={`${stCard} overflow-x-auto`}>
          <div className="grid min-w-[890px] grid-cols-[180px_repeat(6,minmax(0,1fr))] border-b border-st-line text-xs text-st-muted">
            <div className="px-4 py-3">週次</div>
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-3 py-3">{d}</div>
            ))}
          </div>
          {mondays.map((monday, i) => {
            const plan = plans.get(monday);
            const current = monday === thisWeek;
            return (
              <Link
                key={monday}
                ref={current ? currentRow : undefined}
                href={`/studio/plan/${monday}`}
                className={`grid min-w-[890px] grid-cols-[180px_repeat(6,minmax(0,1fr))] border-b border-st-line/70 text-sm text-st-ink no-underline last:border-0 hover:bg-st-sunken ${current ? "bg-st-warm" : ""}`}
              >
                <div className="flex flex-col gap-0.5 px-4 py-3">
                  <span className="text-xs text-st-muted">第 {i + 1} 週</span>
                  <span className="whitespace-nowrap font-medium tabular-nums">{yearWeekLabel(monday)}</span>
                  {plan?.sundayTheme && <span className="text-xs text-st-ink-2">{plan.sundayTheme}</span>}
                  {plan?.sundayPassage && <span className="text-xs text-st-gold-ink">{plan.sundayPassage}</span>}
                  {plan?.note && <span className="text-xs text-st-muted">{plan.note}</span>}
                </div>
                {WEEKDAYS.map((_, i) => {
                  const day = plan?.days[i];
                  return (
                    <div key={i} className="flex flex-col gap-1 px-3 py-3">
                      {day?.ref && <span>{day.ref}</span>}
                      {day?.overview && (
                        <span className="self-start rounded-full bg-st-soft px-2 text-xs text-st-ink-2">鳥瞰</span>
                      )}
                    </div>
                  );
                })}
              </Link>
            );
          })}
        </section>
      </main>
      {importing && (
        <ImportDialog
          year={year}
          onClose={() => setImporting(false)}
          onDone={() => {
            setImporting(false);
            reload();
          }}
        />
      )}
    </StudioPage>
  );
}
