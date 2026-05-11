"use client";

import { toDate, toDateStr } from "@/lib/utils";
import { forwardRef, useImperativeHandle, useState } from "react";
import { DayPicker } from "react-day-picker";
import { zhTW } from "react-day-picker/locale";
import "react-day-picker/style.css";
import "./DatePicker.css";

export interface DatePickerHandle {
  close(): void;
}

export const DatePicker = forwardRef<
  DatePickerHandle,
  {
    date?: string;
    onSelect: (date: string | undefined) => void;
    onOpenChange: (open: boolean) => void;
    isDateDisabled?: (date: Date) => boolean;
  }
>(function DatePicker({ date, onSelect, onOpenChange, isDateDisabled }, ref) {
  const [isClosing, setIsClosing] = useState(false);

  const today = new Date();
  const todayStr = toDateStr(today);

  function close() {
    setIsClosing(true);
  }

  useImperativeHandle(ref, () => ({ close }));

  function handleAnimationEnd(e: React.AnimationEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    if (isClosing) {
      onOpenChange(false);
      setIsClosing(false);
    }
  }

  function handleSelect(d: Date | undefined) {
    onSelect(d ? toDateStr(d) : undefined);
    close();
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 sm:hidden"
        aria-hidden
        onClick={close}
      />
      <div
        role="dialog"
        aria-label="選擇日期"
        className={`date-picker-popover ${isClosing ? "dialog-exit" : "dialog-enter"} fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-x border-pebble-200 shadow-lg p-4 sm:absolute sm:bottom-auto sm:left-auto sm:top-full sm:mt-2 sm:right-0 sm:rounded-xl sm:border sm:p-3`}
        onAnimationEnd={handleAnimationEnd}
      >
        <div className="flex justify-center mb-3 sm:hidden">
          <div className="w-8 h-1 rounded-full bg-pebble-300" />
        </div>
        <div className="flex justify-between items-center mb-1 pb-2 border-b border-pebble-200">
          <span className="text-xs text-pebble-500">選擇日期</span>
          <button
            disabled={isDateDisabled ? isDateDisabled(today) : false}
            onClick={(e) => {
              e.preventDefault();
              onSelect(todayStr);
              close();
            }}
            className="text-xs text-primary hover:opacity-70 font-medium transition-opacity disabled:text-pebble-400 disabled:hover:opacity-100 disabled:cursor-not-allowed"
          >
            今日
          </button>
        </div>
        <div className="flex justify-center sm:block">
          <DayPicker
            locale={zhTW}
            mode="single"
            selected={date ? toDate(date) : undefined}
            onSelect={handleSelect}
            defaultMonth={date ? toDate(date) : undefined}
            disabled={isDateDisabled}
          />
        </div>
      </div>
    </>
  );
});
