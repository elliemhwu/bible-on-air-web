"use client";

import { setArticleCoverImage, uploadImage } from "@/lib/api";
import type { ArticleSummary } from "@/lib/types";
import Image from "next/image";
import { useRef, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

const ZH_WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

function weekdayLabel(date: string): string {
  const d = new Date(date);
  return ZH_WEEKDAYS[d.getDay() === 0 ? 6 : d.getDay() - 1];
}

type Props = {
  date: string;
  article: ArticleSummary | null;
  token: string;
  onUpdated: (article: ArticleSummary) => void;
};

export default function DayImageSlot({ date, article, token, onUpdated }: Props) {
  const [coverUrl, setCoverUrl] = useState<string | null>(article?.coverImageUrl ?? null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !article) return;
    setIsUploading(true);
    setError(null);
    try {
      const url = await uploadImage(token, file);
      await setArticleCoverImage(token, date, url);
      setCoverUrl(url);
      onUpdated({ ...article, coverImageUrl: url });
    } catch {
      setError("上傳失敗，請再試一次");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const noArticle = article === null;

  return (
    <div
      className={`rounded-xl border bg-white overflow-hidden flex flex-col ${noArticle ? "border-pebble-100 opacity-50" : "border-pebble-200"}`}
    >
      {/* Square image area */}
      <div className="relative w-full aspect-square bg-pebble-50 flex items-center justify-center">
        {coverUrl ? (
          <Image
            src={`${API_BASE}${coverUrl}`}
            alt={date}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <span className="text-xs text-pebble-300">
            {noArticle ? "無文章" : "尚無圖片"}
          </span>
        )}
      </div>

      {/* Card footer */}
      <div className="p-3 flex flex-col gap-2">
        <div>
          <p className="text-xs text-pebble-400">週{weekdayLabel(date)}　{date}</p>
          {article?.title && (
            <p className="text-sm text-pebble-700 mt-0.5 truncate">{article.title}</p>
          )}
        </div>

        {!noArticle && (
          <div>
            <label
              className={`inline-block rounded-lg border border-pebble-200 px-3 py-1.5 text-xs text-pebble-600 cursor-pointer hover:border-pebble-300 transition-colors ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
            >
              {isUploading ? "上傳中…" : coverUrl ? "更換圖片" : "上傳圖片"}
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                disabled={isUploading}
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
