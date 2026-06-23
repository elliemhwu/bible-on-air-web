import { apiClient } from "@/lib/axios";
import type {
  Article,
  ArticleQuery,
  ArticleSummary,
  ArticleTemplate,
  AuthUser,
  BibleBook,
  CreateArticleData,
  LoginResponse,
  PaginatedResponse,
  UpdateArticleData,
  UpdateBlockData,
  VerseResultResponse,
} from "@/lib/types";

const PUB = "bible-on-air";

export async function getArticles(
  query?: ArticleQuery,
): Promise<PaginatedResponse<ArticleSummary>> {
  const { data } = await apiClient.get<PaginatedResponse<ArticleSummary>>(
    `/magazines/${PUB}/articles`,
    { params: query },
  );
  return data;
}

export async function getArticle(date: string): Promise<Article> {
  const { data } = await apiClient.get<Article>(
    `/magazines/${PUB}/articles/${date}`,
  );
  return data;
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
