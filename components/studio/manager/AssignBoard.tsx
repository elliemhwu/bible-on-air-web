"use client";

import { StudioPage } from "@/components/studio/shell/StudioHeader";
import { getAssignments, getRosters, getStaff, saveAssignments, saveRoster } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { isManager, leadTeams } from "@/lib/roles";
import { stBtnGold, stBtnPrimary, stCard, stSegment, stSegmentItem } from "@/lib/styles";
import type { AssignmentInput, Member, StaffUser, Team } from "@/lib/types";
import { addDays, md, mondayOf, mondaysOfYear, today, weekDays, yearWeekLabel } from "@/lib/week";
import Link from "next/link";
import { useEffect, useState, type SelectHTMLAttributes } from "react";

const arrow =
  "flex h-8 w-8 items-center justify-center rounded-lg text-lg text-st-ink-2 no-underline hover:bg-st-sunken hover:text-st-ink";

const EMPTY = (): Record<Team, DayMap> => ({ writer: {}, reviewer: {}, image: {} });

const TEAMS: Record<Team, { label: string; name: string; role: string; split: boolean }> = {
  writer: { label: "寫作", name: "寫作同工", role: "editor", split: true },
  reviewer: { label: "校稿", name: "校稿同工", role: "reviewer", split: false },
  image: { label: "圖片", name: "圖片同工", role: "image_editor", split: false },
};

