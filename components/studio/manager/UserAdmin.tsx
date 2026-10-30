"use client";

import { StudioPage } from "@/components/studio/shell/StudioHeader";
import { apiError, getUsers, inviteUser, reinviteUser, updateUser } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { isManager, leadTeams } from "@/lib/roles";
import { stBtnPrimary, stBtnSecondary, stCard, stInput } from "@/lib/styles";
import type { ManagedUser, Team, TeamLevel, TeamRoles, UserChanges, UserStatus } from "@/lib/types";
import { useEffect, useState } from "react";

const TEAMS: { id: Team; label: string; short: string; member: string; task: string }[] = [
  { id: "writer", label: "寫作組", short: "寫作", member: "寫作同工", task: "撰寫被分派的靈修稿" },
  { id: "reviewer", label: "校稿組", short: "校稿", member: "校稿同工", task: "校閱、直接修改稿件" },
  { id: "image", label: "圖片組", short: "圖片", member: "圖片同工", task: "上傳本週圖片" },
];

const STATUS: Record<UserStatus, { label: string; cls: string }> = {
  active: { label: "已加入", cls: "bg-st-sage-soft text-st-sage-ink" },
  invited: { label: "邀請中", cls: "bg-st-gold-soft text-st-gold-soft-ink" },
  disabled: { label: "已停用", cls: "bg-st-soft text-st-muted" },
};

const LEVELS: [TeamLevel | null, string][] = [
  [null, "無"],
  ["member", "同工"],
  ["lead", "負責人"],
];

type Draft = { name: string; email: string; admin: boolean; teams: TeamRoles };
const EMPTY_DRAFT: Draft = { name: "", email: "", admin: false, teams: {} };

/** What a person can do, in the words of the page */
function permissions(user: { admin: boolean; teams: TeamRoles }) {
  if (user.admin) {
    return [
      { title: "全部功能", detail: "進度安排、分派、校閱、圖片" },
      { title: "同工管理", detail: "新增同工、設定所有人的權限" },
    ];
  }
  const out: { title: string; detail: string }[] = [];
  const leads = TEAMS.filter((t) => user.teams[t.id] === "lead");
  if (leads.length) {
    const names = leads.map((t) => t.label).join("、");
    out.push({ title: "分派", detail: `排定${names}的輪值` });
    out.push({ title: "同工管理", detail: `邀請、移除${names}的同工` });
  }
  for (const t of TEAMS) if (user.teams[t.id]) out.push({ title: t.member, detail: t.task });
  return out;
}

function Avatar({ name, large }: { name: string; large?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex flex-none items-center justify-center rounded-full bg-st-soft text-st-ink ${large ? "h-11 w-11 text-base" : "h-8 w-8 text-[13px]"}`}
    >
      {name.slice(0, 1)}
    </span>
  );
}

/** Shown when the invitation email could not be sent: the link is passed on by hand */
function InviteLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/invite/${token}`;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-st-gold bg-st-warm p-3 text-sm">
      <span className="font-medium">邀請信沒有寄出</span>
      <span className="text-st-ink-2">伺服器還沒設定寄信，請複製這個連結傳給對方。14 天內有效，用過一次就失效。</span>
      <div className="flex gap-2">
        <input readOnly value={url} aria-label="邀請連結" onFocus={(e) => e.target.select()} className={`${stInput} min-w-0 flex-1 text-xs`} />
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
          className={stBtnSecondary}
        >
          {copied ? "已複製" : "複製"}
        </button>
      </div>
    </div>
  );
}

