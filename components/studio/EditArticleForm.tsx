"use client";

import ArticleStatusActions from "@/components/studio/ArticleStatusActions";
import LegacySyncPanel from "@/components/studio/LegacySyncPanel";
import OutlineBlockEditor from "@/components/studio/OutlineBlockEditor";
import QuestionsBlockEditor from "@/components/studio/QuestionsBlockEditor";
import RichtextBlockEditor from "@/components/studio/RichtextBlockEditor";
import VerseBlockEditor from "@/components/studio/VerseBlockEditor";
import {
  getArticleById,
  getArticleTemplates,
  replaceBlocks,
  updateArticle,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { btnPrimaryCls, btnSecondaryCls, inputCls } from "@/lib/styles";
import type {
  Article,
  ArticleSummary,
  ArticleTemplate,
  Block,
  BlockDefinition,
  BlockInput,
  OutlineContent,
  VerseDisplayMode,
  VerseRange,
} from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Props = {
  articleId: string;
};

/** A block being edited; `key` is stable for React even for new blocks. */
type EditableBlock = {
  key: string;
  id?: string;
  type: Block["type"];
  subheading: string;
  label?: string;
  ranges: VerseRange[];
  displayMode?: VerseDisplayMode;
  items: string[];
  html: string;
  outline: OutlineContent;
};

const EMPTY_OUTLINE: OutlineContent = { book: "", sections: [] };

const BLOCK_TYPE_LABEL: Record<Block["type"], string> = {
  verse: "經文",
  questions: "問題清單",
  richtext: "文章段落",
  outline: "書卷大綱",
};

const DISPLAY_MODES: { value: VerseDisplayMode; label: string }[] = [
  { value: "ordered", label: "逐節列出" },
  { value: "inline", label: "段落（無節數）" },
  { value: "inline-numbered", label: "段落（含節數）" },
];

const smallBtn =
  "rounded px-2 py-0.5 text-xs text-pebble-500 hover:bg-pebble-100 hover:text-pebble-800 disabled:opacity-30 transition-colors";

let keySeq = 0;
const newKey = () => `new-${++keySeq}`;

function toEditable(block: Block, label?: string): EditableBlock {
  return {
    key: block.id,
    id: block.id,
    type: block.type,
    subheading: block.subheading ?? "",
    label,
    ranges: block.type === "verse" ? block.content.ranges : [],
    displayMode: block.type === "verse" ? block.content.displayMode : undefined,
    items: block.type === "questions" ? block.content.items : [],
    html: block.type === "richtext" ? block.content.html : "",
    outline: block.type === "outline" ? block.content : EMPTY_OUTLINE,
  };
}

function fromDefinition(def: BlockDefinition): EditableBlock {
  const defaults = (def.defaultContent ?? {}) as { displayMode?: VerseDisplayMode };
  return {
    key: newKey(),
    type: def.type,
    subheading: def.subheading ?? "",
    label: def.label,
    ranges: [],
    displayMode: defaults.displayMode,
    items: [],
    html: "",
    outline: EMPTY_OUTLINE,
  };
}

function toInput(block: EditableBlock, index: number): BlockInput {
  const content =
    block.type === "verse"
      ? { ranges: block.ranges, ...(block.displayMode && { displayMode: block.displayMode }) }
      : block.type === "questions"
        ? { items: block.items.filter((q) => q.trim()) }
        : block.type === "outline"
          ? block.outline
          : { html: block.html };
  return {
    ...(block.id && { id: block.id }),
    order: index + 1,
    type: block.type,
    subheading: block.subheading.trim() || null,
    content,
  };
}

export default function EditArticleForm({ articleId }: Props) {
  const router = useRouter();
  const { token } = useAuth();

  const [article, setArticle] = useState<Article | null>(null);
  const [definitions, setDefinitions] = useState<BlockDefinition[]>([]);
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<EditableBlock[]>([]);
  const [dirty, setDirty] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const fetchArticle = useCallback(
    (token: string) =>
      Promise.all([getArticleById(token, articleId), getArticleTemplates(token).catch(() => [])]),
    [articleId],
  );

  const apply = useCallback(([a, templates]: [Article, ArticleTemplate[]]) => {
    const defs = templates.find((t) => t.id === a.articleTemplateId)?.blockDefinitions ?? [];
    const labelFor = (b: Block) =>
      defs.find((d) => d.type === b.type && (d.subheading ?? "") === (b.subheading ?? ""))?.label;

    setArticle(a);
    setDefinitions(defs);
    setTitle(a.title ?? "");
    setBlocks(
      [...a.blocks].sort((x, y) => x.order - y.order).map((b) => toEditable(b, labelFor(b))),
    );
    setDirty(false);
    setReloadCount((n) => n + 1);
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      apply(await fetchArticle(token));
    } catch {
      setFormError("無法載入文章資料");
    }
  }, [token, fetchArticle, apply]);

  useEffect(() => {
    if (!token) return;
    let live = true;
    fetchArticle(token)
      .then((result) => live && apply(result))
      .catch(() => live && setFormError("無法載入文章資料"))
      .finally(() => live && setIsLoading(false));
    return () => {
      live = false;
    };
  }, [token, fetchArticle, apply]);

  function updateBlock(key: string, patch: Partial<EditableBlock>) {
    setBlocks((prev) => prev.map((b) => (b.key === key ? { ...b, ...patch } : b)));
    setDirty(true);
  }

  function moveBlock(index: number, dir: -1 | 1) {
    setBlocks((prev) => {
      const next = [...prev];
      [next[index], next[index + dir]] = [next[index + dir], next[index]];
      return next;
    });
    setDirty(true);
  }

  function removeBlock(block: EditableBlock) {
    const name = block.subheading || block.label || BLOCK_TYPE_LABEL[block.type];
    if (!confirm(`確定要刪除「${name}」區塊嗎？儲存後才會生效。`)) return;
    setBlocks((prev) => prev.filter((b) => b.key !== block.key));
    setDirty(true);
  }

  function addBlock(value: string) {
    const [kind, ref] = value.split(":");
    let block: EditableBlock;
    if (kind === "def") {
      const def = definitions[Number(ref)];
      block = fromDefinition(def);
    } else {
      const type = ref as Block["type"];
      block = {
        key: newKey(),
        type,
        subheading: "",
        ranges: [],
        displayMode: type === "verse" ? "ordered" : undefined,
        items: [],
        html: "",
        outline: EMPTY_OUTLINE,
      };
    }
    // Template blocks go back to their template position; others go last
    setBlocks((prev) => {
      if (kind !== "def") return [...prev, block];
      const order = definitions[Number(ref)].order;
      const at = prev.findIndex((b) => {
        const d = definitions.find(
          (x) => x.type === b.type && (x.subheading ?? "") === b.subheading,
        );
        return d !== undefined && d.order > order;
      });
      return at === -1 ? [...prev, block] : [...prev.slice(0, at), block, ...prev.slice(at)];
    });
    setDirty(true);
  }

  // Template blocks that are not in the article (e.g. a removed 本書大綱)
  const missingDefinitions = definitions
    .map((def, i) => ({ def, i }))
    .filter(
      ({ def }) =>
        !blocks.some((b) => b.type === def.type && b.subheading === (def.subheading ?? "")),
    );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !article) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      await replaceBlocks(token, article.date, blocks.map(toInput));
      await updateArticle(token, article.date, { title });
      await load();
      setSavedAt(new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }));
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

  if (!article) {
    return (
      <main className="min-h-screen md:px-48 px-6 py-12 font-sans">
        <p className="text-sm text-red-500">{formError ?? "找不到這篇文章"}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen md:px-48 px-6 py-12 font-sans">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-pebble-800">編輯文章</h1>
        <div className="flex gap-4 text-sm">
          <Link href={`/studio/articles/${article.id}/review`} className="text-iris-600 hover:text-iris-700">
            預覽 / 校閱
          </Link>
          <Link href="/studio/articles" className="text-pebble-500 hover:text-pebble-800">
            回文章管理
          </Link>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3">
        <ArticleStatusActions
          article={article}
          onChanged={(status: ArticleSummary["status"]) => setArticle({ ...article, status })}
        />
        {token && (
          <LegacySyncPanel token={token} date={article.date} disabled={dirty} onSynced={load} />
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Date */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-pebble-600">日期</label>
          <div className="w-full rounded-lg border border-pebble-200 bg-pebble-50 px-3.5 py-2.5 text-sm text-left text-pebble-900">
            {article.date}
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
            onChange={(e) => {
              setTitle(e.target.value);
              setDirty(true);
            }}
            placeholder="留空則無標題"
            className={inputCls}
          />
        </div>

        {/* Blocks */}
        {blocks.map((block, index) => (
          <section
            key={`${block.key}-${reloadCount}`}
            className="flex flex-col gap-2 rounded-xl border border-pebble-200 bg-pebble-50/50 p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-pebble-200/70 px-1.5 py-0.5 text-xs text-pebble-600">
                {block.label ?? BLOCK_TYPE_LABEL[block.type]}
              </span>
              <input
                type="text"
                value={block.subheading}
                onChange={(e) => updateBlock(block.key, { subheading: e.target.value })}
                placeholder="小標題（可留空）"
                aria-label="小標題"
                className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-pebble-800 hover:border-pebble-200 focus:border-iris-400 focus:bg-white outline-none"
              />
              <div className="flex items-center">
                <button type="button" onClick={() => moveBlock(index, -1)} disabled={index === 0} className={smallBtn} aria-label="上移">
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveBlock(index, 1)}
                  disabled={index === blocks.length - 1}
                  className={smallBtn}
                  aria-label="下移"
                >
                  ↓
                </button>
                <button type="button" onClick={() => removeBlock(block)} className={`${smallBtn} hover:!text-red-600`}>
                  刪除
                </button>
              </div>
            </div>

            {block.type === "richtext" ? (
              <RichtextBlockEditor html={block.html} onChange={(html) => updateBlock(block.key, { html })} />
            ) : (
              <div className="rounded-lg border border-pebble-200 bg-white p-4">
                {block.type === "verse" ? (
                  <div className="flex flex-col gap-3">
                    <VerseBlockEditor
                      ranges={block.ranges}
                      onChange={(ranges) => updateBlock(block.key, { ranges })}
                    />
                    <label className="flex items-center gap-2 text-xs text-pebble-500">
                      顯示方式
                      <select
                        value={block.displayMode ?? "ordered"}
                        onChange={(e) =>
                          updateBlock(block.key, { displayMode: e.target.value as VerseDisplayMode })
                        }
                        className="rounded-md border border-pebble-200 bg-white px-2 py-1 text-xs text-pebble-800"
                      >
                        {DISPLAY_MODES.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : block.type === "outline" ? (
                  <OutlineBlockEditor content={block.outline} onChange={(outline) => updateBlock(block.key, { outline })} />
                ) : (
                  <QuestionsBlockEditor items={block.items} onChange={(items) => updateBlock(block.key, { items })} />
                )}
              </div>
            )}
          </section>
        ))}

        <div className="flex items-center gap-2">
          <select
            value=""
            onChange={(e) => e.target.value && addBlock(e.target.value)}
            className="rounded-lg border border-dashed border-pebble-300 bg-white px-3 py-2 text-sm text-pebble-600"
            aria-label="新增區塊"
          >
            <option value="">＋ 新增區塊…</option>
            {missingDefinitions.length > 0 && (
              <optgroup label="模板區塊">
                {missingDefinitions.map(({ def, i }) => (
                  <option key={i} value={`def:${i}`}>
                    {def.label}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="空白區塊">
              {(Object.keys(BLOCK_TYPE_LABEL) as Block["type"][]).map((t) => (
                <option key={t} value={`type:${t}`}>
                  {BLOCK_TYPE_LABEL[t]}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {formError && <p className="text-sm text-red-500">{formError}</p>}

        <div className="sticky bottom-0 -mx-2 flex items-center gap-3 border-t border-pebble-200 bg-pebble-50/95 px-2 py-3 backdrop-blur">
          <button type="submit" disabled={isSubmitting || !dirty} className={btnPrimaryCls}>
            {isSubmitting ? "儲存中…" : "儲存"}
          </button>
          <button type="button" onClick={() => router.push("/studio/articles")} className={btnSecondaryCls}>
            離開
          </button>
          <span className="text-xs text-pebble-400">
            {dirty ? "有尚未儲存的修改" : savedAt ? `已於 ${savedAt} 儲存` : ""}
          </span>
        </div>
      </form>
    </main>
  );
}
