"use client";

import QuestionsBlockEditor from "@/components/studio/QuestionsBlockEditor";
import RichtextBlockEditor from "@/components/studio/RichtextBlockEditor";
import VerseBlockEditor from "@/components/studio/VerseBlockEditor";
import { getArticleById, updateArticle, updateBlock } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { btnPrimaryCls, btnSecondaryCls, inputCls } from "@/lib/styles";
import type { Article, VerseRange } from "@/lib/types";
import { useFormData } from "@/lib/useFormData";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  articleId: string;
};

export default function EditArticleForm({ articleId }: Props) {
  const router = useRouter();
  const { token } = useAuth();

  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { formData, setFormData, onFormChange, formError, setFormError } =
    useFormData({
      date: "",
      title: "",
      verseRanges: {} as Record<number, VerseRange[]>,
      questionItems: {} as Record<number, string[]>,
      richtextHtml: {} as Record<number, string>,
    });

  const { date, title, verseRanges, questionItems, richtextHtml } = formData;

  useEffect(() => {
    if (!token) return;
    getArticleById(token, articleId)
      .then((a) => {
        setArticle(a);
        const newVerseRanges: Record<number, VerseRange[]> = {};
        const newQuestionItems: Record<number, string[]> = {};
        const newRichtextHtml: Record<number, string> = {};

        for (const block of a.blocks) {
          if (block.type === "verse")
            newVerseRanges[block.order] = block.content.ranges;
          else if (block.type === "questions")
            newQuestionItems[block.order] = block.content.items;
          else if (block.type === "richtext")
            newRichtextHtml[block.order] = block.content.html;
        }

        setFormData((prev) => ({
          ...prev,
          date: a.date,
          title: a.title ?? "",
          verseRanges: newVerseRanges,
          questionItems: newQuestionItems,
          richtextHtml: newRichtextHtml,
        }));
      })
      .catch(() => setFormError("無法載入文章資料"))
      .finally(() => setIsLoading(false));
  }, [token, articleId, setFormData, setFormError]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !article) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      await Promise.all(
        article.blocks.map((block) => {
          const content =
            block.type === "verse"
              ? { ranges: verseRanges[block.order] ?? block.content.ranges }
              : block.type === "questions"
                ? { items: questionItems[block.order] ?? block.content.items }
                : block.type === "richtext"
                  ? { html: richtextHtml[block.order] ?? block.content.html }
                  : {};
          return updateBlock(token, article.date, block.id, { content });
        }),
      );

      await updateArticle(token, article.date, { date, title });
      router.push("/studio");
    } catch {
      setFormError("儲存失敗，請再試一次");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen md:px-48 px-6 py-12 font-sans">
        <p className="text-sm text-pebble-400">載入文章中…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen md:px-48 px-6 py-12 font-sans">
      <h1 className="text-2xl font-semibold text-pebble-800 mb-8">編輯文章</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Date */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-pebble-600">日期</label>
          <div className="w-full rounded-lg border border-pebble-200 bg-white px-3.5 py-2.5 text-sm text-left text-pebble-900 outline-none focus:border-iris-400 focus:ring-2 focus:ring-iris-400/20 transition cursor-default">
            {date}
          </div>
        </div>

        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="text-sm text-pebble-600">
            標題
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => onFormChange("title", e.target.value)}
            placeholder="留空則無標題"
            className={inputCls}
          />
        </div>

        {formError && <p className="text-sm text-red-500">{formError}</p>}

        {/* Blocks */}
        {(article?.blocks ?? [])
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((block) => (
            <div key={block.id} className="flex flex-col gap-1.5">
              {block.subheading && (
                <div className="text-sm text-pebble-600">
                  {block.subheading}
                </div>
              )}
              {block.type === "richtext" ? (
                <RichtextBlockEditor
                  html={richtextHtml[block.order] ?? block.content.html}
                  onChange={(html) =>
                    setFormData((prev) => ({
                      ...prev,
                      richtextHtml: {
                        ...prev.richtextHtml,
                        [block.order]: html,
                      },
                    }))
                  }
                />
              ) : (
                <div className="rounded-lg border border-pebble-200 bg-white p-4">
                  {block.type === "verse" ? (
                    <VerseBlockEditor
                      initialRanges={block.content.ranges}
                      onChange={(ranges) =>
                        setFormData((prev) => ({
                          ...prev,
                          verseRanges: {
                            ...prev.verseRanges,
                            [block.order]: ranges,
                          },
                        }))
                      }
                    />
                  ) : block.type === "questions" ? (
                    <QuestionsBlockEditor
                      items={questionItems[block.order] ?? block.content.items}
                      onChange={(items) =>
                        setFormData((prev) => ({
                          ...prev,
                          questionItems: {
                            ...prev.questionItems,
                            [block.order]: items,
                          },
                        }))
                      }
                    />
                  ) : (
                    <p className="text-xs text-pebble-400">[待實作]</p>
                  )}
                </div>
              )}
            </div>
          ))}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting || !date}
            className={btnPrimaryCls}
          >
            {isSubmitting ? "儲存中…" : "儲存"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/studio")}
            className={btnSecondaryCls}
          >
            取消
          </button>
        </div>
      </form>
    </main>
  );
}
