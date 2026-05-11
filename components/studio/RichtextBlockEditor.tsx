"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

type Props = {
  html: string;
  onChange: (html: string) => void;
};

const TOOLBAR_BTN =
  "px-2 py-1 rounded text-sm text-pebble-600 hover:bg-pebble-100 transition-colors disabled:opacity-30";
const TOOLBAR_BTN_ACTIVE = "bg-pebble-100 text-pebble-900 font-semibold";

export default function RichtextBlockEditor({ html, onChange }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    immediatelyRender: false,
    content: html,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[120px] px-3.5 py-2.5 outline-none text-sm text-pebble-900 [&_strong]:font-semibold [&_em]:italic [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_h3]:font-semibold [&_h3]:text-base",
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="rounded-lg border border-pebble-200 bg-white overflow-hidden focus-within:border-iris-400 focus-within:ring-2 focus-within:ring-iris-400/20 transition">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-0.5 border-b border-pebble-100 px-2 py-1.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`${TOOLBAR_BTN} ${editor.isActive("bold") ? TOOLBAR_BTN_ACTIVE : ""}`}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`${TOOLBAR_BTN} italic ${editor.isActive("italic") ? TOOLBAR_BTN_ACTIVE : ""}`}
        >
          I
        </button>
        <div className="w-px bg-pebble-200 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`${TOOLBAR_BTN} ${editor.isActive("bulletList") ? TOOLBAR_BTN_ACTIVE : ""}`}
        >
          • 清單
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`${TOOLBAR_BTN} ${editor.isActive("orderedList") ? TOOLBAR_BTN_ACTIVE : ""}`}
        >
          1. 清單
        </button>
        <div className="w-px bg-pebble-200 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={`${TOOLBAR_BTN} ${editor.isActive("paragraph") ? TOOLBAR_BTN_ACTIVE : ""}`}
        >
          ¶
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`${TOOLBAR_BTN} ${editor.isActive("heading", { level: 3 }) ? TOOLBAR_BTN_ACTIVE : ""}`}
        >
          H3
        </button>
        <div className="w-px bg-pebble-200 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className={TOOLBAR_BTN}
        >
          ↩
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className={TOOLBAR_BTN}
        >
          ↪
        </button>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
