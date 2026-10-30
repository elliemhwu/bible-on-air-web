"use client";

import { StudioPage } from "@/components/studio/shell/StudioHeader";
import { getAssignments, getRosters, getStaff, saveAssignments, saveRoster } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { isManager, leadTeams } from "@/lib/roles";
import { stBtnGold, stBtnPrimary, stCard, stSegment, stSegmentItem } from "@/lib/styles";
import type { AssignmentInput, Member, StaffUser, Team } from "@/lib/types";
import { addDays, md, mondayOf, today, weekDays, weekLabel } from "@/lib/week";
import Link from "next/link";
import { useEffect, useState } from "react";

const WEEKS = 8;

const TEAMS: Record<Team, { label: string; name: string; unit: string; role: string; split: boolean }> = {
  writer: { label: "寫作", name: "寫作同工", unit: "每人 3 天（一至三、四至六）", role: "editor", split: true },
  reviewer: { label: "校稿", name: "校稿同工", unit: "每人一週", role: "reviewer", split: false },
  image: { label: "圖片", name: "圖片同工", unit: "每人一週", role: "image_editor", split: false },
};

const chipSelect =
  "appearance-none border-none bg-transparent bg-[length:4px_4px,4px_4px] bg-no-repeat pr-5 text-inherit outline-none [background-image:linear-gradient(45deg,transparent_50%,currentColor_50%),linear-gradient(135deg,currentColor_50%,transparent_50%)] [background-position:calc(100%-7px)_55%,calc(100%-3px)_55%] cursor-pointer";

type Slot = { key: string; label: string; dates: string[] };
/** date → userId (null = nobody), per team */
type DayMap = Record<string, string | null>;

/** "10/26–28", or "10/29–11/1" across a month end */
function span(from: string, to: string): string {
  return from.slice(0, 7) === to.slice(0, 7) ? `${md(from)}–${Number(to.slice(8))}` : `${md(from)}–${md(to)}`;
}

