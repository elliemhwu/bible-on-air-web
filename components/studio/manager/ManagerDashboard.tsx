"use client";

import { StudioPage } from "@/components/studio/shell/StudioHeader";
import WeekNav from "@/components/studio/shell/WeekNav";
import { batchPublish } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { stBtnPrimary, stCard } from "@/lib/styles";
import { isReviewed, useWeek, writingState, type DayInfo } from "@/lib/useWeek";
import { md, mondayOf, today, weekday, weekLabel } from "@/lib/week";
import Link from "next/link";
import { useState } from "react";

const DONE = <span className="text-st-sage-ink" aria-label="完成">✓</span>;
const NONE = <span className="text-st-faint">—</span>;

function Pending({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-st-gold-soft px-2 py-0.5 text-xs text-st-gold-soft-ink">{children}</span>;
}

function writingCell(d: DayInfo) {
  const state = writingState(d.article);
  if (state === "submitted") return DONE;
  return <Pending>{state === "drafting" ? "撰寫中" : "未開始"}</Pending>;
}

function reviewCell(d: DayInfo) {
  if (isReviewed(d.article)) return DONE;
  if (writingState(d.article) === "submitted") return <Pending>待校閱</Pending>;
  return NONE;
}

function imageCell(d: DayInfo) {
  if (d.article?.coverImageUrl) return DONE;
  return <Pending>缺圖片</Pending>;
}

/** "10/30、10/31 撰寫中 · 冠力": the days still open, and who they are on */
function openSummary(open: DayInfo[], label: string, team: "writer" | "reviewer" | "image") {
  if (open.length === 0) return "都完成了";
  const names = [...new Set(open.map((d) => d.assignees[team]?.userName).filter(Boolean))];
  return `${open.map((d) => md(d.date)).join("、")} ${label}${names.length ? ` · ${names.join("、")}` : ""}`;
}

function StatCard({ label, done, note, href }: { label: string; done: number; note: string; href?: string }) {
  const body = (
    <>
      <span className="text-sm text-st-muted">{label}</span>
      <span className="font-serif text-3xl font-semibold tabular-nums">
        {done} <span className="text-lg text-st-muted">/ 6</span>
      </span>
      <span className="text-sm text-st-ink-2">{note}</span>
    </>
  );
  const cls = `${stCard} flex flex-1 basis-56 flex-col gap-1.5 px-5 py-4`;
  return href ? (
    <Link href={href} className={`${cls} no-underline hover:border-st-accent`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** 牧者首頁: where this week's six devotions stand, and publishing them */
export default function ManagerDashboard({ week }: { week?: string }) {
  const { token } = useAuth();
  const monday = week ?? mondayOf(today());
  const { days, isLoading, error, reload } = useWeek(monday);
  const [publishing, setPublishing] = useState(false);

  const written = days.filter((d) => writingState(d.article) === "submitted");
  const reviewed = days.filter((d) => isReviewed(d.article));
  const withImage = days.filter((d) => d.article?.coverImageUrl);
  const publishable = days.filter((d) => d.article?.status === "approved");
  const published = days.filter((d) => d.article?.status === "published").length;

  async function publishWeek() {
    if (!token || publishable.length === 0) return;
    const missing = days.length - reviewed.length;
    const warning = missing > 0 ? `\n（還有 ${missing} 天沒校閱完，這次不會發布）` : "";
    if (!confirm(`發布本週 ${publishable.length} 篇已校閱的靈修？${warning}`)) return;
    setPublishing(true);
    try {
      await batchPublish(token, publishable.map((d) => d.article!.id));
      await reload();
    } finally {
      setPublishing(false);
    }
  }

  return (
    <StudioPage>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-7 sm:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <WeekNav monday={monday} href={(m) => `/studio?week=${m}`} title={`${monday === mondayOf(today()) ? "本週" : ""} ${weekLabel(monday)}`} />
          <span className="flex-1" />
          {published > 0 && <span className="text-sm text-st-muted">已發布 {published} 篇</span>}
          <button type="button" onClick={publishWeek} disabled={publishing || publishable.length === 0} className={stBtnPrimary}>
            {publishing ? "發布中…" : publishable.length ? `發布本週（${publishable.length}）` : "發布本週"}
          </button>
        </div>

        {error && <p className="text-sm text-st-danger">{error}</p>}

        <section className="flex flex-wrap gap-4" aria-label="本週進度">
          <StatCard
            label="稿件"
            done={written.length}
            note={openSummary(days.filter((d) => !written.includes(d)), "撰寫中", "writer")}
            href="/studio/assign"
          />
          <StatCard
            label="校閱"
            done={reviewed.length}
            note={written.length ? openSummary(written.filter((d) => !reviewed.includes(d)), "待校閱", "reviewer") : "還沒有稿件送出"}
            href={`/studio/review?week=${monday}`}
          />
          <StatCard
            label="圖片"
            done={withImage.length}
            note={openSummary(days.filter((d) => !withImage.includes(d)), "還沒有圖片", "image")}
            href={`/studio/images/${monday}`}
          />
        </section>

        <section className={`${stCard} overflow-x-auto`}>
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-st-line text-left text-xs text-st-muted">
                <th className="px-5 py-3 font-normal">日期</th>
                <th className="px-3 py-3 font-normal">經文</th>
                <th className="px-3 py-3 font-normal">稿件</th>
                <th className="px-3 py-3 font-normal">校閱</th>
                <th className="px-3 py-3 font-normal">圖片</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.date} className="border-b border-st-line/60 last:border-0">
                  <td className="whitespace-nowrap px-5 py-3 tabular-nums">
                    {md(d.date)} {weekday(d.date)}
                  </td>
                  <td className="px-3 py-3">
                    {d.article ? (
                      <Link href={`/studio/articles/${d.article.id}/review`} className="text-st-ink">
                        {d.passage || "（未填經文）"}
                      </Link>
                    ) : (
                      <span className={d.passage ? "" : "text-st-muted"}>{d.passage || "未安排"}</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-2">
                      {writingCell(d)}
                      <span className="text-xs text-st-muted">{d.assignees.writer?.userName}</span>
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-2">
                      {reviewCell(d)}
                      <span className="text-xs text-st-muted">{d.assignees.reviewer?.userName}</span>
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-2">
                      {imageCell(d)}
                      <span className="text-xs text-st-muted">{d.assignees.image?.userName}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {isLoading && <p className="px-5 py-3 text-sm text-st-muted">載入中…</p>}
        </section>
      </main>
    </StudioPage>
  );
}