/** 同工與權限: who serves in which team, and what they may do */
export default function UserAdmin() {
  const { token, user: me } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "new">("view");
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [query, setQuery] = useState("");
  const [invite, setInvite] = useState<{ userId: string; email: string; token: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    getUsers(token)
      .then(setUsers)
      .catch((e) => setError(apiError(e, "無法載入同工名單")));
  }, [token]);

  const manager = isManager(me);
  const led = leadTeams(me);
  const canTeam = (t: Team) => manager || led.includes(t);
  const selected = users.find((u) => u.id === selectedId) ?? null;
  const isSelf = selected?.id === me?.id;
  // A lead may not change a manager's account at all
  const locked = mode === "view" && !!selected && !manager && selected.admin;

  const q = query.trim().toLowerCase();
  const matches = (u: ManagedUser) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  const groups = [
    { id: null as Team | null, label: "牧者", members: users.filter((u) => u.admin) },
    ...TEAMS.map((t) => ({
      id: t.id as Team | null,
      label: t.label,
      members: users
        .filter((u) => u.teams[t.id])
        .sort((a, b) => Number(b.teams[t.id] === "lead") - Number(a.teams[t.id] === "lead")),
    })),
    { id: null, label: "尚未分組", members: users.filter((u) => !u.admin && !TEAMS.some((t) => u.teams[t.id])) },
  ]
    .map((g) => ({ ...g, shown: g.members.filter(matches) }))
    .filter((g) => g.shown.length > 0);

  /** Saves a change at once ("角色變更會立即生效") */
  async function change(changes: UserChanges) {
    if (!token || !selected) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await updateUser(token, selected.id, changes);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (e) {
      setError(apiError(e, "儲存失敗，請再試一次"));
    } finally {
      setBusy(false);
    }
  }

  function setTeam(t: Team, level: TeamLevel | null) {
    if (mode === "new") {
      const teams = { ...draft.teams };
      if (level) teams[t] = level;
      else delete teams[t];
      setDraft({ ...draft, teams });
    } else {
      change({ teams: { ...selected!.teams, [t]: level } });
    }
  }

  async function sendInvite() {
    if (!token) return;
    if (!draft.name.trim() || !draft.email.trim()) {
      setError("請填寫名字和 Email。");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await inviteUser(token, { ...draft, name: draft.name.trim(), email: draft.email.trim() });
      setUsers((prev) => [...prev, res.user]);
      setSelectedId(res.user.id);
      setInvite({ userId: res.user.id, email: res.user.email, token: res.inviteToken });
      setMode("view");
      setQuery("");
    } catch (e) {
      setError(apiError(e, "邀請失敗，請再試一次"));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (!token || !selected) return;
    setBusy(true);
    try {
      const res = await reinviteUser(token, selected.id);
      setInvite({ userId: selected.id, email: selected.email, token: res.inviteToken });
    } catch (e) {
      setError(apiError(e, "無法產生新的邀請連結"));
    } finally {
      setBusy(false);
    }
  }

  const current = mode === "new" ? draft : selected;
  const active = users.filter((u) => u.status === "active").length;
  const invited = users.filter((u) => u.status === "invited").length;
  const perms = current ? permissions(current) : [];

  return (
    <StudioPage>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-st-line bg-st-surface px-4 py-4 sm:px-8">
        <h1 className="m-0 font-serif text-2xl font-semibold">同工與權限</h1>
        <span className="text-sm text-st-muted">{active} 位已加入 · {invited} 位邀請中</span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => {
            setMode("new");
            setDraft(EMPTY_DRAFT);
            setError(null);
            setInvite(null);
          }}
          className={stBtnPrimary}
        >
          ＋ 新增同工
        </button>
      </div>

      <div className="flex flex-1 flex-wrap items-stretch">
        <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-4 px-4 py-5 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-st-muted">同一位同工在多個小組時，會在每個小組都出現。</span>
            <label htmlFor="user-search" className="sr-only">搜尋同工</label>
            <input
              id="user-search"
              type="search"
              placeholder="搜尋名字或 Email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`${stInput} w-60`}
            />
          </div>
          {groups.map((g) => (
            <section key={g.label} aria-label={g.label} className={`${stCard} overflow-hidden`}>
              <div className="flex items-baseline gap-2 border-b border-st-line bg-st-sunken px-4 py-2.5">
                <h2 className="m-0 text-sm font-medium">{g.label}</h2>
                <span className="text-xs text-st-muted">{g.members.filter((u) => u.status !== "disabled").length} 人</span>
              </div>
              {g.shown.map((u) => {
                const on = mode === "view" && u.id === selectedId;
                const lead = g.id && u.teams[g.id] === "lead";
                const others = TEAMS.filter((t) => t.id !== g.id && u.teams[t.id]);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(u.id);
                      setMode("view");
                      setError(null);
                      if (invite?.userId !== u.id) setInvite(null);
                    }}
                    aria-pressed={on}
                    className={`grid w-full grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_auto] items-center gap-3 border-b border-st-bg px-4 py-3 text-left last:border-0 ${on ? "bg-st-soft" : "hover:bg-st-sunken"} ${u.status === "disabled" ? "opacity-60" : ""}`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar name={u.name} />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">{u.name}{u.id === me?.id ? "（你）" : ""}</span>
                        <span className="truncate text-xs text-st-muted">{u.email}</span>
                      </span>
                    </span>
                    <span className="flex flex-wrap gap-1.5">
                      {lead && <span className="rounded-full bg-st-primary px-2 py-0.5 text-xs text-st-on-primary">負責人</span>}
                      {(g.id ? others : TEAMS.filter((t) => u.teams[t.id])).map((t) => (
                        <span key={t.id} className="rounded-full bg-st-soft px-2 py-0.5 text-xs text-st-ink-2">
                          {t.short}{!g.id && u.teams[t.id] === "lead" ? "・負責人" : ""}
                        </span>
                      ))}
                    </span>
                    <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs ${STATUS[u.status].cls}`}>{STATUS[u.status].label}</span>
                  </button>
                );
              })}
            </section>
          ))}
          {groups.length === 0 && <p className="text-sm text-st-muted">{users.length ? "沒有符合的同工" : "載入中…"}</p>}
        </main>

        <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-5 border-l border-st-line bg-st-surface px-5 py-6 lg:max-w-[400px]">
          {!current ? (
            <p className="m-0 text-sm text-st-muted">選一位同工，查看和調整他的小組與權限。</p>
          ) : (
            <>
              {mode === "new" ? (
                <div className="flex flex-col gap-3">
                  <div>
                    <h2 className="m-0 text-lg font-semibold">新增同工</h2>
                    <span className="text-sm text-st-muted">寄出邀請後，對方點信中的連結設定密碼就能登入。</span>
                  </div>
                  <label className="flex flex-col gap-1 text-sm">
                    名字
                    <input id="new-name" type="text" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={stInput} />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    Email
                    <input id="new-email" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className={stInput} />
                  </label>
                </div>
              ) : (
                selected && (
                  <div className="flex items-center gap-3">
                    <Avatar name={selected.name} large />
                    <div className="min-w-0 flex-1">
                      <h2 className="m-0 truncate text-lg font-semibold">{selected.name}</h2>
                      <div className="truncate text-sm text-st-muted">{selected.email}</div>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs ${STATUS[selected.status].cls}`}>{STATUS[selected.status].label}</span>
                  </div>
                )
              )}

              <section aria-label="角色" className="flex flex-col gap-2.5">
                <div className="text-xs font-medium tracking-wider text-st-gold-ink">小組與角色</div>
                {TEAMS.map((t) => {
                  const level = current.teams[t.id] ?? null;
                  const editable = !locked && canTeam(t.id) && !busy;
                  return (
                    <div key={t.id} className="flex items-center justify-between gap-3">
                      <span className="text-sm">{t.label}</span>
                      <div role="group" aria-label={`${t.label}的角色`} className="inline-flex rounded-[10px] bg-st-bg p-[3px]">
                        {LEVELS.map(([value, label]) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setTeam(t.id, value)}
                            aria-pressed={level === value}
                            disabled={!editable || (value === "lead" && !manager)}
                            className={`rounded-lg px-3 py-1 text-sm transition disabled:cursor-not-allowed ${level === value ? "bg-st-surface font-medium text-st-ink shadow-sm" : "text-st-ink-2 enabled:hover:text-st-ink disabled:opacity-50"}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div className="mt-1 flex items-center justify-between gap-3 border-t border-st-line pt-3">
                  <span className="flex flex-col">
                    <span className="text-sm">牧者（管理者）</span>
                    <span className="text-xs text-st-muted">
                      {isSelf && mode === "view" ? "不能移除自己的管理者權限" : manager ? "可使用所有功能，並管理同工權限" : "只有牧者可以設定"}
                    </span>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={current.admin}
                    aria-label="牧者（管理者）"
                    disabled={!manager || (isSelf && mode === "view") || busy}
                    onClick={() => (mode === "new" ? setDraft({ ...draft, admin: !draft.admin }) : change({ admin: !current.admin }))}
                    className={`relative h-[26px] w-11 flex-none rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 ${current.admin ? "bg-st-primary" : "bg-st-line-strong"}`}
                  >
                    <span className={`absolute top-[3px] h-5 w-5 rounded-full bg-white transition-all ${current.admin ? "left-[21px]" : "left-[3px]"}`} />
                  </button>
                </div>
              </section>

              <section aria-label="可以使用的功能" className="flex flex-col gap-2">
                <div className="text-xs font-medium tracking-wider text-st-gold-ink">可以使用的功能</div>
                {perms.map((p) => (
                  <div key={p.title} className="flex items-start gap-2 text-sm">
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mt-1 flex-none text-st-sage-ink"><path d="M5 12l5 5L20 7" /></svg>
                    <span><span className="font-medium">{p.title}</span><span className="text-st-ink-2">：{p.detail}</span></span>
                  </div>
                ))}
                {perms.length === 0 && <span className="text-sm text-st-muted">還沒有指派任何小組。</span>}
              </section>

              {invite && mode === "view" && invite.userId === selected?.id &&
                (invite.token ? (
                  <InviteLink token={invite.token} />
                ) : (
                  <p role="status" className="m-0 rounded-xl bg-st-sage-soft px-3 py-2.5 text-sm text-st-sage-ink">
                    已寄出邀請信到 {invite.email}，14 天內有效。
                  </p>
                ))}
              {error && <p role="alert" className="m-0 text-sm text-st-danger">{error}</p>}

              {mode === "new" ? (
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => { setMode("view"); setError(null); }} className={stBtnSecondary}>取消</button>
                  <button type="button" onClick={sendInvite} disabled={busy} className={stBtnPrimary}>{busy ? "建立中…" : "寄出邀請"}</button>
                </div>
              ) : (
                selected && (
                  <div className="mt-auto flex flex-col gap-3 border-t border-st-line pt-4">
                    <span className="text-sm text-st-muted">
                      {isSelf
                        ? "這是你的帳號。"
                        : selected.status === "disabled"
                          ? "停用後不能登入，也不會出現在分派名單。"
                          : "角色變更會立即生效，並更新分派名單。"}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selected.status === "invited" && !locked && (
                        <button type="button" onClick={resend} disabled={busy} className={stBtnSecondary}>
                          {invite?.userId === selected.id ? "已重新寄出" : "重新寄送邀請"}
                        </button>
                      )}
                      {manager && !isSelf && (
                        <button
                          type="button"
                          onClick={() => {
                            const disabling = selected.status !== "disabled";
                            if (disabling && !confirm(`停用 ${selected.name} 的帳號？他將不能登入，也不會出現在分派名單。`)) return;
                            change({ status: disabling ? "disabled" : "active" });
                          }}
                          disabled={busy}
                          className={selected.status === "disabled" ? stBtnSecondary : `${stBtnSecondary} text-st-danger`}
                        >
                          {selected.status === "disabled" ? "重新啟用帳號" : "停用帳號"}
                        </button>
                      )}
                    </div>
                  </div>
                )
              )}
            </>
          )}
        </aside>
      </div>
    </StudioPage>
  );
}
