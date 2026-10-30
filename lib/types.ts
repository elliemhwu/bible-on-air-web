// ── Bible ─────────────────────────────────────────────────────────────────

/** A Bible book with chapter/verse metadata, sourced from the FHL API. */
export type BibleBook = {
  id: number;
  zh: string;
  en: string;
  abbrZh: string;
  abbrEn: string;
  chapters: number[]; // chapters[i] = verse count of chapter i+1
};

/** A scripture range as stored in article block content (used in API payloads). */
export type VerseRange = {
  abbrZh: string;
  zh: string;
  en: string;
  abbrEn: string;
  chapterStart: number;
  verseStart: number;
  chapterEnd?: number; // omitted for a single-verse reference
  verseEnd?: number;
};

/** A single Bible verse resolved from a range lookup. */
export type Verse = {
  abbrZh: string;
  zh: string;
  en: string;
  abbrEn: string;
  chapter: number;
  verse: number;
  text: string;
  version: string;
};

/** How resolved verses are laid out in a VerseBlock. */
export type VerseDisplayMode = "ordered" | "inline" | "inline-numbered";

/**
 * A scripture range as returned by the verse-lookup API response.
 * Mirrors VerseRange but is the API response shape (not the stored content shape).
 */
export type VerseRangeResponse = {
  abbrZh: string;
  zh: string;
  en: string;
  abbrEn: string;
  chapterStart: number;
  verseStart: number;
  chapterEnd?: number;
  verseEnd?: number;
};

/** Verse lookup API response — resolved ranges with individual verse texts. */
export type VerseResultResponse = {
  ranges: VerseRangeResponse[];
  verses: Verse[];
};

// ── Pagination ────────────────────────────────────────────────────────────

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: PaginationMeta;
};

export type ArticleQuery = {
  page?: number;
  pageSize?: number;
  status?: "draft" | "pending_review" | "approved" | "published";
  dateFrom?: string;
  dateTo?: string;
  book?: string[]; // 書卷中文縮寫陣列，e.g. ["創", "出"]
};

// ── Article & Blocks ──────────────────────────────────────────────────────

/** Article list item — no block content, used in index/dashboard views. */
export type ArticleSummary = {
  id: string;
  publicationUid: string;
  date: string; // "YYYY-MM-DD"
  title: string | null;
  status: "published" | "draft" | "pending_review" | "approved";
  verseRange: string | null;
  articleTemplateId: number | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Discriminated union of all block types in an article. */
export type Block = VerseBlock | QuestionsBlock | RichtextBlock;

/** Block containing one or more scripture ranges with resolved verse texts. */
export type VerseBlock = {
  id: string;
  articleId: string;
  order: number;
  type: "verse";
  subheading: string | null;
  content: {
    ranges: VerseRange[];
    verses: Verse[];
    displayMode?: VerseDisplayMode;
  };
  createdAt: string;
  updatedAt: string;
};

/** Block containing a list of reflection questions. */
export type QuestionsBlock = {
  id: string;
  articleId: string;
  order: number;
  type: "questions";
  subheading: string | null;
  content: {
    items: string[];
  };
  createdAt: string;
  updatedAt: string;
};

/** Block containing free-form HTML content. */
export type RichtextBlock = {
  id: string;
  articleId: string;
  order: number;
  type: "richtext";
  subheading: string | null;
  content: {
    html: string;
  };
  createdAt: string;
  updatedAt: string;
};

/** Full article with all blocks, used on the reader and edit pages. */
export type Article = ArticleSummary & {
  blocks: Block[];
};

/** A single block slot defined by an ArticleTemplate. */
export type BlockDefinition = {
  order: number;
  type: "verse" | "questions" | "richtext";
  subheading: string | null;
  label: string; // display label shown in the editor UI
  required: boolean;
  defaultContent?: Record<string, unknown>; // template-level content defaults merged into block on save
};

/** A named article template that prescribes a fixed set of block slots. */
export type ArticleTemplate = {
  id: number;
  name: string;
  publicationUid: string;
  blockDefinitions: BlockDefinition[];
  isDefault: boolean;
};

/** Payload for the create-article API call. */
export type CreateArticleData = {
  date: string;
  title: string;
  articleTemplateId?: number;
  blocks?: { order: number; type: string; subheading?: string; content?: Record<string, unknown> }[];
};

/** Payload for PATCH /magazines/:pub/articles/:date */
export type UpdateArticleData = {
  date?: string;
  title?: string;
  coverImageUrl?: string;
};

/** Payload for PATCH /magazines/:pub/articles/:date/blocks/:blockId */
export type UpdateBlockData = {
  content: Record<string, unknown>;
};

// ── Auth ──────────────────────────────────────────────────────────────────

/** Authenticated user profile returned from the API. */
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  roles: string[];
  /** Missing in sessions stored before teams existed */
  teams?: TeamRoles;
};

