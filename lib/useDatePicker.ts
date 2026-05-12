"use client";

import { type DatePickerHandle } from "@/components/layout/DatePicker";
import { useEffect, useRef, useState } from "react";

export function useDatePicker() {
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