function slotsOf(team: Team, monday: string): Slot[] {
  const days = weekDays(monday);
  if (!TEAMS[team].split) return [{ key: monday, label: "整週", dates: days }];
  return [
    { key: `${monday}-a`, label: `一至三 ${span(days[0], days[2])}`, dates: days.slice(0, 3) },
    { key: `${monday}-b`, label: `四至六 ${span(days[3], days[5])}`, dates: days.slice(3) },
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

/** 分派: deal each team's rota across the coming weeks */
export default function AssignBoard({ from }: { from?: string }) {
  const { token, user } = useAuth();
  const start = from ?? mondayOf(today());
  const mondays = Array.from({ length: WEEKS }, (_, i) => addDays(start, i * 7));
  const end = addDays(mondays[WEEKS - 1], 5);

  const [picked, setTeam] = useState<Team>("writer");
  // Managers schedule every team, a team lead only the teams they lead
  const teams = isManager(user) ? (Object.keys(TEAMS) as Team[]) : leadTeams(user);
  const team = teams.includes(picked) ? picked : (teams[0] ?? "writer");
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [rosters, setRosters] = useState<Record<Team, Member[]>>({ writer: [], reviewer: [], image: [] });
  const [days, setDays] = useState<Record<Team, DayMap>>({ writer: {}, reviewer: {}, image: {} });
  /** Who served last before this range, so the rota continues from them */
  const [lastBefore, setLastBefore] = useState<Record<Team, string | null>>({ writer: null, reviewer: null, image: null });
  const [dirtyTeams, setDirtyTeams] = useState<Set<Team>>(new Set());
  const [dirtyRosters, setDirtyRosters] = useState<Set<Team>>(new Set());
  const [openDays, setOpenDays] = useState<Set<string>>(new Set());
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropOn, setDropOn] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let live = true;
    Promise.all([
      getStaff(token),
      getRosters(token),
      getAssignments(token, addDays(start, -42), addDays(start, WEEKS * 7)),
    ]).then(([people, rs, assigned]) => {
      if (!live) return;
      setStaff(people);
      setRosters(Object.fromEntries(rs.map((r) => [r.team, r.members])) as Record<Team, Member[]>);
      const map: Record<Team, DayMap> = { writer: {}, reviewer: {}, image: {} };
      const before: Record<Team, string | null> = { writer: null, reviewer: null, image: null };
      for (const a of assigned) {
        if (a.date < start) before[a.team] = a.userId;
        else map[a.team][a.date] = a.userId;
      }
      setDays(map);
      setLastBefore(before);
      setDirtyTeams(new Set());
      setDirtyRosters(new Set());
    });
    return () => {
      live = false;
    };
  }, [token, start]);

  const meta = TEAMS[team];
  const roster = rosters[team];
  const map = days[team];
  const nameOf = (id: string | null) =>
    id ? (staff.find((s) => s.id === id)?.name ?? roster.find((m) => m.id === id)?.name ?? "?") : "（未指派）";

  function setTeamDays(next: DayMap) {
    setDays((prev) => ({ ...prev, [team]: next }));
    setDirtyTeams((prev) => new Set(prev).add(team));
  }

  function setRoster(next: Member[]) {
    setRosters((prev) => ({ ...prev, [team]: next }));
    setDirtyRosters((prev) => new Set(prev).add(team));
  }

  function moveMember(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= roster.length) return;
    const next = [...roster];
    [next[i], next[j]] = [next[j], next[i]];
    setRoster(next);
  }

  /** Changing a slot moves every day that followed the slot's person; exceptions stay */
  function setSlot(slot: Slot, userId: string | null) {
    const current = slotPerson(slot, map);
    const next = { ...map };
    for (const d of slot.dates) if (map[d] === current || !map[d]) next[d] = userId;
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
    if (roster.length === 0) return;
    const last = roster.findIndex((m) => m.id === lastBefore[team]);
    let k = last + 1;
    const next: DayMap = {};
    for (const monday of mondays) {
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
          for (const date of weekDays(monday)) items.push({ date, team: t, userId: days[t][date] ?? null });
        }
      }
      if (items.length) await saveAssignments(token, items);
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
        <span className="flex items-center gap-1 text-sm text-st-ink-2">
          <Link href={`/studio/assign?from=${addDays(start, -28)}`} aria-label="往前四週" className="rounded px-1.5 no-underline hover:bg-st-soft">‹</Link>
          {md(start)} – {md(end)} · {meta.unit}
          <Link href={`/studio/assign?from=${addDays(start, 28)}`} aria-label="往後四週" className="rounded px-1.5 no-underline hover:bg-st-soft">›</Link>
        </span>
        <span className="flex-1" />
        {status && <span className="text-sm text-st-muted" aria-live="polite">{status}</span>}
        <button type="button" onClick={autofill} disabled={roster.length === 0} className={stBtnGold}>依名單自動填入</button>
        <button type="button" onClick={save} disabled={saving || !dirty} className={stBtnPrimary}>
          {saving ? "儲存中…" : "儲存"}
        </button>
      </div>

      <div className="flex flex-1 flex-wrap items-stretch">
        <aside className="flex min-w-0 flex-[1_1_220px] flex-col gap-1.5 border-r border-st-line bg-st-sunken px-3.5 py-4 lg:max-w-[260px]">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 px-1.5 pb-1.5">
            <span className="whitespace-nowrap font-medium">{meta.name}</span>
            <span className="whitespace-nowrap text-xs text-st-muted">{roster.length} 人 · 輪流順序</span>
          </div>
          {roster.map((m, i) => (
            <div key={m.id} className="flex items-center gap-1.5 rounded-[10px] border border-st-line bg-st-surface py-1.5 pl-2.5 pr-1.5">
              <span className="w-5 text-xs tabular-nums text-st-muted">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate">{m.name}</span>
              <button type="button" onClick={() => moveMember(i, -1)} aria-label={`${m.name} 往前`} className="h-7 w-7 rounded text-st-muted hover:bg-st-soft">↑</button>
              <button type="button" onClick={() => moveMember(i, 1)} aria-label={`${m.name} 往後`} className="h-7 w-7 rounded text-st-muted hover:bg-st-soft">↓</button>
              <button type="button" onClick={() => setRoster(roster.filter((x) => x.id !== m.id))} aria-label={`從名單移除 ${m.name}`} className="h-7 w-7 rounded text-st-muted hover:bg-st-soft">×</button>
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
        </aside>

        <main className="min-w-0 flex-[999_1_560px] px-4 py-5 sm:px-8">
          <section className={`${stCard} overflow-hidden`}>
            {mondays.map((monday) => (
              <div key={monday} className="grid grid-cols-[120px_minmax(0,1fr)] border-b border-st-bg last:border-0 sm:grid-cols-[140px_minmax(0,1fr)]">
                <div className="flex flex-col gap-0.5 px-4 py-3.5">
                  <span className="whitespace-nowrap font-medium tabular-nums">{weekLabel(monday)}</span>
                </div>
                <div className="flex flex-wrap gap-2.5 px-3 py-2.5">
                  {slotsOf(team, monday).map((slot) => {
                    const person = slotPerson(slot, map);
                    const exceptions = slot.dates.filter((d) => map[d] && map[d] !== person);
                    const open = openDays.has(slot.key);
                    const target = dropOn === slot.key && dragging !== null && dragging !== slot.key;
                    return (
                      <div
                        key={slot.key}
                        onDragOver={(e) => { e.preventDefault(); if (dropOn !== slot.key) setDropOn(slot.key); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const fromSlot = mondays.flatMap((m) => slotsOf(team, m)).find((s) => s.key === dragging);
                          if (fromSlot && fromSlot.key !== slot.key) swapSlots(fromSlot, slot);
                          setDragging(null);
                          setDropOn(null);
                        }}
                        className={`min-w-0 flex-[1_1_220px] rounded-[10px] px-2.5 py-2 ${target ? "border-2 border-dashed border-st-gold bg-st-warm" : "border border-st-line bg-st-sunken"}`}
                      >
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="min-w-16 whitespace-nowrap text-xs text-st-muted">{slot.label}</span>
                          <div
                            draggable
                            onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setDragging(slot.key); }}
                            onDragEnd={() => { setDragging(null); setDropOn(null); }}
                            className={`inline-flex h-8 cursor-grab items-center gap-1.5 rounded-full bg-st-soft px-2.5 ${dragging === slot.key ? "opacity-50" : ""}`}
                          >
                            <span aria-hidden="true" className="text-st-faint">⠿</span>
                            <select
                              aria-label={`${md(slot.dates[0])} 起的${meta.name}`}
                              value={person ?? ""}
                              onChange={(e) => setSlot(slot, e.target.value || null)}
                              className={`${chipSelect} text-sm ${person ? "" : "text-st-muted"}`}
                            >
                              <option value="">（未指派）</option>
                              {options(person).map((m) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
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
                                  <select
                                    aria-label={`${md(d)} 的${meta.name}`}
                                    value={map[d] ?? ""}
                                    onChange={(e) => setTeamDays({ ...map, [d]: e.target.value || null })}
                                    className={chipSelect}
                                  >
                                    <option value="">（未指派）</option>
                                    {options(map[d] ?? null).map((m) => (
                                      <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                  </select>
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
