export type ArticleSummary = {
  id: string;
  publicationUid: string;
  date: string; // "YYYY-MM-DD"
  title: string | null;
  status: "published" | "draft";
  articleTemplateId: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VerseDisplayMode = "ordered" | "inline" | "inline-numbered";

export type Block = VerseBlock | QuestionsBlock | RichtextBlock;

export type VerseRange = {
  abbrZh: string;
  zh: string;
  en: string;
  abbrEn: string;
  chapterStart: number;
  verseStart: number;
  chapterEnd?: number;
  verseEnd?: number;
};

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

export type Article = ArticleSummary & {
  blocks: Block[];
};

export type BlockDefinition = {
  order: number;
  type: "verse" | "questions" | "richtext";
  subheading: string | null;
  label: string;
  required: boolean;
};

export type ArticleTemplate = {
  id: number;
  name: string;
  publicationUid: string;
  blockDefinitions: BlockDefinition[];
};

export type CreateArticleData = {
  date: string;
  title: string;
  articleTemplateId?: number;
  blocks?: { order: number; type: string; subheading?: string }[];
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  roles: string[];
};

export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};
