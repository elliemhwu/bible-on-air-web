export type ArticleSummary = {
  id: string;
  publicationUid: string;
  date: string; // "YYYY-MM-DD"
  title: string | null;
  status: "published" | "draft";
  templateId: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Block = VerseBlock | QuestionsBlock | RichtextBlock;

export type VerseBlock = {
  id: string;
  articleId: string;
  order: number;
  type: "verse";
  subheading: string | null;
  content: {
    range: {
      book: string;
      chapterStart: number;
      verseStart: number;
      chapterEnd?: number;
      verseEnd?: number;
    };
    cachedText: string;
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
