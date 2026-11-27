"use client";

import { DatePicker } from "@/components/layout/DatePicker";
import QuestionsBlockEditor from "@/components/studio/QuestionsBlockEditor";
import RichtextBlockEditor from "@/components/studio/RichtextBlockEditor";
import VerseBlockEditor from "@/components/studio/VerseBlockEditor";
import { createArticle, getArticleTemplates } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  stBtnPrimary,
  stBtnSecondary,
  stInput,
} from "@/lib/styles";
import type { ArticleTemplate, VerseRange } from "@/lib/types";
import { useDatePicker } from "@/lib/useDatePicker";
import { useFormData } from "@/lib/useFormData";
import { toDateStr } from "@/lib/utils";
import { find } from "lodash";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CreateArticleForm({
  initialDate,
}: {
  initialDate?: string;
}) {
  const router = useRouter();
  const { token } = useAuth();
  const {
    open: datePickerOpen,
    setOpen: setDatePickerOpen,
    pickerRef: datePickerRef,
    containerRef: dateContainerRef,
  } = useDatePicker();

  const [templates, setTemplates] = useState<ArticleTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { formData, setFormData, onFormChange, formError, setFormError } =
    useFormData({
      selectedTemplateId: "" as number | "",
      date: initialDate ?? toDateStr(new Date()),
      title: "",
      verseRanges: {} as Record<number, VerseRange[]>,
      questionItems: {} as Record<number, string[]>,
      richtextHtml: {} as Record<number, string>,
    });

  const {
    selectedTemplateId,
    date,
    title,
    verseRanges,
    questionItems,
    richtextHtml,
  } = formData;

  useEffect(() => {
    if (!token) return;
    getArticleTemplates(token)
      .then((temps) => {
        const defaultTemplate = find(temps, { isDefault: true }) || temps[0];
        setTemplates(temps);
        onFormChange("selectedTemplateId", defaultTemplate?.id ?? "");
      })
      .catch(() => setFormError("無法載入文章模板"))
      .finally(() => setIsLoadingTemplates(false));
  }, [token, onFormChange, setFormError]);

  const selectedTemplate = find(templates, { id: selectedTemplateId }) as
    | ArticleTemplate
    | undefined;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !date) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      const blocks = selectedTemplate
        ? selectedTemplate.blockDefinitions.map((b) => ({
            order: b.order,
            type: b.type,
            subheading: b.subheading ?? undefined,
            content:
              b.type === "verse"
                ? { ...b.defaultContent, ranges: verseRanges[b.order] ?? [] }
                : b.type === "questions"
                  ? { ...b.defaultContent, items: questionItems[b.order] ?? [] }
                  : b.type === "richtext"
                    ? { ...b.defaultContent, html: richtextHtml[b.order] ?? "" }
                    : { ...b.defaultContent },
          }))
        : [];

      const created = await createArticle(token, {
        date,
        title,
        articleTemplateId:
          selectedTemplateId !== "" ? selectedTemplateId : undefined,
        blocks,
      });

      router.push(`/studio/articles/${created.id}/edit`);
    } catch {
      setFormError("儲存失敗，請再試一次");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-9 sm:px-8">
      <h1 className="mb-8 font-serif text-[28px] font-semibold text-st-ink">新增文章</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Template */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-st-ink-2">文章模板</label>
          {isLoadingTemplates ? (
            <p className="text-sm text-st-faint">載入中…</p>
          ) : (
            <select
              value={selectedTemplateId}
              onChange={(e) =>
                onFormChange(
                  "selectedTemplateId",
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              className={`${stInput} w-full`}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Date */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-st-ink-2">日期</label>
          <div ref={dateContainerRef} className="relative">
            <button
              type="button"
              onClick={() =>
                datePickerOpen
                  ? datePickerRef.current?.close()
                  : setDatePickerOpen(true)
              }
              className={`${stInput} w-full text-left`}
            >
              <span className={date ? "text-st-ink" : "text-st-faint"}>
                {date || "選擇日期"}
              </span>
            </button>
            {datePickerOpen && (
              <DatePicker
                ref={datePickerRef}
                date={date}
                onSelect={(d) => onFormChange("date", d ?? "")}
                onOpenChange={setDatePickerOpen}
              />
            )}
          </div>
        </div>

        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="text-sm text-st-ink-2">
            標題
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => onFormChange("title", e.target.value)}
            placeholder="留空則無標題"
            className={`${stInput} w-full`}
          />
        </div>

        {formError && <p className="text-sm text-st-danger">{formError}</p>}

        {/* Blocks */}
        {selectedTemplate
          ? selectedTemplate.blockDefinitions
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((block) => (
                <div key={block.order} className="flex flex-col gap-1.5">
                  {block.label && (
                    <div className="text-sm text-st-ink-2">{block.label}</div>
                  )}
                  {block.type === "richtext" ? (
                    <RichtextBlockEditor
                      html={richtextHtml[block.order] ?? ""}
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
                    <div className="rounded-lg border border-st-line bg-st-surface p-4">
                      {block.type === "verse" ? (
                        <VerseBlockEditor
                          ranges={formData.verseRanges[block.order]}
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
                          items={questionItems[block.order] ?? [""]}
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
                        <p className="text-xs text-st-faint">[待實作]</p>
                      )}
                    </div>
                  )}
                </div>
              ))
          : !isLoadingTemplates && (
              <p className="text-sm text-st-faint">選擇模板後顯示區塊預覽</p>
            )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting || !date}
            className={stBtnPrimary}
          >
            {isSubmitting ? "儲存中…" : "儲存"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/studio")}
            className={stBtnSecondary}
          >
            取消
          </button>
        </div>
      </form>
    </main>
  );
}
