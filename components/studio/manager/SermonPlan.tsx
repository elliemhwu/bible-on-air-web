"use client";

import PlanToolbar from "@/components/studio/manager/PlanToolbar";
import { fetchYear } from "@/components/studio/manager/YearPlan";
import { StudioPage } from "@/components/studio/shell/StudioHeader";
import { getBibleBooks, savePlan } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { stCard, stCellInput } from "@/lib/styles";
import { parsePassages } from "@/lib/passage";
import type { BibleBook, WeekPlan } from "@/lib/types";
import { addDays, md, mondayOf, mondaysOfYear, today, WEEKDAYS, yearWeekLabel } from "@/lib/week";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Field = "sundayTheme" | "sundayPassage" | "note";
type Draft = Partial<Record<Field, string>>;
type RowState = "saving" | "saved" | "error";

const ROW_STATE: Record<RowState, { text: string; cls: string }> = {
  saving: { text: "儲存中…", cls: "text-st-muted" },
  saved: { text: "已儲存", cls: "text-st-sage-ink" },
  error: { text: "儲存失敗", cls: "text-st-danger" },
};

/**
 * 進度安排・講道主題: the year's sermons, one row per week, planned before the
 * days are cut. Each row saves on leaving it and keeps the week's daily passages.
 */
export default function SermonPlan({ year }: { year: number }) {
  const { token } = useAuth();
  const [plans, setPlans] = useState<Map<string, WeekPlan> | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const [books, setBooks] = useState<BibleBook[]>([]);
  const thisWeek = mondayOf(today());
  const currentRow = useRef<HTMLLIElement>(null);
  const mondays = mondaysOfYear(year);

  useEffect(() => {
    if (!token) return;
    let live = true;
    fetchYear(token, year).then((p) => {
      if (!live) return;
      setPlans(p);
      setDrafts({});
      setRowState({});
    });
    return () => {
      live = false;
    };
  }, [token, year]);

  useEffect(() => {
    getBibleBooks().then(setBooks).catch(() => setBooks([]));
  }, []);

  // Open at this week once the year has loaded, not after every save
  const loaded = plans !== null;
  useEffect(() => {
    if (loaded) currentRow.current?.scrollIntoView({ block: "center" });
  }, [loaded, year]);

  const value = (monday: string, field: Field) => drafts[monday]?.[field] ?? plans?.get(monday)?.[field] ?? "";

  async function save(monday: string) {
    const draft = drafts[monday];
    const plan = plans?.get(monday);
    if (!token || !plans || !draft) return;
    const theme = value(monday, "sundayTheme").trim() || null;
    const passage = value(monday, "sundayPassage").trim() || null;
    const note = value(monday, "note").trim() || null;
    if (theme === (plan?.sundayTheme ?? null) && passage === (plan?.sundayPassage ?? null) && note === (plan?.note ?? null)) return;

    setRowState((s) => ({ ...s, [monday]: "saving" }));
    try {
      const saved = await savePlan(token, monday, {
        sundayTheme: theme,
        sundayPassage: passage,
        note,
        days: plan?.days ?? WEEKDAYS.map(() => ({ ref: "" })),
      });
      setPlans((p) => new Map(p).set(monday, saved));
      // Keep anything typed while the save was on its way
      setDrafts((d) => {
        const typed = d[monday];
        const same = (f: Field) => (typed?.[f] ?? saved[f] ?? "").trim() === (saved[f] ?? "");
        if (!same("sundayTheme") || !same("sundayPassage") || !same("note")) return d;
        const next = { ...d };
        delete next[monday];
        return next;
      });
      setRowState((s) => ({ ...s, [monday]: "saved" }));
    } catch {
      setRowState((s) => ({ ...s, [monday]: "error" }));
    }
  }

  // Enter moves down the column, like a spreadsheet
  function nextRow(e: React.KeyboardEvent<HTMLInputElement>, index: number, field: Field) {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    e.preventDefault();
    document.querySelector<HTMLInputElement>(`[data-row="${index + 1}"][data-field="${field}"]`)?.focus();
  }

  const planned = plans ? mondays.filter((m) => plans.get(m)?.sundayTheme).length : 0;

  return (
    <StudioPage>
      <PlanToolbar view="sermons" year={year}>
        {plans && (
          <span className="text-sm text-st-muted">
            已排 {planned} / {mondays.length} 週
          </span>
        )}
      </PlanToolbar>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-5 sm:px-8">
        <section className={`${stCard} overflow-hidden`}>
          <div className="hidden grid-cols-[3.5rem_6.5rem_minmax(0,1fr)_11rem_9rem_5.5rem] gap-2 border-b border-st-line bg-st-sunken px-4 py-2 text-xs text-st-muted sm:grid">
            <span>週次</span>
            <span>日期</span>
            <span className="px-2.5">講道主題</span>
            <span className="px-2.5">經文</span>
            <span className="px-2.5">節期與備註</span>
            <span className="text-right">每日經文</span>
          </div>

          {!plans && <p className="m-0 px-4 py-8 text-center text-sm text-st-muted">載入中…</p>}

          {plans && (
            <ol className="m-0 list-none p-0">
              {mondays.map((monday, i) => {
                const sunday = addDays(monday, 6);
                const newMonth = i === 0 || sunday.slice(5, 7) !== addDays(mondays[i - 1], 6).slice(5, 7);
                const split = plans.get(monday)?.days.filter((d) => d.ref).length ?? 0;
                const current = monday === thisWeek;
                const state = rowState[monday];
                const passage = value(monday, "sundayPassage");
                const passageErrors = passage.trim() && books.length ? parsePassages(passage, books).errors : [];
                return (
                  <li
                    key={monday}
                    ref={current ? currentRow : undefined}
                    className={newMonth && i > 0 ? "border-t border-st-line" : ""}
                  >
                    {newMonth && (
                      <div className="px-4 pb-1 pt-3 font-serif text-sm font-semibold text-st-gold-ink">
                        {Number(sunday.slice(5, 7))} 月
                      </div>
                    )}
                    <div
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget)) save(monday);
                      }}
                      className={`grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 px-4 py-1.5 sm:grid-cols-[3.5rem_6.5rem_minmax(0,1fr)_11rem_9rem_5.5rem] ${current ? "bg-st-warm" : ""}`}
                    >
                      <span className="whitespace-nowrap text-xs tabular-nums text-st-muted">第 {i + 1} 週</span>
                      <span className="flex flex-col text-sm tabular-nums leading-tight text-st-ink-2">
                        <span className="whitespace-nowrap">{yearWeekLabel(monday)}</span>
                        {current && <span className="text-xs text-st-gold-ink">本週</span>}
                      </span>
                      <span className="col-span-3 row-start-2 sm:col-span-1 sm:row-start-auto">
                        <input
                          value={value(monday, "sundayTheme")}
                          onChange={(e) => setDrafts((d) => ({ ...d, [monday]: { ...d[monday], sundayTheme: e.target.value } }))}
                          onKeyDown={(e) => nextRow(e, i, "sundayTheme")}
                          data-row={i}
                          data-field="sundayTheme"
                          maxLength={200}
                          aria-label={`${md(sunday)} 講道主題`}
                          className={`${stCellInput} font-medium`}
                        />
                      </span>
                      <span className="col-span-2 row-start-3 flex flex-col sm:col-span-1 sm:row-start-auto">
                        <input
                          value={passage}
                          onChange={(e) => setDrafts((d) => ({ ...d, [monday]: { ...d[monday], sundayPassage: e.target.value } }))}
                          onKeyDown={(e) => nextRow(e, i, "sundayPassage")}
                          data-row={i}
                          data-field="sundayPassage"
                          maxLength={100}
                          aria-label={`${md(sunday)} 主日經文`}
                          aria-invalid={passageErrors.length > 0}
                          className={`${stCellInput} ${passageErrors.length ? "!border-st-danger" : ""}`}
                        />
                        {passageErrors.length > 0 && (
                          <span className="px-2.5 text-xs text-st-danger">{passageErrors.join("；")}</span>
                        )}
                      </span>
                      <span className="col-span-3 row-start-4 sm:col-span-1 sm:row-start-auto">
                        <input
                          value={value(monday, "note")}
                          onChange={(e) => setDrafts((d) => ({ ...d, [monday]: { ...d[monday], note: e.target.value } }))}
                          onKeyDown={(e) => nextRow(e, i, "note")}
                          data-row={i}
                          data-field="note"
                          maxLength={200}
                          aria-label={`${md(sunday)} 節期與備註`}
                          className={`${stCellInput} text-st-ink-2`}
                        />
                      </span>
                      <span className="col-start-3 row-start-1 flex flex-col items-end text-xs sm:col-start-auto sm:row-start-auto">
                        <Link
                          href={`/studio/plan/${monday}`}
                          className={`whitespace-nowrap no-underline hover:underline ${split === 6 ? "text-st-sage-ink" : "text-st-accent"}`}
                        >
                          {split === 6 ? "已切分 ›" : split ? `${split}/6 天 ›` : "切分 ›"}
                        </Link>
                        {state && <span className={ROW_STATE[state].cls}>{ROW_STATE[state].text}</span>}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </main>
    </StudioPage>
  );
}