/** Response shape from POST /auth/login. */
export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

/** One block in the PUT /articles/:date/blocks payload (no id = new block). */
export type BlockInput = {
  id?: string;
  order: number;
  type: Block["type"];
  subheading: string | null;
  content: Record<string, unknown>;
};

// ── Legacy Google Site sync ───────────────────────────────────────────────

export type LegacyMonth = {
  label: string; // "2026年10月"
  month: string; // "2026-10"
  url: string;
};

/** What the old site has that our database is missing for a day. */
export type LegacyGap = "article" | "cover" | "title" | `block:${string}`;

export type LegacySyncItem = {
  date: string;
  kind: "daily" | "overview";
  title: string;
  heading: string;
  state: "missing" | "incomplete" | "synced";
  gaps: LegacyGap[];
  warnings: string[];
  articleId: string | null;
};

export type LegacyMonthStatus = {
  month: string;
  url: string;
  items: LegacySyncItem[];
};

export type LegacySyncResult = {
  date: string;
  action: "created" | "updated" | "unchanged" | "failed";
  filled: LegacyGap[];
  error?: string;
};

// ── Publication ───────────────────────────────────────────────────────────

export type Publication = {
  uid: string;
  name: string;
  summary: string | null;
  /** About page as HTML */
  about: string | null;
  updatedAt: string;
};

// ── Planning & assignments (studio) ───────────────────────────────────────

export type Team = "writer" | "reviewer" | "image";

/** One weekday (Mon–Sat) of a week plan; `ref` "" = not planned yet */
export type PlanDay = { ref: string; overview?: boolean };

/** 進度安排 of one week, keyed by its Monday */
export type WeekPlan = {
  weekStart: string;
  sundayTheme: string | null;
  sundayPassage: string | null;
  days: PlanDay[];
  updatedAt: string;
};

export type WeekPlanInput = Pick<WeekPlan, "sundayTheme" | "sundayPassage" | "days">;

export type Member = { id: string; name: string };

export type StaffUser = Member & { roles: string[]; teams: TeamRoles };

/** 同工 or 負責人 (a lead also schedules and manages the team) */
export type TeamLevel = "member" | "lead";

export type TeamRoles = Partial<Record<Team, TeamLevel>>;

export type UserStatus = "active" | "invited" | "disabled";

/** An account as the 同工與權限 page sees it */
export type ManagedUser = {
  id: string;
  email: string;
  name: string;
  roles: string[];
  teams: TeamRoles;
  status: UserStatus;
  /** 牧者 (manager) */
  admin: boolean;
  createdAt: string;
};

/** `inviteToken` is only returned when the email could not be sent, to share by hand */
export type InviteResult = { user: ManagedUser; emailed: boolean; inviteToken: string | null };

export type UserChanges = {
  name?: string;
  admin?: boolean;
  teams?: Partial<Record<Team, TeamLevel | null>>;
  status?: "active" | "disabled";
};

export type Roster = { team: Team; members: Member[] };

/** Who serves `team` on `date` */
export type Assignment = { date: string; team: Team; userId: string; userName: string };

export type AssignmentInput = { date: string; team: Team; userId: string | null };

export type NoteTag = "heading" | "question" | "fragment";

/** A writer's private reading-mode note */
export type WritingNote = {
  id: string;
  date: string;
  tag: NoteTag | null;
  verses: number[];
  text: string;
  order: number;
  usedIn: string | null;
  createdAt: string;
};

export type NoteInput = Partial<Pick<WritingNote, "tag" | "verses" | "text" | "order" | "usedIn">>;

export type ArticleComment = {
  id: string;
  text: string;
  createdAt: string;
  authorId: string;
  authorName: string;
};
