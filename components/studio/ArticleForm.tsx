"use client";

import {
  DatePicker,
  type DatePickerHandle,
} from "@/components/layout/DatePicker";
import { createArticle, getArticleTemplates } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { ArticleTemplate, BlockDefinition } from "@/lib/types";
import { toDateStr } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// ─── helpers ──────────────────────────────────────────────────────────────────

const BLOCK_TYPE_LABEL: Record<BlockDefinition["type"], string> = {
  verse: "經文",
  questions: "問題",
  richtext: "內容",
};

const BLOCK_TYPE_COLOR: Record<BlockDefinition["type"], string> = {
  verse: "bg-blue-50 text-blue-700 border-blue-200",
  questions: "bg-amber-50 text-amber-700 border-amber-200",
  richtext: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function useDatePicker() {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<DatePickerHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        pickerRef.current?.close();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return { open, setOpen, pickerRef, containerRef };
}

// ─── component ────────────────────────────────────────────────────────────────

export default function ArticleForm({ mode }: { mode: "new" | "edit" }) {
  const router = useRouter();
  const { token } = useAuth();
  const {
    open: datePickerOpen,
    setOpen: setDatePickerOpen,
    pickerRef: datePickerRef,
    containerRef: dateContainerRef,
  } = useDatePicker();

  const [templates, setTemplates] = useState<ArticleTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | "">("");
  const [date, setDate] = useState(() => toDateStr(new Date()));
  const [title, setTitle] = useState("");
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getArticleTemplates(token)
      .then((ts) => {
        setTemplates(ts);
        if (mode === "new") setSelectedTemplateId(ts[0]?.id ?? "");
      })
      .catch(() => setError("無法載入文章模板"))
      .finally(() => setIsLoadingTemplates(false));
  }, [token]);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !date) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await createArticle(token, {
        date,
        title,
        articleTemplateId:
          selectedTemplateId !== "" ? selectedTemplateId : undefined,
        blocks: [],
      });
      router.push("/studio");
    } catch {
      setError("儲存失敗，請再試一次");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (mode === "edit") {
    return (
      <main className="min-h-screen px-6 py-12 max-w-5xl mx-auto font-sans">
        <p className="text-sm text-pebble-400">編輯功能待實作</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen md:px-48 px-6 py-12 font-sans">
      <h1 className="text-2xl font-semibold text-pebble-800 mb-8">新增文章</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* ── left: metadata ── */}
        <div className="flex flex-col gap-6">
          {/* Template */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-pebble-600">文章模板</label>
            {isLoadingTemplates ? (
              <p className="text-sm text-pebble-400">載入中…</p>
            ) : (
              <select
                value={selectedTemplateId}
                onChange={(e) =>
                  setSelectedTemplateId(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                className="w-full rounded-lg border border-pebble-200 bg-white px-3.5 py-2.5 text-sm text-pebble-900 outline-none focus:border-iris-400 focus:ring-2 focus:ring-iris-400/20 transition"
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
            <label className="text-sm text-pebble-600">日期</label>
            <div ref={dateContainerRef} className="relative">
              <button
                type="button"
                onClick={() =>
                  datePickerOpen
                    ? datePickerRef.current?.close()
                    : setDatePickerOpen(true)
                }
                className="w-full rounded-lg border border-pebble-200 bg-white px-3.5 py-2.5 text-sm text-left outline-none focus:border-iris-400 focus:ring-2 focus:ring-iris-400/20 transition"
              >
                <span className={date ? "text-pebble-900" : "text-pebble-300"}>
                  {date || "選擇日期"}
                </span>
              </button>
              {datePickerOpen && (
                <DatePicker
                  ref={datePickerRef}
                  date={date}
                  onSelect={(d) => setDate(d ?? "")}
                  onOpenChange={setDatePickerOpen}
                />
              )}
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
              onChange={(e) => setTitle(e.target.value)}
              placeholder="留空則無標題"
              className="w-full rounded-lg border border-pebble-200 bg-white px-3.5 py-2.5 text-sm text-pebble-900 placeholder:text-pebble-300 outline-none focus:border-iris-400 focus:ring-2 focus:ring-iris-400/20 transition"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* ── right: block preview ── */}
          {selectedTemplate ? (
            <>
              {selectedTemplate.blockDefinitions
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((block) => (
                  <div
                    key={block.order}
                    className="rounded-lg border border-pebble-200 bg-white p-4 flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border ${BLOCK_TYPE_COLOR[block.type]}`}
                      >
                        {BLOCK_TYPE_LABEL[block.type]}
                      </span>
                      <span className="text-sm font-medium text-pebble-700">
                        {block.label}
                      </span>
                      {!block.required && (
                        <span className="text-xs text-pebble-400">
                          （選填）
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-pebble-400">
                      [{BLOCK_TYPE_LABEL[block.type]} 編輯區 — 待實作]
                    </p>
                  </div>
                ))}
            </>
          ) : (
            !isLoadingTemplates && (
              <p className="text-sm text-pebble-400">選擇模板後顯示區塊預覽</p>
            )
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting || !date}
              className="rounded-lg bg-iris-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-iris-600 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "儲存中…" : "儲存"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/studio")}
              className="rounded-lg border border-pebble-200 px-5 py-2.5 text-sm text-pebble-600 hover:border-pebble-300 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}
