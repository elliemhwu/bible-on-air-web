# bible-on-air-web — CLAUDE.md

## 專案概覽

Bible On Air（BOA）的前端網站，提供教會每日靈修內容的閱讀介面。

- **框架**：Next.js App Router（TypeScript）
- **後端 API**：`bible-on-air-api`（NestJS，本機預設 `http://localhost:3001`）
- **環境變數**：`NEXT_PUBLIC_API_BASE_URL`（API base URL）

---

## 專案結構

```text
bible-on-air-web/
├── app/
│   ├── (reader)/                  # 閱讀端（ISR，公開）
│   │   ├── layout.tsx
│   │   ├── page.tsx               # 首頁，導向今日靈修
│   │   ├── [date]/
│   │   │   └── page.tsx           # 每日靈修頁 /2026-04-21
│   ├── globals.css
│   └── layout.tsx                 # Root layout
├── components/
│   └── reader/                    # 閱讀端元件
├── lib/
│   ├── api.ts                     # API fetch 封裝
│   └── types.ts                   # 共用型別定義
└── public/
```

---

## 資料型別（`lib/types.ts`）

```ts
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

export type VerseRange = {
  abbrZh: string;
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
  };
  verses: Verse[];
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
```

---

## API 封裝（`lib/api.ts`）

```ts
const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
const PUB = "bible-on-air";

export async function getArticles(): Promise<ArticleSummary[]> {
  const res = await fetch(`${BASE}/api/v1/magazines/${PUB}/articles`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error("Failed to fetch articles");
  return res.json();
}

export async function getArticle(date: string): Promise<Article> {
  const res = await fetch(`${BASE}/api/v1/magazines/${PUB}/articles/${date}`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`Failed to fetch article: ${date}`);
  return res.json();
}
```

---

## 頁面策略

| 路由      | 渲染策略                     | 說明               |
| --------- | ---------------------------- | ------------------ |
| `/`       | ISR (revalidate: 86400)      | 首頁，導向今日靈修 |
| `/[date]` | ISR + `generateStaticParams` | 每日靈修，每天更新 |

### `[date]` 頁面實作要點

```ts
// app/(reader)/[date]/page.tsx
export async function generateStaticParams() {
  const articles = await getArticles();
  return articles.map((a) => ({ date: a.date }));
}

export const revalidate = 3600;
```

---

## Block 渲染邏輯

每篇文章由有序的 `blocks[]` 組成，依 `order` 排序後逐一渲染。

| Block type  | 元件               | 說明                                                           |
| ----------- | ------------------ | -------------------------------------------------------------- |
| `verse`     | `<VerseBlock>`     | 顯示 `subheading`（若有）+ `verses[].text` 逐節渲染            |
| `questions` | `<QuestionsBlock>` | 顯示 `subheading` + `items` 清單                               |
| `richtext`  | `<RichtextBlock>`  | 顯示 `subheading`（若有）+ `dangerouslySetInnerHTML` 渲染 HTML |

---

## 圖片處理

- `coverImageUrl` 為相對路徑（如 `/uploads/...`），需加上 `NEXT_PUBLIC_API_BASE_URL` 前綴。
- 在 `next.config.ts` 設定 `images.remotePatterns`，允許來自 API server 的圖片。

---

## 目前已知 Publication / Publisher

| 欄位            | 值             |
| --------------- | -------------- |
| Publication UID | `bible-on-air` |
| Publisher UID   | `nghcc`        |

---

## 開發規範

- 使用 TypeScript，避免 `any`。
- Server Component 優先；只有需要互動或瀏覽器 API 的元件才加 `"use client"`。
- CSS：使用 Tailwind CSS（如已安裝）或 CSS Modules，避免 inline style。
- 日期格式統一用 `YYYY-MM-DD`（ISO 8601），顯示時再轉換為中文格式。

---

## 尚未決定 / 待補充

- i18n（目前僅繁體中文）
- 部署環境（Vercel / self-hosted）
