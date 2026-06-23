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

// ── Article & Blocks ──────────────────────────────────────────────────────

/** Article list item — no block content, used in index/dashboard views. */
export type ArticleSummary = {
  id: string;
  publicationUid: string;
  date: string; // "YYYY-MM-DD"
  title: string | null;
  status: "published" | "draft" | "pending_review" | "approved";
  verseRange: string | null;
  articleTemplateId: string | null;
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
  blocks?: { order: number; type: string; subheading?: string }[];
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
};

/** Response shape from POST /auth/login. */
export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};