/** Borderless select with a drawn chevron (the native arrow is hidden) */
function ChipSelect({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative inline-flex items-center">
      <select
        {...props}
        className={`cursor-pointer appearance-none border-none bg-transparent pr-5 text-inherit outline-none ${className}`}
      />
      <svg aria-hidden="true" viewBox="0 0 12 12" className="pointer-events-none absolute right-0.5 h-3 w-3 opacity-60">
        <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

const MIXED = "__mixed";

type Slot = { key: string; label: string; dates: string[] };
/** date → userId (null = nobody), per team */
type DayMap = Record<string, string | null>;

/** "10/26–28", or "10/29–11/1" across a month end */
function span(from: string, to: string): string {
  return from.slice(0, 7) === to.slice(0, 7) ? `${md(from)}–${Number(to.slice(8))}` : `${md(from)}–${md(to)}`;
}

function slotsOf(team: Team, monday: string): Slot[] {
  const days = weekDays(monday);
  // A whole-week slot needs no label: the row already shows the week
  if (!TEAMS[team].split) return [{ key: monday, label: "", dates: days }];
  return [
    { key: `${monday}-a`, label: span(days[0], days[2]), dates: days.slice(0, 3) },
    { key: `${monday}-b`, label: span(days[3], days[5]), dates: days.slice(3) },
  ];
}

/** The person most of the slot's days are on */
function slotPerson(slot: Slot, map: DayMap): string | null {
  const counts = new Map<string, number>();
  for (const d of slot.dates) {
    const id = map[d];
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  let best: string | null = null;
  for (const [id, n] of counts) if (!best || n > counts.get(best)!) best = id;
  return best;
}

/** 分派: deal each team's rota across the weeks of a year */
export default function AssignBoard({ year }: { year: number }) {
  const { token, user } = useAuth();
  const mondays = mondaysOfYear(year);
  const start = mondays[0];
  const end = addDays(mondays[mondays.length - 1], 5);
  const thisWeek = mondayOf(today());
  // 自動填入 deals from this week on, leaving the weeks already served alone
  const fillFrom = thisWeek > start ? thisWeek : start;
  const canFill = fillFrom <= end;

  const [picked, setTeam] = useState<Team>("writer");
  // Managers schedule every team, a team lead only the teams they lead
  const teams = isManager(user) ? (Object.keys(TEAMS) as Team[]) : leadTeams(user);
  const team = teams.includes(picked) ? picked : (teams[0] ?? "writer");
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [rosters, setRosters] = useState<Record<Team, Member[]>>({ writer: [], reviewer: [], image: [] });
  const [days, setDays] = useState<Record<Team, DayMap>>(EMPTY);
  /** As loaded or last saved, so saving sends only the days that changed */
  const [savedDays, setSavedDays] = useState<Record<Team, DayMap>>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [dirtyTeams, setDirtyTeams] = useState<Set<Team>>(new Set());
  const [dirtyRosters, setDirtyRosters] = useState<Set<Team>>(new Set());
  const [openDays, setOpenDays] = useState<Set<string>>(new Set());
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropOn, setDropOn] = useState<string | null>(null);
  const [draggingMember, setDraggingMember] = useState<number | null>(null);
  const [memberDropOn, setMemberDropOn] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let live = true;
    Promise.all([
      getStaff(token),
      getRosters(token),
      getAssignments(token, addDays(start, -42), end),
    ]).then(([people, rs, assigned]) => {
      if (!live) return;
      setStaff(people);
      setRosters(Object.fromEntries(rs.map((r) => [r.team, r.members])) as Record<Team, Member[]>);
      const map = EMPTY();
      for (const a of assigned) map[a.team][a.date] = a.userId;
      setDays(map);
      setSavedDays(map);
      setDirtyTeams(new Set());
      setDirtyRosters(new Set());
      setLoaded(true);
    });
    return () => {
      live = false;
    };
  }, [token, start, end]);

  // Open at this week once the year has loaded
  useEffect(() => {
    if (loaded) document.getElementById("this-week")?.scrollIntoView({ block: "center" });
  }, [loaded, year]);

  const meta = TEAMS[team];
  const roster = rosters[team];
  const map = days[team];
  const nameOf = (id: string | null) =>
    id ? (staff.find((s) => s.id === id)?.name ?? roster.find((m) => m.id === id)?.name ?? "?") : "未指派";

  function setTeamDays(next: DayMap) {
    setDays((prev) => ({ ...prev, [team]: next }));
    setDirtyTeams((prev) => new Set(prev).add(team));
  }

  function setRoster(next: Member[]) {
    setRosters((prev) => ({ ...prev, [team]: next }));
    setDirtyRosters((prev) => new Set(prev).add(team));
  }

  /** Drop the dragged roster member at position `to` */
  function moveMember(from: number, to: number) {
    if (from === to) return;
    const next = [...roster];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    setRoster(next);
  }

  /** Picking a person for the slot puts them on every day of it, single-day changes included */
  function setSlot(slot: Slot, userId: string | null) {
    const next = { ...map };
    for (const d of slot.dates) next[d] = userId;
    setTeamDays(next);
  }

  function swapSlots(a: Slot, b: Slot) {
    const next = { ...map };
    a.dates.forEach((d, i) => {
      next[d] = map[b.dates[i]] ?? null;
      next[b.dates[i]] = map[d] ?? null;
    });
    setTeamDays(next);
  }

  function autofill() {
    if (roster.length === 0 || !canFill) return;
    // Continue the rota from whoever served last before this week
    const before = Object.keys(map).filter((d) => d < fillFrom && map[d]).sort();
    const lastId = before.length ? map[before[before.length - 1]] : null;
    let k = roster.findIndex((m) => m.id === lastId) + 1;
    const next: DayMap = Object.fromEntries(Object.entries(map).filter(([d]) => d < fillFrom));
    for (const monday of mondays.filter((m) => m >= fillFrom)) {
      for (const slot of slotsOf(team, monday)) {
        const id = roster[k % roster.length].id;
        for (const d of slot.dates) next[d] = id;
        k += 1;
      }
    }
    setTeamDays(next);
    setOpenDays(new Set());
  }

  async function save() {
    if (!token) return;
    setSaving(true);
    setStatus(null);
    try {
      for (const t of dirtyRosters) await saveRoster(token, t, rosters[t].map((m) => m.id));
      const items: AssignmentInput[] = [];
      for (const t of dirtyTeams) {
        for (const monday of mondays) {
          for (const date of weekDays(monday)) {
            const userId = days[t][date] ?? null;
            if (userId !== (savedDays[t][date] ?? null)) items.push({ date, team: t, userId });
          }
        }
      }
      if (items.length) await saveAssignments(token, items);
      setSavedDays(days);
      setDirtyTeams(new Set());
      setDirtyRosters(new Set());
      setStatus("已儲存");
    } catch {
      setStatus("儲存失敗，請再試一次");
    } finally {
      setSaving(false);
    }
  }

  const dirty = dirtyTeams.size > 0 || dirtyRosters.size > 0;
  const candidates = staff.filter((s) => !roster.some((m) => m.id === s.id));
  const options = (current: string | null) => {
    const list = [...roster];
    if (current && !list.some((m) => m.id === current)) list.push({ id: current, name: nameOf(current) });
    return list;
  };

  return (
    <StudioPage>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-b border-st-line bg-st-surface px-4 py-3.5 sm:px-8">
        <div role="tablist" aria-label="同工組" className={stSegment}>
          {teams.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={team === t}
              onClick={() => { setTeam(t); setAdding(false); }}
              className={stSegmentItem(team === t)}
            >
              {TEAMS[t].label}
            </button>
          ))}
        </div>
        <div className="flex items-center">
          <Link href={`/studio/assign?year=${year - 1}`} aria-label="上一年" className={arrow}>‹</Link>
          <span className="px-1 font-serif text-lg font-semibold tabular-nums">{year} 年</span>
          <Link href={`/studio/assign?year=${year + 1}`} aria-label="下一年" className={arrow}>›</Link>
        </div>
        <span className="flex-1" />
        {status && <span className="text-sm text-st-muted" aria-live="polite">{status}</span>}
        <button
          type="button"
          onClick={autofill}
          disabled={roster.length === 0 || !canFill}
          title={fillFrom > start ? "本週以前的分派不會變動" : undefined}
          className={stBtnGold}
        >
          {fillFrom > start ? "從本週起自動填入" : "依名單自動填入"}
        </button>
        <button type="button" onClick={save} disabled={saving || !dirty} className={stBtnPrimary}>
          {saving ? "儲存中…" : "儲存"}
        </button>
      </div>

      <div className="flex flex-1 flex-wrap items-stretch">
        <aside className="min-w-0 flex-[1_1_220px] border-r border-st-line bg-st-sunken px-3.5 py-4 lg:max-w-[260px]">
          <div className="flex flex-col gap-1.5 lg:sticky lg:top-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 px-1.5 pb-1.5">
            <span className="whitespace-nowrap font-medium">{meta.name}</span>
            <span className="whitespace-nowrap text-xs text-st-muted">{roster.length} 人 · 輪流順序</span>
          </div>
          {roster.map((m, i) => (
            <div
              key={m.id}
              draggable
              onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setDraggingMember(i); }}
              onDragOver={(e) => { e.preventDefault(); if (memberDropOn !== i) setMemberDropOn(i); }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggingMember !== null) moveMember(draggingMember, i);
                setDraggingMember(null);
                setMemberDropOn(null);
              }}
              onDragEnd={() => { setDraggingMember(null); setMemberDropOn(null); }}
              className={`flex cursor-grab items-center gap-1.5 rounded-[10px] border bg-st-surface py-1.5 pl-1.5 pr-1.5 ${draggingMember === i ? "opacity-50" : ""} ${memberDropOn === i && draggingMember !== null && draggingMember !== i ? "border-st-gold" : "border-st-line"}`}
            >
              <span aria-hidden="true" className="text-xs text-st-faint">⠿</span>
              <span className="w-4 text-xs tabular-nums text-st-muted">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm">{m.name}</span>
              <button type="button" onClick={() => setRoster(roster.filter((x) => x.id !== m.id))} aria-label={`從名單移除 ${m.name}`} className="h-5 w-5 rounded text-xs leading-none text-st-muted hover:bg-st-soft">×</button>
            </div>
          ))}
          {adding ? (
            <select
              autoFocus
              aria-label="選擇要加入的同工"
              defaultValue=""
              onChange={(e) => {
                const s = staff.find((x) => x.id === e.target.value);
                if (s) setRoster([...roster, { id: s.id, name: s.name }]);
                setAdding(false);
              }}
              onBlur={() => setAdding(false)}
              className="h-9 rounded-[10px] border border-st-line-strong bg-st-surface px-2 text-sm"
            >
              <option value="" disabled>選擇同工…</option>
              {candidates
                .sort((a, b) => Number(b.roles.includes(meta.role)) - Number(a.roles.includes(meta.role)))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.roles.includes(meta.role) ? "" : "（沒有此角色）"}
                  </option>
                ))}
            </select>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              disabled={candidates.length === 0}
              className="mt-1 h-9 rounded-[10px] border border-dashed border-st-line-strong text-sm text-st-ink-2 disabled:opacity-50"
            >
              ＋ 新增同工
            </button>
          )}
          {roster.length === 0 && (
            <p className="px-1.5 text-xs text-st-muted">先把同工加進名單，就能依序自動填入。</p>
          )}
          </div>
        </aside>

        <main className="min-w-0 flex-[999_1_560px] px-4 py-5 sm:px-8">
          <section className={`${stCard} overflow-hidden`}>
            {!loaded && <p className="m-0 px-4 py-8 text-center text-sm text-st-muted">載入中…</p>}
            {loaded && mondays.map((monday, w) => (
              <div
                key={monday}
                id={monday === thisWeek ? "this-week" : undefined}
                className={`grid grid-cols-[120px_minmax(0,1fr)] border-b border-st-bg last:border-0 sm:grid-cols-[140px_minmax(0,1fr)] ${monday === thisWeek ? "bg-st-warm" : ""}`}
              >
                <div className="flex flex-col gap-0.5 px-4 py-3.5">
                  <span className="text-xs text-st-muted">
                    第 {w + 1} 週{monday === thisWeek && <span className="ml-1 text-st-gold-ink">本週</span>}
                  </span>
                  <span className="whitespace-nowrap font-medium tabular-nums">{yearWeekLabel(monday)}</span>
                </div>
                <div className="flex flex-wrap gap-2.5 px-3 py-2.5">
                  {slotsOf(team, monday).map((slot) => {
                    const person = slotPerson(slot, map);
                    const exceptions = slot.dates.filter((d) => map[d] && map[d] !== person);
                    // Everyone on the slot's days, in date order (single-day changes make it more than one)
                    const people = [...new Set(slot.dates.map((d) => map[d] ?? null))];
                    const mixed = people.length > 1;
                    const open = openDays.has(slot.key);
                    const target = dropOn === slot.key && dragging !== null && dragging !== slot.key;
                    return (
                      <div
                        key={slot.key}
                        id={`slot-${slot.key}`}
                        onDragOver={(e) => { e.preventDefault(); if (dropOn !== slot.key) setDropOn(slot.key); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const fromSlot = mondays.flatMap((m) => slotsOf(team, m)).find((s) => s.key === dragging);
                          if (fromSlot && fromSlot.key !== slot.key) swapSlots(fromSlot, slot);
                          setDragging(null);
                          setDropOn(null);
                        }}
                        className={`min-w-0 flex-[1_1_220px] rounded-[10px] py-2 pl-1.5 pr-2.5 ${dragging === slot.key ? "opacity-50" : ""} ${target ? "border-2 border-dashed border-st-gold bg-st-warm" : "border border-st-line bg-st-sunken"}`}
                      >
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = "move";
                              const block = document.getElementById(`slot-${slot.key}`);
                              if (block) e.dataTransfer.setDragImage(block, 12, 12);
                              setDragging(slot.key);
                            }}
                            onDragEnd={() => { setDragging(null); setDropOn(null); }}
                            title="拖曳到其他時段即可對調"
                            aria-hidden="true"
                            className="cursor-grab px-0.5 text-xs text-st-faint"
                          >
                            ⠿
                          </span>
                          {slot.label && <span className="min-w-16 whitespace-nowrap text-xs text-st-muted">{slot.label}</span>}
                          <div
                            className={`inline-flex h-8 items-center rounded-full px-2.5 ${person || mixed ? "bg-st-soft" : "border border-dashed border-st-line-strong"}`}
                          >
                            <ChipSelect
                              aria-label={`${md(slot.dates[0])} 起的${meta.name}`}
                              value={mixed ? MIXED : (person ?? "")}
                              onChange={(e) => setSlot(slot, e.target.value || null)}
                              className={`text-sm ${person || mixed ? "" : "text-st-muted"}`}
                            >
                              {mixed && (
                                <option value={MIXED} disabled hidden>
                                  {people.map(nameOf).join("、")}
                                </option>
                              )}
                              <option value="">未指派</option>
                              {options(person).map((m) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </ChipSelect>
                          </div>
                          {meta.split && (
                            <button
                              type="button"
                              onClick={() => {
                                const next = new Set(openDays);
                                if (open) next.delete(slot.key);
                                else next.add(slot.key);
                                setOpenDays(next);
                              }}
                              aria-expanded={open}
                              className="h-7 whitespace-nowrap rounded-lg px-2 text-xs text-st-accent hover:bg-st-soft"
                            >
                              單日調整{exceptions.length ? `（${exceptions.length}）` : ""}
                            </button>
                          )}
                        </div>
                        {open && (
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {slot.dates.map((d) => {
                              const changed = !!map[d] && map[d] !== person;
                              return (
                                <label
                                  key={d}
                                  className={`inline-flex h-[30px] items-center gap-1.5 rounded-lg border px-2.5 text-[13px] ${changed ? "border-st-gold bg-st-warm" : "border-st-line bg-st-surface"}`}
                                >
                                  <span>{md(d)}</span>
                                  <ChipSelect
                                    aria-label={`${md(d)} 的${meta.name}`}
                                    value={map[d] ?? ""}
                                    onChange={(e) => setTeamDays({ ...map, [d]: e.target.value || null })}
                                  >
                                    <option value="">未指派</option>
                                    {options(map[d] ?? null).map((m) => (
                                      <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                  </ChipSelect>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        </main>
      </div>
    </StudioPage>
  );
}
