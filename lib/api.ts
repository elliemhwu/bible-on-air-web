import { apiClient } from "@/lib/axios";
import type {
  Article,
  ArticleComment,
  InviteResult,
  ManagedUser,
  UserChanges,
  Assignment,
  AssignmentInput,
  NoteInput,
  Roster,
  StaffUser,
  Team,
  WeekPlan,
  WeekPlanInput,
  WritingNote,
  ArticleQuery,
  ArticleSummary,
  ArticleTemplate,
  AuthUser,
  BibleBook,
  BlockInput,
  CreateArticleData,
  LegacyMonth,
  LegacyMonthStatus,
  LegacySyncResult,
  LoginResponse,
  Publication,
  PaginatedResponse,
  UpdateArticleData,
  UpdateBlockData,
  VerseResultResponse,
} from "@/lib/types";
import { isAxiosError } from "axios";

const PUB = "bible-on-air";

function authHeaders(token?: string | null) {
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

/** Without a token only published articles are returned. */
export async function getArticles(
  query?: ArticleQuery,
  token?: string | null,
): Promise<PaginatedResponse<ArticleSummary>> {
  const { data } = await apiClient.get<PaginatedResponse<ArticleSummary>>(
    `/magazines/${PUB}/articles`,
    { params: query, headers: authHeaders(token) },
  );
  return data;
}

/** Dates (YYYY-MM-DD, newest first) that have a published article. */
export async function getArticleDates(): Promise<string[]> {
  const { data } = await apiClient.get<string[]>(
    `/magazines/${PUB}/articles/dates`,
  );
  return data;
}

/** Published article for a date; resolves to null when there is none. */
export async function getArticle(date: string): Promise<Article | null> {
  try {
    const { data } = await apiClient.get<Article>(
      `/magazines/${PUB}/articles/${date}`,
    );
    return data;
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === 404) return null;
    throw e;
  }
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  try {
    const { data } = await apiClient.post<LoginResponse>("/auth/login", {
      email,
      password,
    });
    return data;
  } catch {
    throw new Error("登入失敗，請確認帳號密碼");
  }
}

