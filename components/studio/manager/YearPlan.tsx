"use client";

import PlanToolbar from "@/components/studio/manager/PlanToolbar";
import { StudioPage } from "@/components/studio/shell/StudioHeader";
import { getPlans, savePlan } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { stBtnPrimary, stBtnSecondary, stCard, stCellInput } from "@/lib/styles";
import { parseDay, parseSheet } from "@/lib/plan-sheet";
import type { WeekPlan } from "@/lib/types";
import { addDays, md, mondayOf, mondaysOfYear, today, WEEKDAYS, yearWeekLabel } from "@/lib/week";
import Link from "next/link";
import { useEffect, useState } from "react";

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

type Draft = { days?: string[]; sundayPassage?: string };
type RowState = "saving" | "saved" | "error";

const ROW_STATE: Record<RowState, { text: string; cls: string }> = {
  saving: { text: "儲存中…", cls: "text-st-muted" },
  saved: { text: "已儲存", cls: "text-st-sage-ink" },
  error: { text: "儲存失敗", cls: "text-st-danger" },
};

const GRID = "grid min-w-[1040px] grid-cols-[10rem_minmax(8rem,1.2fr)_repeat(6,minmax(6.5rem,1fr))_4.5rem] items-start";

// Enter moves down to the same column of the next week, like a spreadsheet
function nextWeek(e: React.KeyboardEvent<HTMLInputElement>, week: number, field: string) {
  if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
  e.preventDefault();
  document.querySelector<HTMLInputElement>(`[data-week="${week + 1}"][data-field="${field}"]`)?.focus();
}

/** One week: the Sunday passage, Mon–Sat passages, and the way into 切分 */
function WeekRow({
  monday,
  index,
  plan,
  current,
  onSaved,
}: {
  monday: string;
  index: number;
  plan: WeekPlan | undefined;
  current: boolean;
  onSaved: (plan: WeekPlan) => void;
}) {
  const { token } = useAuth();
  const [draft, setDraft] = useState<Draft>({});
  const [state, setState] = useState<RowState | null>(null);

  const dayText = (i: number) => draft.days?.[i] ?? plan?.days[i]?.ref ?? "";
  const passage = draft.sundayPassage ?? plan?.sundayPassage ?? "";
  const split = plan?.days.filter((d) => d.ref).length ?? 0;
  // 「聖誕主日-馬槽的嬰孩」: the season or note, then the Sunday theme, whichever are there
  const heading = [plan?.note, plan?.sundayTheme].filter(Boolean).join("-");

  function setDay(i: number, text: string) {
    const days = WEEKDAYS.map((_, k) => dayText(k));
    days[i] = text;
    setDraft((d) => ({ ...d, days }));
  }

  async function save() {
    if (!token || (draft.days === undefined && draft.sundayPassage === undefined)) return;
    // "加拉太書鳥瞰" marks an overview day; otherwise a day keeps its 鳥瞰 mark
    const days = WEEKDAYS.map((_, i) => {
      const typed = parseDay(dayText(i));
      return typed.overview || !plan?.days[i]?.overview || !typed.ref ? typed : { ...typed, overview: true };
    });
    const next = { sundayTheme: plan?.sundayTheme ?? null, sundayPassage: passage.trim() || null, days };
    const unchanged =
      next.sundayPassage === (plan?.sundayPassage ?? null) &&
      days.every((d, i) => d.ref === (plan?.days[i]?.ref ?? "") && !!d.overview === !!plan?.days[i]?.overview);
    if (unchanged) {
      setDraft({});
      return;
    }
    setState("saving");
    try {
      onSaved(await savePlan(token, monday, next));
      setDraft({});
      setState("saved");
    } catch {
      setState("error");
    }
  }

  return (
    <div
      id={current ? "this-week" : undefined}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) save();
      }}
      className={`${GRID} border-b border-st-line/70 text-sm last:border-0 ${current ? "bg-st-warm" : ""}`}
    >
      <div className={`sticky left-0 z-10 flex flex-col gap-0.5 self-stretch py-2.5 pl-4 pr-1 ${current ? "bg-st-warm" : "bg-st-surface"}`}>
        <span className="text-xs text-st-muted">
          第 {index + 1} 週{current && <span className="ml-1 text-st-gold-ink">本週</span>}
        </span>
        <span className="whitespace-nowrap font-medium tabular-nums">{yearWeekLabel(monday)}</span>
        {heading && <span className="text-xs leading-snug text-st-ink-2">{heading}</span>}
        {state && <span className={`text-xs ${ROW_STATE[state].cls}`}>{ROW_STATE[state].text}</span>}
      </div>

      <div className="px-1.5 pt-1.5">
        <input
          value={passage}
          onChange={(e) => setDraft((d) => ({ ...d, sundayPassage: e.target.value }))}
          onKeyDown={(e) => nextWeek(e, index, "sundayPassage")}
          data-week={index}
          data-field="sundayPassage"
          maxLength={100}
          aria-label={`第 ${index + 1} 週主日經文`}
          className={`${stCellInput} text-st-gold-ink`}
        />
      </div>

      {WEEKDAYS.map((d, i) => (
        <div key={d} className="flex flex-col px-1.5 pt-1.5">
          <input
            value={dayText(i)}
            onChange={(e) => setDay(i, e.target.value)}
            onKeyDown={(e) => nextWeek(e, index, `day${i}`)}
            data-week={index}
            data-field={`day${i}`}
            maxLength={100}
            aria-label={`${md(addDays(monday, i))} 週${d}經文`}
            className={stCellInput}
          />
          {plan?.days[i]?.overview && draft.days === undefined && (
            <span className="ml-2 self-start rounded-full bg-st-soft px-2 text-xs text-st-ink-2">鳥瞰</span>
          )}
        </div>
      ))}

      <div className="px-3 pt-3">
        <Link href={`/studio/plan/${monday}`} className="whitespace-nowrap text-xs text-st-accent no-underline hover:underline">
          {split === 6 ? "已切分 ›" : split ? `${split}/6 ›` : "切分 ›"}
        </Link>
      </div>
    </div>
  );
}

