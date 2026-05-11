import { apiClient } from "@/lib/axios";
import type {
  Article,
  ArticleSummary,
  ArticleTemplate,
  AuthUser,
  CreateArticleData,
  LoginResponse,
} from "@/lib/types";

const PUB = "bible-on-air";

export async function getArticles(): Promise<ArticleSummary[]> {
  const { data } = await apiClient.get<ArticleSummary[]>(
    `/magazines/${PUB}/articles`,
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

export async function getArticleTemplates(token: string): Promise<ArticleTemplate[]> {
  const { data } = await apiClient.get<ArticleTemplate[]>(
    "/article-templates?publicationUid=bible-on-air",
    { headers: { Authorization: `Bearer ${token}` } },
  );
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