export async function getMe(token: string): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>("/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function getArticleTemplates(
  token: string,
): Promise<ArticleTemplate[]> {
  const { data } = await apiClient.get<ArticleTemplate[]>(
    "/article-templates?publicationUid=bible-on-air",
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return data;
}

let bibleBooksPromise: Promise<BibleBook[]> | null = null;

export function getBibleBooks(): Promise<BibleBook[]> {
  if (!bibleBooksPromise) {
    bibleBooksPromise = apiClient
      .get<BibleBook[]>("/bible/books")
      .then(({ data }) => data);
  }
  return bibleBooksPromise;
}

export async function lookupVerses(ref: string): Promise<VerseResultResponse> {
  const { data } = await apiClient.get<VerseResultResponse>("/bible/verses", {
    params: { ref },
  });
  return data;
}

export async function createArticle(
  token: string,
  payload: CreateArticleData,
): Promise<ArticleSummary> {
  const { data } = await apiClient.post<ArticleSummary>(
    `/magazines/${PUB}/articles`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return data;
}

export async function getArticleById(
  token: string,
  id: string,
): Promise<Article> {
  const { data } = await apiClient.get<Article>(
    `/magazines/${PUB}/articles/${id}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return data;
}

export async function updateArticle(
  token: string,
  date: string,
  payload: UpdateArticleData,
): Promise<ArticleSummary> {
  const { data } = await apiClient.patch<ArticleSummary>(
    `/magazines/${PUB}/articles/${date}`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return data;
}

export async function uploadImage(
  token: string,
  file: File,
): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<{ url: string }>("/uploads/images", form, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });
  return data.url;
}

export async function setArticleCoverImage(
  token: string,
  date: string,
  coverImageUrl: string,
): Promise<void> {
  await updateArticle(token, date, { coverImageUrl });
}

const PUB_ARTICLES = `/magazines/${PUB}/articles`;

export async function batchSubmit(
  token: string,
  ids: string[],
): Promise<ArticleSummary[]> {
  const { data } = await apiClient.post<ArticleSummary[]>(
    `${PUB_ARTICLES}/batch-submit`,
    { ids },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return data;
}

export async function batchReview(
  token: string,
  ids: string[],
): Promise<ArticleSummary[]> {
  const { data } = await apiClient.post<ArticleSummary[]>(
    `${PUB_ARTICLES}/batch-review`,
    { ids },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return data;
}

export async function batchPublish(
  token: string,
  ids: string[],
): Promise<ArticleSummary[]> {
  const { data } = await apiClient.post<ArticleSummary[]>(
    `${PUB_ARTICLES}/batch-publish`,
    { ids },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return data;
}

export async function batchUnpublish(
  token: string,
  ids: string[],
): Promise<ArticleSummary[]> {
  const { data } = await apiClient.post<ArticleSummary[]>(
    `${PUB_ARTICLES}/batch-unpublish`,
    { ids },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return data;
}

export async function updateBlock(
  token: string,
  date: string,
  blockId: string,
  payload: UpdateBlockData,
): Promise<void> {
  await apiClient.patch(
    `/magazines/${PUB}/articles/${date}/blocks/${blockId}`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } },
  );
}

/** Save the full block list: add, remove, reorder and rename blocks at once. */
export async function replaceBlocks(
  token: string,
  date: string,
  blocks: BlockInput[],
): Promise<void> {
  await apiClient.put(
    `${PUB_ARTICLES}/${date}/blocks`,
    { blocks },
    { headers: authHeaders(token) },
  );
}

// ── Legacy Google Site sync ───────────────────────────────────────────────

const LEGACY = `/magazines/${PUB}/legacy-sync`;

export async function getLegacyMonths(token: string): Promise<LegacyMonth[]> {
  const { data } = await apiClient.get<LegacyMonth[]>(`${LEGACY}/months`, {
    headers: authHeaders(token),
  });
  return data;
}

export async function getLegacyMonthStatus(
  token: string,
  month: string,
  refresh = false,
): Promise<LegacyMonthStatus> {
  const { data } = await apiClient.get<LegacyMonthStatus>(
    `${LEGACY}/months/${month}`,
    { params: refresh ? { refresh: true } : undefined, headers: authHeaders(token) },
  );
  return data;
}

export async function syncLegacyDates(
  token: string,
  dates: string[],
): Promise<LegacySyncResult[]> {
  const { data } = await apiClient.post<LegacySyncResult[]>(
    LEGACY,
    { dates },
    { headers: authHeaders(token) },
  );
  return data;
}

// ── Publication (About page) ──────────────────────────────────────────────

export async function getPublication(): Promise<Publication> {
  const { data } = await apiClient.get<Publication>(`/publications/${PUB}`);
  return data;
}

export async function updatePublication(
  token: string,
  payload: { summary?: string; about?: string },
): Promise<Publication> {
  const { data } = await apiClient.patch<Publication>(
    `/publications/${PUB}`,
    payload,
    { headers: authHeaders(token) },
  );
  return data;
}

// ── Planning & assignments ────────────────────────────────────────────────

const MAG = `/magazines/${PUB}`;

/** Week plans whose Monday falls in [from, to] */
export async function getPlans(token: string, from: string, to: string): Promise<WeekPlan[]> {
  const { data } = await apiClient.get<WeekPlan[]>(`${MAG}/plans`, {
    params: { from, to },
    headers: authHeaders(token),
  });
  return data;
}

export async function savePlan(token: string, weekStart: string, plan: WeekPlanInput): Promise<WeekPlan> {
  const { data } = await apiClient.put<WeekPlan>(`${MAG}/plans/${weekStart}`, plan, {
    headers: authHeaders(token),
  });
  return data;
}

export async function getStaff(token: string): Promise<StaffUser[]> {
  const { data } = await apiClient.get<StaffUser[]>(`${MAG}/staff`, { headers: authHeaders(token) });
  return data;
}

export async function getRosters(token: string): Promise<Roster[]> {
  const { data } = await apiClient.get<Roster[]>(`${MAG}/rosters`, { headers: authHeaders(token) });
  return data;
}

export async function saveRoster(token: string, team: Team, userIds: string[]): Promise<Roster> {
  const { data } = await apiClient.put<Roster>(`${MAG}/rosters/${team}`, { userIds }, {
    headers: authHeaders(token),
  });
  return data;
}

/** Assignments in [from, to]; pass `userId` for one person's only */
export async function getAssignments(
  token: string,
  from: string,
  to: string,
  userId?: string,
): Promise<Assignment[]> {
  const { data } = await apiClient.get<Assignment[]>(`${MAG}/assignments`, {
    params: { from, to, ...(userId && { userId }) },
    headers: authHeaders(token),
  });
  return data;
}

export async function saveAssignments(token: string, items: AssignmentInput[]): Promise<Assignment[]> {
  const { data } = await apiClient.put<Assignment[]>(`${MAG}/assignments`, { items }, {
    headers: authHeaders(token),
  });
  return data;
}

export async function getNotes(token: string, date: string): Promise<WritingNote[]> {
  const { data } = await apiClient.get<WritingNote[]>(`${MAG}/notes/${date}`, {
    headers: authHeaders(token),
  });
  return data;
}

export async function createNote(
  token: string,
  date: string,
  note: Required<Pick<NoteInput, "tag" | "verses" | "text">>,
): Promise<WritingNote> {
  const { data } = await apiClient.post<WritingNote>(`${MAG}/notes/${date}`, note, {
    headers: authHeaders(token),
  });
  return data;
}

export async function updateNote(token: string, note: WritingNote, patch: NoteInput): Promise<WritingNote> {
  const { data } = await apiClient.patch<WritingNote>(`${MAG}/notes/${note.date}/${note.id}`, patch, {
    headers: authHeaders(token),
  });
  return data;
}

export async function deleteNote(token: string, note: WritingNote): Promise<void> {
  await apiClient.delete(`${MAG}/notes/${note.date}/${note.id}`, { headers: authHeaders(token) });
}

export async function getComments(token: string, articleId: string): Promise<ArticleComment[]> {
  const { data } = await apiClient.get<ArticleComment[]>(`${PUB_ARTICLES}/${articleId}/comments`, {
    headers: authHeaders(token),
  });
  return data;
}

export async function addComment(token: string, articleId: string, text: string): Promise<ArticleComment[]> {
  const { data } = await apiClient.post<ArticleComment[]>(
    `${PUB_ARTICLES}/${articleId}/comments`,
    { text },
    { headers: authHeaders(token) },
  );
  return data;
}

/** Set (or with null, remove) the cover image of several days at once */
export async function batchCoverImages(
  token: string,
  items: { date: string; imageUrl: string | null }[],
): Promise<ArticleSummary[]> {
  const { data } = await apiClient.patch<ArticleSummary[]>(`${PUB_ARTICLES}/cover-images`, { items }, {
    headers: authHeaders(token),
  });
  return data;
}

// ── Staff accounts (同工與權限) ───────────────────────────────────────────

export async function getUsers(token: string): Promise<ManagedUser[]> {
  const { data } = await apiClient.get<ManagedUser[]>(`${MAG}/users`, { headers: authHeaders(token) });
  return data;
}

/** Creates an invited account; share `/invite/<inviteToken>` with the person */
export async function inviteUser(
  token: string,
  payload: { name: string; email: string; admin: boolean; teams: UserChanges["teams"] },
): Promise<InviteResult> {
  const { data } = await apiClient.post<InviteResult>(`${MAG}/users`, payload, { headers: authHeaders(token) });
  return data;
}

export async function updateUser(token: string, id: string, changes: UserChanges): Promise<ManagedUser> {
  const { data } = await apiClient.patch<ManagedUser>(`${MAG}/users/${id}`, changes, { headers: authHeaders(token) });
  return data;
}

/** A fresh invitation link for someone who has not joined yet */
export async function reinviteUser(token: string, id: string): Promise<InviteResult> {
  const { data } = await apiClient.post<InviteResult>(`${MAG}/users/${id}/invite`, null, { headers: authHeaders(token) });
  return data;
}

export async function getInvite(inviteToken: string): Promise<{ name: string; email: string } | null> {
  try {
    const { data } = await apiClient.get<{ name: string; email: string }>(`/auth/invite/${inviteToken}`);
    return data;
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === 404) return null;
    throw e;
  }
}

export async function acceptInvite(inviteToken: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>(`/auth/invite/${inviteToken}`, { password });
  return data;
}

/** The API's message for a failed request, when it sent one */
export function apiError(e: unknown, fallback: string): string {
  const message = isAxiosError(e) ? (e.response?.data as { message?: unknown } | undefined)?.message : undefined;
  return typeof message === "string" ? message : fallback;
}
