# bible-on-air-web — CLAUDE.md

## 專案概覽

Bible On Air（BOA）的前端網站，提供教會每日靈修內容的閱讀介面與編輯後台。

- **框架**：Next.js App Router（TypeScript）
- **樣式**：Tailwind CSS
- **後端 API**：`bible-on-air-api`（NestJS，本機預設 `http://localhost:3001`）
- **環境變數**：`NEXT_PUBLIC_API_BASE_URL`（API base URL）

---

## 專案結構

```text
bible-on-air-web/
├── app/
│   ├── (reader)/                        # 閱讀端（ISR，公開）
│   │   ├── layout.tsx
│   │   ├── page.tsx                     # / → 導向今日靈修
│   │   ├── [date]/
│   │   │   └── page.tsx                 # /2026-04-21
│   │   └── history/
│   │       └── page.tsx                 # /history（monthly list）
│   ├── (studio)/                        # 編輯後台（CSR，需登入）
│   │   ├── layout.tsx                   # 驗證 middleware，未登入導向 /login
│   │   └── studio/
│   │       ├── page.tsx                 # /studio（依角色顯示 dashboard）
│   │       ├── articles/
│   │       │   ├── new/
│   │       │   │   └── page.tsx         # /studio/articles/new
│   │       │   └── [id]/
│   │       │       ├── edit/
│   │       │       │   └── page.tsx     # /studio/articles/[id]/edit
│   │       │       └── review/
│   │       │           └── page.tsx     # /studio/articles/[id]/review
│   │       ├── images/
│   │       │   └── page.tsx             # /studio/images
│   │       └── publish/
│   │           └── page.tsx             # /studio/publish
│   ├── login/
│   │   └── page.tsx                     # /login
│   ├── globals.css
│   └── layout.tsx                       # Root layout
├── components/
│   ├── reader/                          # 閱讀端元件
│   └── studio/                          # 編輯後台元件
├── lib/
│   ├── api.ts                           # API fetch 封裝
│   └── types.ts                         # 共用型別定義
└── public/
```

---

## 路由對照表

### Reader side（public，ISR）

| 路由       | 說明                           |
| ---------- | ------------------------------ |
| `/`        | 導向今日靈修                   |
| `/[date]`  | 每日靈修頁，e.g. `/2026-04-21` |
| `/history` | 歷史內容 monthly list          |

### Studio side（需登入，CSR）

| 路由                           | 角色         | 說明                     |
| ------------------------------ | ------------ | ------------------------ |
| `/studio`                      | 全部         | 依角色顯示對應 dashboard |
| `/studio/articles/new`         | editor       | 新增文章                 |
| `/studio/articles/[id]/edit`   | editor       | 編輯文章                 |
| `/studio/articles/[id]/review` | reviewer     | Review mode              |
| `/studio/images`               | image_editor | 圖片上傳                 |
| `/studio/publish`              | manager      | 發布頁                   |

### Auth

| 路由     | 說明   |
| -------- | ------ |
| `/login` | 登入頁 |

---

## 頁面策略

| 區塊        | 渲染策略                | 說明                       |
| ----------- | ----------------------- | -------------------------- |
| Reader side | ISR (revalidate: 86400) | SEO 友善，內容一天更新一次 |
| Studio side | CSR                     | 需登入，不需要 SEO         |
| `/login`    | CSR                     | 表單互動                   |

---

## 資料型別（`lib/types.ts`）

```ts
export type ArticleSummary = {
  id: string;
  publicationUid: string;
  date: string; // "YYYY-MM-DD"
  title: string | null;
  status: "published" | "draft" | "reviewed";
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
  content: { ranges: VerseRange[] };
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
  content: { items: string[] };
  createdAt: string;
  updatedAt: string;
};

export type RichtextBlock = {
  id: string;
  articleId: string;
  order: number;
  type: "richtext";
  subheading: string | null;
  content: { html: string };
  createdAt: string;
  updatedAt: string;
};

export type Article = ArticleSummary & {
  blocks: Block[];
};

export type UserRole =
  | "super_admin"
  | "manager"
  | "editor"
  | "reviewer"
  | "image_editor";

export type User = {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
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

## Stage 1 開發進度

### 已完成

- [x] 每日靈修頁（`/[date]`）
- [x] Mini day picker / 歷史頁基本導航

### 待辦（依序）

1. **登入頁**（`/login`）+ token 儲存 + studio route protection
2. **文章編輯**（`/studio/articles/new`、`/studio/articles/[id]/edit`）
3. **圖片上傳**（`/studio/images`）
4. **Editor & Image Editor Dashboard**（`/studio`）
5. **History View**（`/history` monthly list）
6. **Review mode**（`/studio/articles/[id]/review`）+ Reviewer Dashboard
7. **Manager 發布頁**（`/studio/publish`）+ Manager Dashboard
8. **PDF 匯出**（下載入口）
9. **Migration 驗證**（確認爬蟲搬來的資料顯示正確）

---

## 開發規範

- 使用 TypeScript，避免 `any`。
- Server Component 優先；只有需要互動或瀏覽器 API 的元件才加 `"use client"`。
- 樣式使用 Tailwind CSS，避免 inline style。
- 日期格式統一用 `YYYY-MM-DD`（ISO 8601），顯示時再轉換為中文格式。
- Reader side 元件放 `components/reader/`，Studio side 元件放 `components/studio/`。

---

## 已知 Publication / Publisher

| 欄位            | 值             |
| --------------- | -------------- |
| Publication UID | `bible-on-air` |
| Publisher UID   | `nghcc`        |
