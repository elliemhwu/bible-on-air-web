"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

type Props = {
  html: string;
  onChange: (html: string) => void;
  /** "paper": borderless on the writing page, toolbar only while editing */
  appearance?: "default" | "paper";
};

const TOOLBAR_BTN =
  "px-2 py-1 rounded text-sm text-pebble-600 hover:bg-pebble-100 transition-colors disabled:opacity-30";
const TOOLBAR_BTN_ACTIVE = "bg-pebble-100 text-pebble-900 font-semibold";

const PAPER_TOOLBAR_BTN =
  "px-2 py-0.5 rounded text-xs text-st-muted hover:bg-st-soft transition-colors disabled:opacity-30";
const PAPER_TOOLBAR_BTN_ACTIVE = "bg-st-soft text-st-ink font-semibold";

export default function RichtextBlockEditor({ html, onChange, appearance = "default" }: Props) {
  const paper = appearance === "paper";
  const btn = paper ? PAPER_TOOLBAR_BTN : TOOLBAR_BTN;
  const active = paper ? PAPER_TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN_ACTIVE;
  const editor = useEditor({
    extensions: [StarterKit],
    immediatelyRender: false,
    content: html,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: paper
          ? "min-h-[3.5rem] py-1 outline-none text-base leading-[2] text-st-ink prose-tc [&_p]:indent-8 [&_p]:mb-2"
          : "min-h-[120px] px-3.5 py-2.5 outline-none text-sm text-pebble-900 prose-tc [&_p]:indent-8",
      },
    },
  });

  useEffect(() => {
    if (editor && html !== editor.getHTML()) {
      editor.commands.setContent(html);
    }
  }, [html]);

  if (!editor) return null;

  return (
    <div
      className={
        paper
          ? "group relative"
          : "rounded-lg border border-pebble-200 bg-white overflow-hidden focus-within:border-iris-400 focus-within:ring-2 focus-within:ring-iris-400/20 transition"
      }
    >
      {/* Toolbar */}
      <div
        className={
          paper
            ? "hidden flex-wrap gap-0.5 rounded-md border border-st-line bg-st-surface px-1.5 py-1 group-focus-within:flex"
            : "flex flex-wrap gap-0.5 border-b border-pebble-100 px-2 py-1.5"
        }
      >
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`${btn} ${editor.isActive("bold") ? active : ""}`}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`${btn} italic ${editor.isActive("italic") ? active : ""}`}
        >
          I
        </button>
        <div className={paper ? "w-px bg-st-line mx-1" : "w-px bg-pebble-200 mx-1"} />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`${btn} ${editor.isActive("bulletList") ? active : ""}`}
        >
          • 清單
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`${btn} ${editor.isActive("orderedList") ? active : ""}`}
        >
          1. 清單
        </button>
        <div className={paper ? "w-px bg-st-line mx-1" : "w-px bg-pebble-200 mx-1"} />
        <button
          type="button"
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={`${btn} ${editor.isActive("paragraph") ? active : ""}`}
        >
          ¶
        </button>
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className={`${btn} ${editor.isActive("heading", { level: 3 }) ? active : ""}`}
        >
          H3
        </button>
        <div className={paper ? "w-px bg-st-line mx-1" : "w-px bg-pebble-200 mx-1"} />
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className={btn}
        >
          ↩
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className={btn}
        >
          ↪
        </button>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