/** 進度安排・每日經文: every week of the year, its days and Sunday edited in place */
export default function YearPlan({ year }: { year: number }) {
  const { token } = useAuth();
  const [plans, setPlans] = useState<Map<string, WeekPlan> | null>(null);
  const [importing, setImporting] = useState(false);
  const thisWeek = mondayOf(today());
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

  // Open at this week once the year has loaded, not after every save
  const loaded = plans !== null;
  useEffect(() => {
    if (loaded) document.getElementById("this-week")?.scrollIntoView({ block: "center" });
  }, [loaded, year]);

  return (
    <StudioPage>
      <PlanToolbar view="days" year={year}>
        <button type="button" onClick={() => setImporting(true)} className={stBtnSecondary}>匯入試算表</button>
      </PlanToolbar>
      <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-4 py-5 sm:px-8">
        <section className={`${stCard} overflow-x-auto`}>
          <div className={`${GRID} border-b border-st-line text-xs text-st-muted`}>
            <div className="sticky left-0 z-10 bg-st-surface py-3 pl-4">週次</div>
            <div className="px-3.5 py-3">主日經文</div>
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-3.5 py-3">週{d}</div>
            ))}
            <div className="px-3 py-3">切分</div>
          </div>
          {!plans && <p className="m-0 px-4 py-8 text-center text-sm text-st-muted">載入中…</p>}
          {plans &&
            mondays.map((monday, i) => (
              <WeekRow
                key={monday}
                monday={monday}
                index={i}
                plan={plans.get(monday)}
                current={monday === thisWeek}
                onSaved={(saved) => setPlans((p) => new Map(p).set(monday, saved))}
              />
            ))}
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
